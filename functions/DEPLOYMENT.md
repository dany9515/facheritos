# Deployment — Mercado Pago Cloud Functions

## Requisitos previos

1. **Plan Firebase Blaze** (pago por uso) habilitado en el proyecto `facheritos-217ab`
2. **Credenciales de Mercado Pago** (tanto TEST como LIVE, cuando esté lista)
3. **Firebase CLI** instalado y autenticado

## Pasos de deployment

### 1. Instalar dependencias (local)

```bash
cd functions
npm install
```

### 2. Test local (opcional, con emulador)

```bash
npm run serve
```

Esto inicia el emulador de Cloud Functions en `http://localhost:5001`.

### 3. Configurar el Access Token de MP como Secret

**Importante:** El token NUNCA va en código ni git. Se carga como secret de Firebase.

#### Con token TEST (sandbox):

```bash
firebase functions:secrets:set MP_ACCESS_TOKEN_LIVE --project facheritos-217ab
```

Cuando te pida, pega el token TEST:
```
TEST-4562179434000493-052414-de318dac1e62575d0d4a421a3925b868-51517100
```

#### Con token LIVE (producción):

```bash
firebase functions:secrets:set MP_ACCESS_TOKEN_LIVE --project facheritos-217ab
```

Cuando te pida, pega el token LIVE que proporcione Mercado Pago (NO es un TEST-* token).

**Nota:** El nombre del secret debe ser `MP_ACCESS_TOKEN_LIVE` exactamente, ya que así lo referencia `functions/index.js` (línea que usa `process.env.MP_ACCESS_TOKEN_LIVE`).

### 4. Deploy de funciones

```bash
npm run deploy
```

Alternativamente:
```bash
firebase deploy --only functions --project facheritos-217ab
```

### 5. Obtener URLs de las funciones

Después del deploy, Firebase imprimirá las URLs de las funciones creadas:
- `crearPreferenciaMP` → URL callable (HTTPS)
- `webhookMP` → URL webhook (HTTPS)

Anota estas URLs, especialmente el webhook.

### 6. Configurar el webhook en Mercado Pago

1. Ve a tu app de Mercado Pago en https://www.mercadopago.com/developers/panel/apps
2. Busca tu app (probablemente "Facheritos" o similar)
3. En Configuración → Notificaciones → IPN, agregá:
   - **URL de notificación**: la URL `webhookMP` del paso anterior
   - **Eventos**: selecciona `payment.created` y `payment.updated`

## Flujo de testing

### Sandbox (TEST token)

1. Ejecuta `npm run deploy` (el token TEST ya está configurado en secretos)
2. Entra a la tienda: `http://127.0.0.1:5500/index.html`
3. Agregá un producto al carrito
4. Haz click "Pagar con Mercado Pago"
5. Deberías ver un formulario de pago de prueba de MP
6. Usa credenciales de prueba (ver https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/test-transactions)
7. Completa el pago
8. Vuelves a la tienda y deberías ver "Verificando tu pago…"
9. Si el webhook llega correctamente, el estado cambia a pagado
10. Verifica en Firestore que el pedido cambió de `pendiente_pago` a `nuevo`

### Producción (LIVE token)

1. Una vez que el sandbox funciona al 100%, actualiza el secret:
   ```bash
   firebase functions:secrets:set MP_ACCESS_TOKEN_LIVE --project facheritos-217ab
   ```
   (Pega el token LIVE)

2. Deploy nuevamente:
   ```bash
   npm run deploy
   ```

3. Haz una **prueba con bajo monto** (ej: $100 ARS) con una tarjeta de prueba de MP
4. Verifica que el flujo completo funciona (pago → webhook → pedido pagado)
5. **Recién después**: anuncia como "MP real activado"

## Troubleshooting

### Las funciones no se despliegan

- Verifica que `npm install` corrió sin errores
- Verifica que Blaze plan está activo: `firebase projects:list`
- Mira logs: `firebase functions:log --project facheritos-217ab`

### El webhook no llega

- Verificá que la URL de webhook está correctamente configurada en MP
- Checkea los logs: `firebase functions:log --project facheritos-217ab`
- En el dashboard de MP, busca los intentos de notificación (hay un historial)

### El pago se marca como "pendiente_pago" para siempre

- El webhook no llegó. Verifica los logs de Cloud Functions
- MP puede estar reintentando — mira el historial de notificaciones en el dashboard de MP
- Si el webhook falló, puedes simular la notificación manualmente (avanzado)

## Referencia de variables de entorno

- `MP_ACCESS_TOKEN_LIVE` — Token de acceso a Mercado Pago (guardado como secret, NO en código)
- `FIREBASE_CONFIG` — Configuración automática de Firebase (disponible en Cloud Functions)

## Referencia de funciones

### `crearPreferenciaMP` (callable)

**Input:**
```javascript
{
  cart: [{productId: string, qty: number}],
  cliente_nombre: string,
  cliente_email: string,
  cliente_telefono: string,
  cliente_direccion: string,
  nota?: string,
  entrega: 'retiro' | 'envio',
  seccion: string
}
```

**Output:**
```javascript
{
  preferenceId: string,
  initPoint: string,
  pedidoId: string
}
```

### `webhookMP` (HTTPS)

Recibe `POST` con body:
```javascript
{
  action: 'payment.created' | 'payment.updated',
  data: {
    id: number (payment_id)
  }
}
```

No devuelve nada importante (status 200), solo actualiza Firestore.
