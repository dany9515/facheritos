# Design

Sistema de diseño de Facheritos. Los tokens viven en el bloque `:root` al inicio del `<style>` de `index.html` (no hay build step). Autorá siempre con los **alias semánticos**; la rampa `--n-*` son primitivas.

## Color

Estética monocroma: negro `--ink` (#111) + blanco `--white` sobre superficies grises muy claras. El color saturado es solo funcional (estado, badges de género, marcas de pago), nunca decoración.

### Neutros semánticos (la "API")

| Token | Valor | Uso |
|---|---|---|
| `--bg` | #fff | Fondo de página |
| `--text` | #111 | Texto principal |
| `--text-secondary` | #555 | Texto secundario · 7.5:1 (AAA) |
| `--text-muted` | #6f6f6f | Texto atenuado · 5.0:1 (AA) |
| `--text-faint` | #767676 | Texto tenue · 4.5:1 (AA, mínimo legible) |
| `--border` | #eee | Bordes / separadores |
| `--border-strong` | #e0e0e0 | Bordes de inputs |
| `--surface` | #f8f8f8 | Superficie (cards de imagen, inputs, paneles) |
| `--surface-alt` | #f0f0f0 | Superficie alternativa (botones grises, chips) |
| `--brand-bg` | #111 | Secciones negras (header, hero, footer, splash) |
| `--on-dark` | #fff | Texto principal sobre negro |
| `--on-dark-muted` | rgba(255,255,255,.6) | Texto atenuado sobre negro · ~7:1 |

Rampa primitiva: `--white`, `--n-50/75/100/150/200/250/300/400/500/550/600/700/750/800/850`, `--ink`.

### Estado y paleta

- **Danger**: `--danger` #e53935 · `--danger-ink` #c62828 · `--danger-bg` #ffebee
- **Success**: `--success-ink` #2e7d32 · `--success-bg` #e8f5e9 · `--success-bg-2` #f1f8f1
- **Warning**: `--warning-ink` #f57f17 · `--warning-bg` #fff8e1
- **Info / niño**: `--info` #1565c0 · `--info-bg` #e3f2fd
- **Niña**: `--magenta` #880e4f · **Delivery**: `--rose` / `--rose-ink` / `--rose-bg`
- **Transferencia/alias**: `--sky` / `--sky-ink` / `--sky-bg` · **Promo**: `--gold` #f5c518
- **Marcas**: `--whatsapp` #25d366 · `--mp` #009ee3 · `--facebook` #1877f2

> Gradiente de Instagram y `#010101` de TikTok quedan literales (decoración de marca de un solo uso).

## Typography

- `--ff-logo` Permanent Marker — solo el logotipo
- `--ff-display` Bangers — títulos display y precios
- `--ff-body` Nunito (400–900) — todo el resto

Escala (`--fs-*`): xs 11 · sm 12 · base 14 · md 15 · lg 16 · xl 20 · 2xl 22 · 3xl 28 · 4xl 36. Hero usa `clamp(40px, 10vw, 72px)`. **Mínimo legible: 11px** — los tamaños de 9–10px se subieron a 11px y los `font-size` se migraron a `--fs-*`. Quedan literales los off-scale (13/18/24/26/30/40/44/56px).

## Radius

Escala `--r-*`: xs 4 · sm 8 · md 10 · lg 12 · xl 14 · 2xl 16 · 3xl 20 · pill 100 · full 50%. Los radios off-scale (6/7/9px) se normalizaron a `--r-sm` (8px).

## Elevation

`--shadow-sm` (0 1px 2px /.06) · `--shadow-md` (0 4px 16px /.08, hover de card) · `--shadow-lg` (0 4px 24px /.3, toast).

## Spacing

Escala 4pt `--sp-1..12` (4/8/12/16/20/24/32/40/48). Definida; migración de paddings/márgenes pendiente.

## Motion

`--dur-fast` .15s · `--dur` .2s · `--dur-slow` .3s · `--ease-out` cubic-bezier(.22,1,.36,1). Hay un bloque global `@media (prefers-reduced-motion: reduce)`.

## Z-index

Escala semántica: `--z-base` 1 · `--z-nav` 100 · `--z-header` 200 · `--z-promo` 201 · `--z-overlay` 300 · `--z-panel` 301 · `--z-sheet` 400 · `--z-toast` 999 · `--z-splash` 1000 · `--z-zoom` 9999.

## Deuda de diseño conocida (próximo pase)

- ✅ **Contraste a11y** (hecho): textos sobre blanco (`--text-muted`/`--text-faint`) y sobre negro (`--on-dark-muted`) ahora pasan WCAG AA. Verificado con screenshots.
- ✅ **Mínimo legible 11px** (hecho): 9–10px subidos a 11px.
- ✅ **Migrar `font-size` → `--fs-*`** (hecho).

- ✅ **Cards de producto** (hecho): body en flex-column con precio/CTA anclados al fondo (`margin-top:auto`) → precios alineados entre cards sin el hueco del `min-height`. Imagen cuadrada (`aspect-ratio:1`), jerarquía precio (Bangers 22px + pill `-15%`) > nombre (14px) > categoría (tenue). CTA negro sólido refinado (decisión de marca, bold). Badges con `--shadow-sm`, hover con `--ease-out`.

- ✅ **Header + hero + filtros** (hecho): sombra sutil en header sticky, estados hover/active en botones, **fix del subrayado del tab de género** (un `border:none` lo anulaba), buscador con ancho máximo/centrado en desktop, badge/dirección del hero más definidos, "Limpiar filtros" pasó a botón secundario (ghost). Transitions de la zona → `--dur-*`+`--ease-out`. 13px de la zona regularizados. CSS duplicado del promo-banner eliminado.

- ✅ **Detalle + checkout/carrito** (hecho, `polish`): pase de estados de interacción completo (bloque `@media(hover:hover)` + `:active` + `:focus-visible` con outline `--ink` para a11y de teclado) en todos los controles de compra (`.btn-black/.btn-gray/.pay-wa/.pay-mp-btn/.q-btn/.ci-rm/.x-btn/.eye-btn/.delivery-opt/.comp-upload/.menu-item/.auth-tab/.share-btn-*`). Botones de cantidad 28→32px (target táctil). `transition: all` eliminado → propiedades específicas con `--dur-*`+`--ease-out`. Off-scale 13px de detalle/checkout/auth → `--fs-sm`/`--fs-base`. Hex hardcodeados a tokens: modal "pago aprobado", chip de talle mobile, estado vacío del carrito (`#bbb` roto → `--text-faint` + copy que guía + botón "Seguir comprando"). Verificado con screenshots Playwright (detalle, checkout, carrito vacío) y **0 violaciones de CSP**.

- ✅ **CSP — fuente de Swiper** (hecho): Swiper embebe su icon-font de flechas como `data:application/font-woff` en su CSS; `font-src` lo bloqueaba (error en consola en TODOS los navegadores, no era una extensión). Se agregó `data:` a `font-src`. Verificado: 0 violaciones.

Pendiente:
1. **Off-scale display restante**: tamaños Bangers 18/24/26/30 (precios/nombres display) quedan literales — son decisiones de display, evaluar si tokenizar.
2. **Migrar spacing/`transition`** restantes a `--sp-*` / `--dur-*` en zonas no tocadas (perfil/pedidos).
3. **A11y teclado**: los toggles `.delivery-opt` (pago/envío) son `<div onclick>` no focuseables; tienen `:focus-visible` pero falta `tabindex`+handler de teclado para activarlos con Enter.
