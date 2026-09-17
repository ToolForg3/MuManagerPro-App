# MU MANAGER PRO - REGLAS PERMANENTES DE DESARROLLO

## 1. SISTEMA DE DISEÑO (SEASON 6 PIEDRA & ORO)
- **Tema Visual**: Medieval Fantasía Clásica Season 6 (Piedra y Oro).
- **Contraste de Texto Obligatorio (WCAG AAA > 7:1)**:
  - Textos principales y títulos: `THEME.colors.texto` (`#FAF6EE`, 14.2:1).
  - Etiquetas, subtítulos y modales: `THEME.colors.textoSecundario` (`#C8BEAF`, 9.8:1).
  - Placeholders y controles inactivos: `THEME.colors.textMuted` (`#B8AEA0`, 8.5:1).
  - Acentos numéricos dorados: `THEME.colors.oroClaro` (`#E8C86A`) o `THEME.colors.textGold` (`#F0D27A`).
- **Colores Prohibidos**:
  - ❌ **NO morados / púrpuras** (`#BA68C8`, `#9C27B0`, `#7B1FA2`).
  - ❌ **NO cyan neón** (`#00E5FF`, `#00F0FF`) salvo Arcano Season 6 `#5B8DEF`.
  - ❌ **NO verdes lima/fluorescentes** (`#00C853`, `#00E676`). Usar siempre Jade Season 6 (`#3FCF8E`).
  - ❌ **NO grises oscuros o apagados para texto**: `#666`, `#777`, `#888`, `#999`, `#AAA`, `#BBB`, `#CCC`, `#DDD`, `#9C9182`.
  - ❌ **NO bordes circulares inflados** (`borderRadius: 20+`). Usar siempre estándar gótico `borderRadius: 6`.

## 2. EMULADORES Y COMPATIBILIDAD SQL
- **Louis S6 Intacto**: Es la referencia principal; ninguna consulta debe alterar ni romper Louis.
- **Compatibilidad Dual Louis & MSPro**: Consultas dinámicas (`sp_executesql`, `COL_LENGTH`, `OBJECT_ID`) ante columnas de MSPro (`RuudToken`, `ExtWarehouse`). Cero `ALTER TABLE` o fallos por Msg 207 / Msg 911.

## 3. PROTOCOLO DE LANZAMIENTO (6 ARCHIVOS OBLIGATORIOS)
Toda subida de versión debe sincronizar simultáneamente:
1. `package.json`
2. `src/constants/appVersion.ts`
3. `app.json`
4. `android/app/build.gradle`
5. `version.json`
6. `data/settings.json` y `server/data/settings.json`

## 4. VERIFICACIONES PREVIAS OBLIGATORIAS
- `npm run ts:check` (0 errores)
- `npm test` (100% pruebas unitarias pasando)
- Cero ocurrencias de colores prohibidos o textos de bajo contraste en `src/`.

## 5. SEGURIDAD Y BLINDAJE DE CREDENCIALES (OWASP MOBILE & BACKEND)
- **Cero Contraseñas en Texto Plano**: Prohibido guardar contraseñas en claro en `AsyncStorage` (ej. `@mumanager_auth_password`). Las credenciales u hashes locales para modo offline deben residir exclusivamente en `SecureStorage` (AES-256-CBC + HMAC) con hash PBKDF2/SHA-256 salado.
- **Protección de OTPs y Secretos en Producción**:
  - `devCode` prohibido en respuestas JSON si `process.env.NODE_ENV === 'production'`.
  - Códigos OTP de recuperación deben enmascararse (`[ ****** ]`) antes de registrarse en auditorías o logs.
  - El conector local debe persistir sus sales y claves en `data/connector-secrets.json` (cero regeneración aleatoria por reinicio).
- **Protección de Rutas y Rate Limiting**:
  - `authRateLimitMiddleware` mandatorio en todo endpoint `/api/auth/*` (login, registro, reenvíos, recuperación).
  - Toda mutación o consulta SQL en el conector debe estar registrada en `_sqlPaths` para bloquear accesos no autorizados o cuentas DEMO.
  - Contraseñas de registro con política estricta de longitud mínima de 8 caracteres.

## 6. RED E IDEMPOTENCIA TRANSACCIONAL (SQL CLIENT)
- **Cero Reintentos en Mutaciones de Estado**: `sendSecureRequest()` en `sqlClient.ts` debe forzar `maxRetries = 0` ante timeouts o fallos de red en rutas de mutación (`/create`, `/delete`, `/inject`, `/save`, `/purge`, `/update`, `/toggle`, `/reset`, `/clear`) para prevenir duplicación de registros o inconsistencias en base de datos.

## 7. POLÍTICA DE PERMISOS NATIVOS ANDROID
- **Mínimo Privilegio**: `AndroidManifest.xml` solo debe declarar los permisos esenciales (`INTERNET`, `ACCESS_NETWORK_STATE`, `VIBRATE`, almacenamiento si aplica).
- ❌ **Prohibido `SYSTEM_ALERT_WINDOW`** u otros permisos intrusivos de depuración en compilaciones de producción.

## 8. INTEGRIDAD ATÓMICA DE DATOS Y PRIVACIDAD EN GIT
- Toda escritura de configuración o datos debe usar `safeAtomicWriteJson(filePath, data)` recibiendo obligatoriamente los dos parámetros para evitar excepciones `TypeError` o archivos corruptos.
- Ningún archivo `.json` de datos con información real de usuarios (`users.json`), telemetría (`devices.json`) o solicitudes (`proRequests.json`) debe incluirse en commits de Git ni en repositorios públicos.
