# 🔐 Auditoría de Seguridad — 28/06/2026

**Fecha/Hora:** 28/06/2026 14:41:09  
**Estado:** ✅ FASE 1 COMPLETADA (Fase 2-3 pendientes)  
**Riesgo de ruptura:** 0% (cambios triviales)

---

## 📦 Backup de Seguridad

**Tag git:** `BACKUP_PRE_AUDITORIA_20260628_144109`

Para volver a este punto si algo falla:
```bash
git reset --hard BACKUP_PRE_AUDITORIA_20260628_144109
firebase deploy --only functions
```

---

## 📋 Hallazgos (Resumen Ejecutivo)

| Severidad | Cantidad | Estado |
|-----------|----------|--------|
| 🔴 CRÍTICO | 2 | Fase 3 (webhook HMAC, XSS admin) |
| 🟠 ALTO | 4 | Fase 1-2 (CSP, token fallback, errors, rate limiting) |
| 🟡 MEDIO | 3 | Fase 1-3 (dependencias, storage rules) |
| 🔵 BAJO | 2 | Fase 3+ (CORS, headers) |

---

## ✅ FASE 1 — COMPLETADA

### Cambios realizados (6 total, 0% riesgo)

1. **Remover fallback token en `crearPreferenciaMP`** (`functions/index.js:93`)
   - Antes: `const MP_TOKEN = process.env.MP_ACCESS_TOKEN_LIVE || 'APP_USR-...'`
   - Después: Lanza error si secret no está configurado
   - Razón: Token LIVE no debe estar en código

2. **Remover fallback token en `webhookMP`** (`functions/index.js:171`)
   - Similar al cambio 1
   - Razón: Seguridad + explicitación de errores

3. **Filtrar `error.message` en `crearPreferenciaMP`** (`functions/index.js:146`)
   - Antes: `throw new functions.https.HttpsError('internal', error.message || '...')`
   - Después: Devuelve mensaje genérico, no expone stack trace
   - Razón: No exponer información interna

4. **Filtrar `error.message` en `generateVerificationLink`** (`functions/index.js:262`)
   - Similar al cambio 3
   - Razón: Mismo que arriba

5. **Filtrar `error.message` en `generatePasswordResetLink`** (`functions/index.js:302`)
   - Similar al cambio 3-4
   - Razón: Mismo que arriba

6. **Agregar `npm audit` al workflow** (`.github/workflows/deploy.yml`)
   - Agregado: Setup Node.js + `npm audit --audit-level=moderate`
   - Ubicación: Antes del deploy
   - Razón: Verificar vulnerabilidades en dependencias automaticamente

### Commits

```
9d82e5b — docs: auditoría completa de seguridad + plan de ejecución Fase 1-3
57c1095 — security: fase-1 — remove token fallback, filter error messages, npm audit
```

---

## ⏳ FASE 2 — PRÓXIMA (Mañana, <1% riesgo)

### Cambios pendientes

1. **Remover `'unsafe-inline'` de CSP** (`index.html:7`)
   - Riesgo: <1% (solo testeo en navegador)
   - Testing: Abrir tienda en Go Live, verificar que carga

2. **Mover `window.__fbCfg` a archivo externo** (`index.html:1026-1034`)
   - Riesgo: <1% (solo reorganización)
   - Detalle: Crear `firebase-config.js`, reemplazar inline

3. **Grep audit XSS en `admin.html`** (líneas 600-700+)
   - Riesgo: 0% (solo lectura)
   - Detalle: Buscar `.innerHTML` sin `esc()`, reportar

4. **Testing local** (1 hora)
   - Go Live: `http://127.0.0.1:5500/index.html`
   - Verificar: tienda carga, login funciona, admin muestra datos

---

## 🔄 FASE 3 — PRÓXIMA SEMANA (Alto riesgo, requiere staging)

### Cambios pendientes

1. **Implementar HMAC webhook** (`functions/index.js:155`)
   - Riesgo: 5-10% (si se implementa mal → rechaza webhooks válidos)
   - Estrategia: Logging primero (no rechaza), monitoring durante 1 semana, luego reject

2. **Implementar rate limiting** (`functions/index.js` en todas las funciones callable)
   - Riesgo: 5-10% (si es demasiado estricto → rechaza a usuarios legítimos)
   - Estrategia: Logging primero, después pasar a reject

3. **Audit completo XSS `admin.html`** (líneas 600-800+)
   - Riesgo: Bajo (lectura + parching)
   - Detalle: Buscar todos los `.innerHTML` sin `esc()`

---

## 🚨 Puntos críticos pendientes (FASE 3)

### 🔴 **Webhook MP sin validación HMAC**
- **Riesgo:** Atacante forja webhook falso → pedido sin pago pasa a `nuevo`
- **Mitigación actual:** Webhook valida contra MP API (aceptable)
- **Plan:** Agregar validación `x-signature` antes de validar API

### 🔴 **XSS potencial en admin.html**
- **Riesgo:** Campo dinámico sin `esc()` → ejecuta código
- **Mitigación actual:** Mayoría de campos usan `esc()`
- **Plan:** Audit visual exhaustivo

---

## 📍 Documentación

✅ Auditoría completa: `CLAUDE.md` (líneas 900-1100+)  
✅ Detalles de cambios: `CLAUDE.md` (sección "📝 DETALLES DE CAMBIOS")  
✅ Plan de ejecución: `CLAUDE.md` (sección "📋 PLAN DE EJECUCIÓN")

---

## 🎯 Comandos útiles

### Verificar cambios Fase 1
```bash
git diff 57c1095~1 57c1095
```

### Deployar Fase 1
```bash
firebase deploy --only functions --project facheritos-217ab
```

### Revertir si falla
```bash
git reset --hard BACKUP_PRE_AUDITORIA_20260628_144109
firebase deploy --only functions
```

### Verificar token MP
```bash
firebase functions:secrets:list --project facheritos-217ab
```

---

## ✅ Checklist

- [x] Backup tag creado
- [x] Auditoría documentada
- [x] Fase 1 completada (6 cambios)
- [x] Cambios versionados en git
- [ ] Fase 2 (Mañana)
- [ ] Fase 3 (Próxima semana)

---

**Próximo paso:** Cuando estés listo, comenzar Fase 2 (CSP + config Firebase)
