const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// ─── FUNCIÓN CALLABLE: CREAR PREFERENCIA MP ───
// Reemplaza la llamada directa desde index.html a MP API
// Recibe carrito + datos del cliente (SIN precio ni total — se recalculan aquí)
// Devuelve { preferenceId, initPoint, pedidoId }

exports.crearPreferenciaMP = functions.https.onCall(async (data, context) => {
  const { cart, cliente_nombre, cliente_email, cliente_telefono, cliente_direccion, nota, entrega, seccion } = data;

  // Validaciones básicas
  if (!Array.isArray(cart) || cart.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Carrito vacío');
  }
  if (!cliente_nombre || !cliente_email) {
    throw new functions.https.HttpsError('invalid-argument', 'Faltan datos del cliente');
  }

  try {
    // Paso 1: Leer precios reales de Firestore (source of truth)
    let total = 0;
    const items = [];
    const displayItems = [];

    for (const cartItem of cart) {
      const prodSnap = await db.collection('productos').doc(cartItem.productId).get();
      if (!prodSnap.exists) {
        throw new functions.https.HttpsError('not-found', `Producto ${cartItem.productId} no existe`);
      }

      const prod = prodSnap.data();
      const price = (prod.precio_oferta && prod.precio_oferta < prod.precio)
        ? prod.precio_oferta
        : prod.precio;

      // Validar que el precio es razonable (anti-tampering)
      if (typeof price !== 'number' || price <= 0) {
        throw new functions.https.HttpsError('invalid-argument', `Precio inválido para ${prod.nombre}`);
      }

      const subtotal = price * cartItem.qty;
      total += subtotal;

      // Item estructurado (para auditoría)
      items.push({
        productId: cartItem.productId,
        nombre: prod.nombre,
        qty: cartItem.qty,
        unitPrice: price,
        subtotal: subtotal
      });

      // Item de display (compatible con schema actual de pedidos)
      displayItems.push(`• ${prod.nombre} x${cartItem.qty} = $${subtotal.toLocaleString('es-AR')}`);
    }

    // Validar total (sanity check)
    if (total <= 0 || total >= 100000000) {
      throw new functions.https.HttpsError('invalid-argument', 'Total inválido');
    }

    // Paso 2: Crear pedido pendiente en Firestore (estado: 'pendiente_pago')
    // Esto da trazabilidad de carritos abandonados, igual que sendWA()
    const pedidoData = {
      usuario_id: context.auth?.uid || null,
      es_invitado: !context.auth,
      cliente_nombre,
      cliente_email,
      cliente_telefono,
      cliente_direccion,
      items: displayItems,
      total,
      metodo_pago: 'mp',
      estado: 'pendiente_pago', // Espera confirmación del webhook de MP
      nota: nota || null,
      entrega,
      seccion,
      creado: admin.firestore.FieldValue.serverTimestamp(),
      // Campos que actualiza el webhook:
      // mp_preference_id
      // mp_payment_id
      // mp_collection_status
    };

    const pedidoRef = await db.collection('pedidos').add(pedidoData);
    const pedidoId = pedidoRef.id;

    // Paso 3: Llamar API de MP para crear preferencia
    // Token: por ahora TEST hardcodeado, luego será un secret
    const MP_TOKEN = process.env.MP_ACCESS_TOKEN_LIVE || 'TEST-4562179434000493-052414-de318dac1e62575d0d4a421a3925b868-51517100';

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MP_TOKEN}`
      },
      body: JSON.stringify({
        items: [
          {
            title: 'Compra en Facheritos',
            quantity: 1,
            currency_id: 'ARS',
            unit_price: total
          }
        ],
        payer: { email: cliente_email },
        back_urls: {
          success: 'https://facheritos.operlog.com.ar/?mp_return=success',
          failure: 'https://facheritos.operlog.com.ar/?mp_return=failure',
          pending: 'https://facheritos.operlog.com.ar/?mp_return=pending'
        },
        statement_descriptor: 'FACHERITOS',
        external_reference: pedidoId, // Permite correlacionar webhook con pedido
        notification_url: `https://${process.env.FIREBASE_CONFIG?.projectId || 'us-central1'}-facheritos-217ab.cloudfunctions.net/webhookMP`
      })
    });

    if (!mpResponse.ok) {
      throw new Error(`MP API error: ${mpResponse.statusText}`);
    }

    const mpPref = await mpResponse.json();
    if (!mpPref.id) {
      throw new Error('No preference ID from MP');
    }

    // Actualizar pedido con preferencia ID
    await pedidoRef.update({
      mp_preference_id: mpPref.id
    });

    // Paso 4: Devolver al cliente
    return {
      preferenceId: mpPref.id,
      initPoint: mpPref.sandbox_init_point || mpPref.init_point,
      pedidoId: pedidoId
    };

  } catch (error) {
    console.error('crearPreferenciaMP error:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Error creando preferencia MP');
  }
});

// ─── FUNCIÓN HTTPS: WEBHOOK DE MP ───
// MP llama aquí cuando hay cambios en un pago
// Valida el pago contra la API de MP (no confía en el webhook body)
// Actualiza el pedido en Firestore

exports.webhookMP = functions.https.onRequest(async (req, res) => {
  // MP envía POST con el payment_id en el body
  const { action, data } = req.body;

  if (action !== 'payment.created' && action !== 'payment.updated') {
    console.log('Ignoring webhook action:', action);
    return res.status(200).send('ok');
  }

  const paymentId = data?.id;
  if (!paymentId) {
    return res.status(400).send('Missing payment_id');
  }

  try {
    // Paso 1: Validar pago contra MP API (source of truth, no confiar en el webhook body)
    const MP_TOKEN = process.env.MP_ACCESS_TOKEN_LIVE || 'TEST-4562179434000493-052414-de318dac1e62575d0d4a421a3925b868-51517100';

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MP_TOKEN}`
      }
    });

    if (!mpResponse.ok) {
      throw new Error(`MP API error: ${mpResponse.statusText}`);
    }

    const mpPayment = await mpResponse.json();
    const status = mpPayment.status; // 'approved', 'rejected', 'cancelled', 'pending', etc.
    const externalRef = mpPayment.external_reference; // El pedidoId que guardamos

    if (!externalRef) {
      console.warn('Payment without external_reference:', paymentId);
      return res.status(200).send('ok');
    }

    // Paso 2: Buscar el pedido y actualizar
    const pedidoRef = db.collection('pedidos').doc(externalRef);
    const pedidoSnap = await pedidoRef.get();

    if (!pedidoSnap.exists) {
      console.warn('Pedido not found for payment:', paymentId, externalRef);
      return res.status(200).send('ok');
    }

    const updateData = {
      mp_payment_id: paymentId,
      mp_collection_status: status
    };

    if (status === 'approved') {
      updateData.estado = 'nuevo'; // Pago confirmado, ahora es un pedido real
    } else if (status === 'rejected' || status === 'cancelled') {
      updateData.estado = 'fallido';
    } else if (status === 'pending' || status === 'in_process') {
      updateData.estado = 'pendiente_pago'; // Sigue esperando
    }

    await pedidoRef.update(updateData);

    console.log(`Payment ${paymentId} status: ${status} → pedido ${externalRef} updated`);
    res.status(200).send('ok');

  } catch (error) {
    console.error('webhookMP error:', error);
    // Responder 200 anyway para que MP no reintente infinito
    res.status(200).send('error logged');
  }
});

// ─── FUNCIÓN CALLABLE: GENERAR LINK DE VERIFICACIÓN + LLAMAR N8N ───
// El cliente llama esta función al registrarse (en lugar de sendEmailVerification)
// Genera el link con admin.auth(), lo manda a n8n para que mande el email bonito

exports.generateVerificationLink = functions.https.onCall(async (data, context) => {
  const { email } = data;

  if (!email) {
    throw new functions.https.HttpsError('invalid-argument', 'Email requerido');
  }

  try {
    // Paso 1: Generar link de verificación
    const verificationLink = await admin.auth().generateEmailVerificationLink(email);

    // Paso 2: Llamar webhook n8n
    const n8nResponse = await fetch('https://dani9515.app.n8n.cloud/webhook/verificar-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_name: data.userName || 'Usuario',
        user_email: email,
        verification_link: verificationLink
      })
    });

    if (!n8nResponse.ok) {
      console.warn(`n8n webhook error: ${n8nResponse.statusText}`);
      // No lanzar error; n8n puede fallar pero el link se generó OK
    }

    return { success: true, message: 'Link enviado' };

  } catch (error) {
    console.error('generateVerificationLink error:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Error generando link de verificación');
  }
});

// ─── FUNCIÓN CALLABLE: GENERAR LINK DE RESET + LLAMAR N8N ───
// El cliente llama esta función cuando hace "Olvidé mi contraseña"
// Genera el link con admin.auth(), lo manda a n8n para que mande el email bonito

exports.generatePasswordResetLink = functions.https.onCall(async (data, context) => {
  const { email } = data;

  if (!email) {
    throw new functions.https.HttpsError('invalid-argument', 'Email requerido');
  }

  try {
    // Paso 1: Generar link de reset
    const resetLink = await admin.auth().generatePasswordResetLink(email);

    // Paso 2: Llamar webhook n8n
    const n8nResponse = await fetch('https://dani9515.app.n8n.cloud/webhook/recuperar-contrasena', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_name: data.userName || 'Usuario',
        user_email: email,
        reset_link: resetLink
      })
    });

    if (!n8nResponse.ok) {
      console.warn(`n8n webhook error: ${n8nResponse.statusText}`);
      // No lanzar error; n8n puede fallar pero el link se generó OK
    }

    return { success: true, message: 'Link enviado' };

  } catch (error) {
    console.error('generatePasswordResetLink error:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Error generando link de reset');
  }
});
