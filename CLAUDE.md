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
- `pedidos`: creación pública (con validación básica), lectura solo del propio usuario o admin, modificación/eliminación solo admin.

## Seguridad implementada

1. **MP Access Token** → ⚠️ **NO movido (corregido 11/06/2026).** El `index.html` vivo (verificado bajando producción) llama a Mercado Pago **directo con el token en el cliente** (`MP_AT`), y encima es un token **de TEST** (`TEST-...`) → los pagos MP reales no están activos. El comentario "mover a Cloud Function" sigue pendiente de verdad. Producción == repo en esto, así que el rediseño no regresa nada. Tarea aparte para cuando se quieran pagos MP reales (Cloud Function + token live).
2. **Reglas Firestore** → `firestore.rules` deployado vía CLI.
3. **API key Firebase** → restringida por dominio en Google Cloud Console (hecho manualmente).
4. **CSP meta tag** → en `<head>` de `index.html`, restringe scripts, estilos, fuentes, imágenes y conexiones a dominios autorizados.

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

**Pendiente — pulido fase 3 (acercar a `prototipo.html`), por impacto**:
1. Hero editorial "Ropa con *calle* y cariño" (highlight volt) + CTAs "Ver la colección →" / "Cómo comprar" (hoy: bloque negro con FACHERITOS repetido).
2. Marquee superior animado en loop (hoy: promo bar estática).
3. Cards con borde negro grueso + `--shadow-hard` (hoy más suaves).
4. Tabs de género pills/segmented deslizante (hoy subrayado).
5. Detalle: fondo oscuro en imagen, label "ELEGÍ EL TALLE", "En stock — listo para enviar", precio dentro del CTA.
6. (Feature, decisión del dueño) Tab "Destacados" — requiere campo `destacado` en admin.
7. Deuda de legibilidad: el "7" de Bangers en precios se lee como "1".
8. Eventualmente MP real (Cloud Function + token live).
