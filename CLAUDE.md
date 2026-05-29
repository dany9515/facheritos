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

1. **MP Access Token** → movido a Cloud Function (hecho manualmente).
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
