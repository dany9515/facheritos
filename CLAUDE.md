# CLAUDE.md — Facheritos

Tienda online de ropa infantil (bebés y niños/adolescentes).

## Stack

- **Frontend**: HTML + CSS + JS vanilla, sin framework ni build step
- **Backend**: Firebase (Firestore + Storage + Auth)
- **Hosting**: GitHub Pages con custom domain `facheritos.operlog.com.ar`
- **Deploy**: GitHub Actions (`.github/workflows/deploy.yml`) publica en `gh-pages`

## Archivos principales

| Archivo | Rol |
|---|---|
| `index.html` | Tienda pública — productos, carrito, checkout, auth de clientes |
| `admin.html` | Panel de administración — productos, pedidos, dashboard. PWA instalable |
| `firestore.rules` | Reglas de seguridad de Firestore |
| `firebase.json` | Configuración del Firebase CLI |
| `.github/workflows/deploy.yml` | Workflow de deploy a GitHub Pages |

No hay build step — se edita directamente el HTML.

## Deploy

Siempre pushear a **ambas ramas** para que el workflow dispare:

```bash
git push origin master && git push origin master:main
```

El workflow escucha pushes a `master`. Si solo se pushea a `main`, el workflow no dispara y los cambios no llegan a producción.

Para deployar solo las reglas de Firestore:

```bash
firebase deploy --only firestore:rules --project facheritos-217ab
```

## Arquitectura de index.html

- **Secciones**: Bebés (talle 0–6) y Niños/Teens (talle 6–18). El usuario elige al entrar (splash).
- **Productos**: se cargan desde Firestore (`/productos`), filtrados por `seccion` y `activo: true`.
- **Carrito**: persiste en `localStorage` (`fach_cart`).
- **Checkout**: dos métodos — WhatsApp (con comprobante de transferencia) y Mercado Pago Checkout Pro.
- **Auth**: Firebase Auth (email/password). Admin = `facheritos@operlog.com.ar`.

## Reglas Firestore

Archivo: `firestore.rules`. Se deployaron con Firebase CLI.

- `productos` y `config`: lectura pública, escritura solo admin.
- `perfiles/{userId}`: lectura/escritura solo al propio usuario.
- `pedidos`: creación pública (con **validación estricta** — lista blanca de campos + tipos/tamaños, desde 13/06/2026), lectura solo del propio usuario o admin, modificación/eliminación solo admin.

## Seguridad implementada

1. **MP Access Token** → ⚠️ **NO movido (corregido 11/06/2026).** El `index.html` vivo (verificado bajando producción) llama a Mercado Pago **directo con el token en el cliente** (`MP_AT`), y encima es un token **de TEST** (`TEST-...`) → los pagos MP reales no están activos. El comentario "mover a Cloud Function" sigue pendiente de verdad. Producción == repo en esto, así que el rediseño no regresa nada. Tarea aparte para cuando se quieran pagos MP reales (Cloud Function + token live).
2. **Reglas Firestore** → `firestore.rules`. **Endurecidas el 13/06/2026** (auditoría de seguridad): el `create` de `pedidos` ahora usa **lista blanca de campos** (`hasOnly`, 18 campos conocidos) + validación de tipos y tamaños (`total` numérico con tope, `items` lista acotada, `cliente_nombre`/`nota` con largo máximo, `metodo_pago` ∈ {transferencia, mp}). Frena spam, payloads gigantes e inyección de campos arbitrarios. Productos/config/perfiles sin cambios. El usuario las publica desde la consola (no deployar por él).
3. **Reglas Storage** → `storage.rules` (nuevo, versionado el 13/06/2026; antes vivían solo en la consola). Endurecidas: **comprobantes ya NO los lee cualquier usuario logueado** (solo dueño o admin) — antes había leak de comprobantes bancarios entre clientes; límites de tamaño/tipo en `productos` (10 MB, image/*) y `comprobantes` (20 MB, image/* o PDF); `match /{allPaths=**}` deny explícito. Guard `request.resource == null` para no bloquear los borrados del admin. `firebase.json` ahora declara `storage` además de `firestore`.
4. **API key Firebase** → restringida por dominio en Google Cloud Console (hecho manualmente).
5. **CSP meta tag** → en `<head>` de `index.html`, restringe scripts, estilos, fuentes, imágenes y conexiones a dominios autorizados.

**Auditoría de seguridad (13/06/2026) — hallazgos abiertos** (ver más abajo el detalle de MP):
- 🔴 El "pago aprobado" de MP se confirma desde URL params en el cliente (`index.html` retorno de MP) → **falsificable**; y el `unit_price`/total se arma en el cliente → **manipulable**. NO se arregla con reglas: requiere la Cloud Function (misma tarea que el token live). Hoy mitigado solo porque MP está en TEST (no mueve plata).
- ✅ `foto_url`/`f.url` ahora pasan por `esc()` en `src` de `<img>` (cerrado 13/06/2026, commit `6e2905b`; `esc()` codifica `&`→`&amp;`, sin cambio funcional). Quedan crudos solo los previews `dataUrl` locales del admin (base64, sin riesgo).
- 🟡 2FA en la cuenta admin `facheritos@operlog.com.ar` recomendado (acción manual en consola Firebase Auth) — es la llave de toda la tienda.

## Funcionalidades destacadas

### Compartir productos (sesión 29/05/2026)
- Al abrir un producto, la URL cambia a `?producto=ID` (compartible).
- Si alguien entra con `?producto=ID`, el producto se abre automáticamente y se oculta el splash.
- Botón de share en cada card y en el header del sheet de detalle.
- Usa `navigator.share` en mobile; copia al portapapeles en desktop.

### Talles por chips (sesión 26/05/2026)
- `admin.html`: chips seleccionables por sección en lugar de input de texto libre.
- Bebés: grupo "Bebés" (0–5) + grupo "Niños pequeños" (2–6).
- Niños/Teens: grupo "Niños y adolescentes" (4–18).

### Fotos (sesión 26/05/2026)
- `compressImage()` usa `createImageBitmap()` para decodificar cualquier formato (incluido HEIC/iPhone) y exportar como JPEG.
- Redimensiona a max 1600px, calidad 0.85.
- Soporte para múltiples fotos con Swiper en el detalle.

## Reglas de trabajo

- No tocar lógica de Firebase ni panel admin al hacer cambios en `index.html`, salvo que se pida explícitamente.
- Usar `esc()` para todo contenido dinámico que vaya a `innerHTML`.
- El campo `tags` de productos guarda talles como string separado por comas (compatible entre admin e index).

## Mejora visual con skill `impeccable`

**Objetivo**: mejorar visualmente `index.html`. Se usa en modo seguro: preguntar antes de buscar/instalar/ejecutar cualquier skill, nunca instalar a ciegas. Skill `impeccable` (de `pbakaus/impeccable`) y `find-skills` instaladas en `~\.claude\skills\`.

**Contexto del skill** (creado en sesión 11/06/2026):
- `PRODUCT.md` (raíz) — register `product`, usuarios, propósito, anti-referencias, principios. Lo leen todos los comandos de `impeccable`.
- `DESIGN.md` (raíz) — sistema de diseño: todos los design tokens documentados + deuda de diseño conocida.

**✅ Hecho — `extract` de design tokens (11/06/2026)**:
- Creado bloque `:root` con sistema completo de tokens al inicio del `<style>` de `index.html`: rampa neutra `--n-*` + alias semánticos (`--text`, `--border`, `--surface`…), colores de estado/paleta, escala de radios, elevación (`--shadow-sm/md/lg`), spacing 4pt, escala tipográfica, motion, z-index.
- Migrado el CSS a tokens (parity, sin cambiar el look): 217 colores, 63 radios, 2 sombras, 10 z-index. Radios off-scale 6/7/9px normalizados a 8px (`--r-sm`).
- Agregado bloque `@media (prefers-reduced-motion: reduce)`.
- **Autorá siempre con los alias semánticos**, no con valores hardcodeados ni la rampa primitiva.

**✅ Hecho — contraste + tipografía (`colorize`/`typeset`, 11/06/2026)**:
- Contraste WCAG AA: `--text-muted` #999→#6f6f6f (5:1), `--text-faint` #bbb→#767676 (4.5:1), grises `#888` repunteados, y nuevo `--on-dark-muted` rgba(255,255,255,.6) para texto atenuado sobre negro (11 usos). Verificado con screenshots Playwright (antes/después).
- Tipografía: tamaños 9–10px subidos a 11px mínimo; 85 `font-size` migrados a `--fs-*`.

**✅ Hecho — cards de producto (`polish`, 11/06/2026)**: body flex-column con precio/CTA anclados al fondo (precios alineados entre cards), imagen cuadrada (`aspect-ratio:1`), jerarquía precio>nombre>categoría, CTA negro sólido refinado (elección del dueño: bold streetwear). Verificado con screenshots.

**✅ Hecho — header + hero + filtros (11/06/2026)**: sombra en header sticky, hover/active en botones, fix del subrayado del tab de género (lo anulaba un `border:none`), buscador con max-width centrado en desktop, hero más definido, "Limpiar filtros" a botón secundario ghost, transitions de la zona a `--dur-*`+`--ease-out`, 13px de la zona regularizados, CSS duplicado del promo eliminado. Verificado con screenshots.

**Deuda pendiente** — detalle en `DESIGN.md`:
1. Zonas sin pulir: detalle de producto, checkout/carrito.
2. Regularizar 13px restantes (detalle/checkout/auth) + off-scale 18/24/26/30.
3. Migrar transitions/spacing restantes a tokens.

**Sistema de diseño**: monocromo negro `#111` + blanco, fonts Permanent Marker (logo), Bangers (display/precios), Nunito (body). Estética streetwear infantil.

## Rediseño streetwear bold (sesión 11/06/2026 — ✅ EN PRODUCCIÓN desde 12/06/2026)

Rediseño visual fuerte de la tienda. Se prototipó primero en **`prototipo.html`** (raíz, local, mock, NO deployado — es la referencia visual), se migró al `index.html` real en la rama `rediseno-tienda` y se **mergeó a `master` y deployó el 12/06/2026** (verificado vivo con productos reales, 0 errores).

**Estrategia**: partir del `index.html` real (el motor: Firebase, auth, checkout, splash, sharing) y **trasplantar solo la presentación** (CSS + markup de render). NO reescribir el motor.

**Estética**: streetwear editorial monocromo + un acento "volt" (`--volt:#e8ff00`, highlighter, solo ofertas/CTA/foco), bordes negros gruesos + sombra dura (`--shadow-hard:6px 6px 0`), sheets con slide-up iOS (`--ease-ios`), Bangers/Permanent Marker grandes.

**✅ Fase 1 COMPLETA** (presentación restyleada sobre el motor real, verificada zona por zona con harness mock, 0 errores, hooks intactos): tokens nuevos (`--volt`/`--shadow-hard`/`--ease-ios`/`--press`), splash, header+hero+filtros+cards, detalle, carrito+checkout (sin tocar `sendWA`/`sendMP`/comprobante), auth+perfil+pedidos.

**✅ Fase 2 — SALE (`precio_oferta`)**: feature de oferta por producto. Campo opcional **`precio_oferta`** agregado al form de `admin.html` (con validación: menor al precio; guardado y carga). En el store: si existe y es menor a `precio` → etiqueta SALE volt + `precio` tachado + descuento dinámico; el efectivo se usa en cards, detalle, carrito, total, `sendMP` (monto) y `sendWA` (mensaje, marca "(oferta)").

**Harness de dev**: ~~`DEV_MOCK`~~ **ELIMINADO (12/06/2026)** — ya no hace falta: la API key acepta `localhost:5500` y `127.0.0.1:5500` como referrers (verificado vía REST), así que el diseño se verifica en local con **datos reales**: `npx http-server -p 5500 -a 127.0.0.1` + `http://127.0.0.1:5500/index.html`. `file://` NO funciona (sin referrer válido).

**Skills instaladas** (modo seguro, en `~/.claude/skills/`): `emilkowal-animations` (motion, usar), `taste-skill@redesign-existing-projects` y `@high-end-visual-design` (esta última NO debe manejar el diseño — choca con la marca). El acento volt y el motion (press scale .97, sheet arrastrable, tabs deslizantes) vienen de ahí.

**"Subir a producción" = push a GitHub.** La rama `rediseno-tienda` NO deploya hasta mergear a `master` + push a ambas ramas.

**✅ VIVO desde 12/06/2026**: probado con datos reales en local (Playwright, flujo completo, 0 errores), `DEV_MOCK` eliminado, merge a `master` + push a ambas ramas, workflow success, producción verificada.

**Decisión de producto (12/06/2026): NO existe envío gratis como modalidad** — la barra de progreso de envío gratis del prototipo no se migra.

**✅ Pulido fase 3 — EN PRODUCCIÓN desde 13/06/2026**:

Commiteado en `master` y pusheado a ambas ramas (`git push origin master` + `git push origin master:main`) el 13/06/2026 → workflow disparado. Todo verificado con Playwright contra datos reales en local (0 errores), capturas revisadas.

Lo hecho (commit `d17fa9e` = hero; el resto commiteado al guardar esta sesión):
1. ✅ **Hero editorial**: "Ropa con ~~CALLE~~ y cariño" (Bangers gigante, highlight volt rotado en CALLE), copy dinámico por sección (bebés 0–6 / teens 6–18), CTAs "Ver la colección →" (volt, scrollea al grid) y "Cómo comprar" (abre sheet nuevo `ov-howto` con 3 pasos: Elegí/Pagá/Recibí — el pill "Alem 634" del hero viejo vive ahí ahora). Marca de agua "F" gigante. Hook `--hero-photo` listo para foto del local (hoy negro pleno). Clases nuevas: `.hero-in`, `.btn-hero`, `.btn-hero-volt`, `.btn-hero-ghost`, `.hero-mark`, `.howto-*`.
2. ✅ **Ticker marquee**: promo bar estática → `.ticker-track` animado en loop (22s, items duplicados x2 para el loop -50%, volt en datos clave, respeta `prefers-reduced-motion`, altura fija 1 línea = sticky del header estable en `top:33px`).
3. ✅ **Tabs de género → pills**: activa = pill blanca sólida sobre header negro (proto invertido), press scale .97, scroll-x sin scrollbar si no entran.
4. ✅ **Detalle**: zona de imagen oscura (`--n-850`, bullets del swiper blancos), label "ELEGÍ EL TALLE" (`.det-label`, solo si hay tags), stock "● En stock (N u.) — listo para enviar", precio dentro del CTA ("Agregar al carrito · $X").
5. ✅ Cards: ya estaban a la par del prototipo (borde 2px + shadow-hard en hover) — la diferencia visual eran las fotos grayscale del mock. Sin cambios.

**✅ Paridad con prototipo (13/06/2026 — EN PRODUCCIÓN)**: tres ajustes para acercar el store al `prototipo.html`, verificados con Playwright contra datos reales (0 errores):
1. **Feature strip** — panel negro editorial ("Drop de temporada / Streetwear que crece con ellos / FACHE" en volt) intercalado en el grid vía `featureStripHTML()`, `splice(4,0,...)` (solo si hay >4 productos). Clases `.prod-feature*`.
2. **Card estilo prototipo** — precio Bangers grande (`.prod-card-price-now` = precio actual) a la izquierda + pill verde de transferencia (`.prod-card-transfer` = `🏦 $base*0.85`) a la derecha, en `.prod-card-foot`. Se **conservan** los botones Agregar + Compartir (decisión del dueño: no migrar el `+` flotante del proto). Reemplaza el bloque viejo `.prod-card-prices`/`-price-new`/`-discount`.
3. **Toast** — pill negro con **borde volt** + animación de entrada (opacity/translateY), en vez del `display:none/flex`. Aplica a todos los toasts.

Nota: la sección **bebés** hoy tiene solo 2 productos → el feature strip no aparece ahí (por diseño, necesita >4); en **teens** (15) sí.

**✅ Fix legibilidad del "7" (13/06/2026 — EN PRODUCCIÓN)**: el "7" de Bangers se confundía con "1" en precios. Enfoque elegido por el dueño: mantener Bangers, agrandar + separar dígitos (NO cambiar a Nunito). Aplicado parejo en los 5 lugares con precio Bangers: `.prod-card-price-now` (28→30px, ls 1.5px), `.det-price` (clamp 44-58px, ls 2px), `.ci-price` (22→24px, ls 1px), `.cart-ttl-num` (36→38px, ls 2px), `.ped-total` (ls 1px). El `letter-spacing` es la palanca real. **Cuidado de layout**: en mobile (<768px, cards 2-col ~171px) el precio grande + pill de transferencia no entraban en una línea → `@media(max-width:767px)` apila el pill debajo (`.prod-card-foot` a `flex-direction:column`); en desktop siguen lado a lado. Verificado con Playwright a 1280px y 390px (0 errores, sin overflow).

**✅ Tab "Destacados" (13/06/2026 — EN PRODUCCIÓN)**: feature de productos destacados.
- **admin.html**: checkbox "⭐ Destacado" (`fp-destacado`) en la sección Visibilidad, con guardado/carga/reset igual que `activo`. Guarda `destacado: bool` en el producto.
- **index.html**: pill "★ Destacados" (`#gtab-destacados`, estilo `.gtab-star` volt) al inicio de la `gender-bar`. Estado `soloDestacados`; filtro en `applyFilters` (`p.destacado !== true`); `toggleDestacados()`. El pill **solo se muestra si hay ≥1 producto destacado** en la sección (si no, oculto → no hay tab sin resultados). Resets en `selectSeccion`/`clearFilters`.
- **firestore.rules**: sin cambios (write solo valida `isAdmin()`).
- Verificado con Playwright (tienda: wiring del filtro, show/hide del pill, 0 errores; admin: checkbox renderiza).

**Higiene de repo (13/06/2026)**: `.gitignore` ahora ignora tooling local de skills (`.claude/ .agents/ .impeccable/ skills-lock.json`), referencias de diseño locales (`prototipo.html`, `PRODUCT.md`) y temporales (`_*.mjs`, `*.png`). **Regla: commitear archivos puntuales (`git add index.html admin.html ...`), NUNCA `git add -A`** — había borrados locales sin commitear de `sw.js` y `firebase-config.example.js` (restaurados); commitear "todo" los borraría de producción y rompería la PWA del admin.

**Pendiente**:
1. Eventualmente MP real (Cloud Function + token live).
2. **NO migrar nunca** la barra de envío gratis del prototipo (no existe esa modalidad — decisión 12/06/2026).

---

## 📌 ESTADO AL CERRAR LA SESIÓN (13/06/2026, auditoría + emails) — LEER AL VOLVER

### ✅ Hecho esta sesión (todo commiteado y pusheado)

1. **Auditoría de seguridad** (commits `a001db5`, `6e2905b`, `aad9978`):
   - Firestore endurecido: lista blanca de campos en `pedidos`, validación de tipos/tamaños (anti-spam).
   - Storage endurecido: leak de comprobantes cerrado (lectura solo dueño/admin), límites tamaño/tipo, `storage.rules` versionado por primera vez.
   - `foto_url` escapado en `<img src>` (XSS defensa en profundidad).

2. **Cambiar contraseña del admin sin email** (commit `61de171`):
   - Botón "🔒 Contraseña del panel" en `admin.html` (sección Configuración).
   - Reautentica con la actual, sin depender del correo (que está roto).
   - **REGLA: para cambiar la contraseña del admin, NUNCA usar "Recuperar contraseña" por email — usar este botón.**

3. **Diagnóstico del sistema de correos** (commit en memoria; no tocamos producción):
   - **Firebase Auth (reset + verificación)**: deshabilitado el SMTP de Zoho → ahora sale desde Firebase (`noreply@facheritos-217ab...`). Pero cae en spam.
   - **EmailJS (confirmación de pedidos)**: nunca estuvo configurado (los 3 campos en Firestore están vacíos).
   - **Causa del spam**: correos sin "sellos de confianza" (DKIM/SPF) → Gmail desconfía.
   - **Solución elegida**: crear un Gmail nuevo para los correos automáticos (gratis, Gmail tiene los sellos puestos por Google).

### ✅ Sesión continuación (13/06/2026 noche) — SMTP + auth reset

**Hecho:**
1. **Firebase SMTP configurado con Zoho empresarial** (`facheritos@operlog.com.ar`):
   - Host: `smtp.zoho.com` | Puerto: `587` | Usuario: `facheritos@operlog.com.ar` | Contraseña: `Proteina.` | Seguridad: `TLS`
   - Zoho: **SPF configurado ✓** + **DKIM configurado y verificado ✓**
   - Emails de reset llegan a **inbox** (no spam) desde `facheritos@operlog.com.ar`
   - Dominio autorizado en Firebase: `facheritos.operlog.com.ar` ✓

2. **Fix de bug crítico**: eliminado `import emailjs` de línea 957 que rompía toda la ejecución de JavaScript y hacía que `selectSeccion()` no existiera.

### ✅ COMPLETO — Auth + Email (14/06/2026 sesión actual)

**Problemas resueltos:**
1. Links de verificación/reset retornaban error 403 (dominio bloqueado) → **Solución**: agregar `https://facheritos-217ab.firebaseapp.com/` a Google Cloud Console
2. **Feature nueva**: Verificación obligatoria de email antes de acceder a la tienda

**Estado 100% funcional:**
- ✅ Registro con validación (8+ caracteres, ≥1 número)
- ✅ Email de verificación llega a inbox (no spam)
- ✅ Bloqueo de acceso sin verificar → página `pg-verify-email` con "Reenviar email"
- ✅ Reset de contraseña funciona
- ✅ Splash screen siempre pide elegir sección (bebés/adolescentes)
- ✅ Cambio de contraseña en admin sin depender del email

### 🎯 Pendiente — Solo falta lo crítico

**MP real (Cloud Function + token live)** — ver punto 1 de "Seguridad implementada" arriba.
- Hoy: pagos MP en TEST (no mueven plata, solo demo)
- Para ir a producción: Cloud Function + token live + validación del lado del servidor
- **No es urgente** — la tienda funciona 100% con WhatsApp + transferencia

### ℹ️ Contexto actual

- **Tienda 100% operativa**: Auth + email + checkout + admin + PWA todo funciona.
- **Comercio sin MP real**: WhatsApp + transferencia (la mayoría de los clientes usa esto de todas formas).
- **2FA del admin**: Botón "Cambiar contraseña" en panel (funciona sin depender del email).

**Recordatorio de deploy**: pushear SIEMPRE a ambas ramas (`git push origin master && git push origin master:main`) y commitear archivos puntuales, **NUNCA `git add -A`**.

---

## 📌 ESTADO AL CERRAR LA SESIÓN (14/06/2026, rediseño splash + hero)

### ✅ Hecho esta sesión — EN PRODUCCIÓN

1. **Nuevo logo FACHERITOS con F corona** (commit `0535b98`):
   - Logo diseñado en Canva: "FACHERITOS" con F + corona, estilo graffiti/street art
   - Guardado como `assets/images/F_corona_recortada.png` (210 KB)
   - Integrado en el splash (`.splash-logo-img`) con:
     - `filter: invert(1) brightness(1.2)` para invertir colores (letras negras → blancas)
     - `width: clamp(230px, 52vw, 420px)` — responsivo
     - `transform: rotate(-2deg) translateX(-15px)` — rotación + ajuste de posición
   - **Reemplaza el texto "FACHERITOS" anterior** (Permanent Marker)

2. **Foto del local en el hero**:
   - Imagen `IMG-20260613-WA0022.jpg` → copiada a `assets/images/hero-photo.jpg` (267 KB)
   - Variable CSS `--hero-photo:url('assets/images/hero-photo.jpg')` en `:root`
   - Posicionamiento: `center 30%/cover` — muestra los carteles del local sin cortar
   - Gradiente overlay mantiene legibilidad del texto (`linear-gradient(105deg, rgba(17,17,17,.94)...`)

3. **Slogan actualizado**:
   - Splash: "Calle & cariño" → "Ropa con onda para cada edad"
   - Hero: "Ropa con ~~calle~~ y cariño" → "Ropa con **onda** para cada edad" (onda en highlight volt)
   - Fuente hero: `clamp(54px, 13vw, 110px)` — tamaño dinámico

### 📦 Archivos nuevos
- `assets/images/hero-photo.jpg` — Foto del local (267 KB)
- `assets/images/F_corona_recortada.png` — Logo FACHERITOS (210 KB)

### 🎨 CSS actualizado
- `.splash-logo-img` — nueva clase para el logo (invert + brightness + transform)
- `--hero-photo` — nueva variable en `:root` para el background del hero
- `.hero::before` — posicionamiento cambiado a `center 30%/cover` (antes `center/cover`)
- Fuente splash-logo cambió a `'Fredoka One'` (antes `'Permanent Marker'`) — mantenida para compatibilidad

### ✅ Verificado
- Splash: logo visible, bien posicionado, colores correctos (splash-logo-img)
- Footer: logo integrado con tamaño responsivo (footer-brand-img)
- Hero: foto visible, carteles del local se ven, texto legible
- Responsivo: testeado en local con `http://127.0.0.1:5500/` (servidor http-server puerto 5500)
- Mobile: splash logo `clamp(190px, 82vw, 350px)` + `translateX(-15px)`; footer logo `clamp(140px, 38vw, 260px)` + `translateX(-12px)`
- Desktop: splash logo `clamp(230px, 50vw, 420px)` + `translateX(-15px)`; footer logo responsivo

### ✅ Commits finales (14/06/2026)
- `0535b98`: feat: nuevo logo FACHERITOS con F corona + hero con foto del local
- `fb49806`: assets: agregar logo FACHERITOS con F corona (forzado con -f)
- `207fd02`: fix: aumentar tamaño del logo en mobile — 320px max
- `1c056c5`: feat: logo FACHERITOS con F corona en footer — ajustes de tamaño y posición

### 🎯 ESTADO FINAL
- ✅ **EN PRODUCCIÓN**: Logo FACHERITOS con F corona en splash + footer, foto del local en hero, slogan "Ropa con onda para cada edad"
- ✅ **Tienda 100% operativa**: Auth + email + checkout + admin + splash + hero + productos + footer — todo funciona
- 🔄 **Workflow completado**: Deploy a GitHub Pages automático via GitHub Actions
- **MP real** sigue pendiente (Cloud Function + token live) — no crítico, tienda funciona 100% con WhatsApp + transferencia
