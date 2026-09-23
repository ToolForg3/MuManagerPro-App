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
  - ✅ **EXCEPCIÓN CÍRCULOS FUNCIONALES**: Se permite `borderRadius = width/2` **exclusivamente** cuando el elemento es un círculo perfecto (`width === height`) destinado a contener un ícono, avatar o portrait de imagen. Debe documentarse con el comentario `/* círculo funcional (width/2): descripción */` directamente en el StyleSheet o inline style.

## 2. EMULADORES Y COMPATIBILIDAD SQL
- **Louis S6 Intacto**: Es la referencia principal; ninguna consulta debe alterar ni romper Louis.
- **Compatibilidad Dual Louis & MSPro**: Consultas dinámicas (`sp_executesql`, `COL_LENGTH`, `OBJECT_ID`) ante columnas de MSPro (`RuudToken`, `ExtWarehouse`). Cero `ALTER TABLE` o fallos por Msg 207 / Msg 911.

## 3. PROTOCOLO DE LANZAMIENTO (6 ARCHIVOS OBLIGATORIOS Y COMPILACIÓN NATIVA)
Toda subida de versión debe sincronizar simultáneamente:
1. `package.json`
2. `src/constants/appVersion.ts`
3. `app.json`
4. `android/app/build.gradle`
5. `version.json`
6. `data/settings.json` y `server/data/settings.json`
- **Compilación Gradle Obligatoria**: Jamás publicar sin compilar previamente el APK (`gradlew assembleRelease`). El pipeline `release-update.js` inspecciona obligatoriamente con `aapt.exe` que `versionCode` y `versionName` del APK coincidan exactamente con `version.json`; si no coinciden, compila de forma automática antes de cualquier sincronización o push a Git.
- **Política de Actualizaciones Forzadas (`forceUpdate`)**: `forceUpdate` debe mantenerse en `false` en `version.json` y `settings.json` para parches y releases menores, garantizando que el usuario disponga del botón "Recordarme más tarde" y no quede bloqueado. Solo se permite `forceUpdate = true` ante incidentes de integridad crítica, rollbacks de emergencia o roturas de esquema SQL incompatibles.

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
  - `authRateLimitMiddleware` mandatorio en **todos** los endpoints `/api/auth/*`, incluyendo: login, registro, reenvíos, recuperación, verificación de OTP (`/verify-code`, `/verify-registration`) y restablecimiento de contraseña.
  - Toda mutación o consulta SQL en el conector debe estar registrada en `_sqlPaths` para bloquear accesos no autorizados o cuentas DEMO.
  - **Política de contraseña mínima de 8 caracteres** aplicable a TODAS las operaciones: registro, cambio de contraseña y restablecimiento por OTP. Sin excepciones de ruta.
- **WAF y Endurecimiento de Pasarela Web**:
  - Cabeceras HTTP de nivel bancario obligatorias en todas las respuestas: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` (en producción), y `Referrer-Policy: strict-origin-when-cross-origin`.
  - **Honeypot Anti-Scanners**: Baneo automático de IP (24 horas) ante peticiones dirigidas a rutas trampa (`/.env`, `/wp-admin`, `/phpmyadmin`, `/.git`, etc.).
  - **Filtro Anti-Bots**: Bloqueo automático de herramientas de penetración (`sqlmap`, `nikto`, `masscan`, etc.) por User-Agent.
  - **Límite de Payload DoS**: `express.json` limitado a un máximo de `2mb` para prevenir agotamiento de memoria RAM.

## 6. RED E IDEMPOTENCIA TRANSACCIONAL (SQL CLIENT)
- **Cero Reintentos en Mutaciones de Estado**: `sendSecureRequest()` en `sqlClient.ts` debe forzar `maxRetries = 0` ante timeouts o fallos de red en rutas de mutación (`/create`, `/delete`, `/inject`, `/save`, `/purge`, `/update`, `/toggle`, `/reset`, `/clear`) para prevenir duplicación de registros o inconsistencias en base de datos.

## 7. POLÍTICA DE PERMISOS NATIVOS Y RED ANDROID
- **Mínimo Privilegio**: `AndroidManifest.xml` solo debe declarar los permisos esenciales (`INTERNET`, `ACCESS_NETWORK_STATE`, `VIBRATE`, almacenamiento si aplica).
- ❌ **Prohibido `SYSTEM_ALERT_WINDOW`** u otros permisos intrusivos de depuración en compilaciones de producción.
- ✅ **EXCEPCIÓN DEBUG**: El manifest `android/app/src/debug/AndroidManifest.xml` puede contener `SYSTEM_ALERT_WINDOW` para el Fast Refresh overlay de Expo. Este permiso **no se propaga** a compilaciones release.
- **Certificate Pinning y Blindaje Anti-MITM**:
  - `network_security_config.xml` debe restringir los trust-anchors a `<certificates src="system" />`. Prohibido estrictamente `<certificates src="user" />` para impedir la intercepción con proxies (Burp Suite, Charles Proxy, Fiddler).
  - El pinning de certificados debe implementarse exclusivamente sobre **Autoridades Raíz (Root CAs)** oficiales (ej. `ISRG Root X1`, `DigiCert`), nunca sobre certificados de hoja efímeros para prevenir fallos por renovación automática de certificados SSL en la nube.
  - Preservar excepciones de texto plano (`cleartextTrafficPermitted="true"`) exclusivamente para desarrollo local y emuladores (`localhost`, `10.0.2.2`, `127.0.0.1`).

## 8. INTEGRIDAD ATÓMICA DE DATOS Y PRIVACIDAD EN GIT
- Toda escritura de configuración o datos debe usar `safeAtomicWriteJson(filePath, data)` recibiendo obligatoriamente los dos parámetros para evitar excepciones `TypeError` o archivos corruptos.
- Ningún archivo `.json` de datos con información real de usuarios (`users.json`), telemetría (`devices.json`) o solicitudes (`proRequests.json`) debe incluirse en commits de Git ni en repositorios públicos.

## 9. POLÍTICA DE DEMO, REGISTRO Y PRESERVACIÓN PERMANENTE DE USUARIOS (ZERO PURGAS)
- **Acceso Rápido Demo (10 Minutos por Dispositivo)**:
  - El botón "Acceso Rápido Demo" otorga exploración temporal inmediata de 10 minutos sin requerir registro previo.
  - **Bloqueo estricto a 1 único uso por dispositivo físico (`HWID`)**: El servidor registra `quickDemoStartedAt`, `quickDemoExpiresAt` y `quickDemoUsed: true`. Al expirar o reintentar, se bloquea con HTTP 403 `QUICK_DEMO_EXPIRED` exigiendo registrar una cuenta.
- **Período de Prueba de Cuenta Registrada (72 Horas)**:
  - Todo usuario que complete su registro dispone de 72 horas continuas de prueba (`settings.demoDurationHours = 72`).
- **Preservación Absoluta de Cuentas (`users.json` Inviolable)**:
  - ❌ **TERMINANTEMENTE PROHIBIDO purgar, vaciar o eliminar cuentas de usuario registradas** (`users.json` o Upstash Redis `mumanager:users`) tras la expiración de un demo, reinicio del servidor o sincronizaciones.
  - Banderas de purga automática masiva (como `usersPurgedV168`) quedan permanentemente abolidas. Las cuentas registradas persisten de por vida salvo eliminación manual y deliberada por el administrador mediante `DELETE /api/admin/users/:username`.
- **Blindaje de Credenciales Locales en Cierre de Sesión Demo (`logoutDemo`)**:
  - Al cerrar sesión o expirar el modo Demo / Acceso Rápido, el cliente debe invocar obligatoriamente `logoutDemo()`.
  - ❌ **Prohibido usar `logout(true)` en flujos demo**: Las credenciales saladas de la cuenta real guardadas en `SecureStorage` (`@mumanager_auth_pwhash`, `@mumanager_auth_user_saved`) deben conservarse intactas en el teléfono para que el usuario inicie sesión en su cuenta registrada sin volver a escribir su contraseña.

## 10. SOLICITUDES DE LICENCIA PRO Y TELEMETRÍA FORENSE ANTI-ABUSO
- **Protocolo de Solicitud de Licencia PRO (`/api/license/request-pro`)**:
  - Tanto la pasarela como el conector deben disponer del endpoint `POST /api/license/request-pro`.
  - La solicitud se vincula irrevocablemente al `HWID` y a la telemetría del dispositivo en `data/proRequests.json` (y Upstash Redis), evitando peticiones duplicadas y registrando contacto (WhatsApp, email) y motivo del usuario para auditoría del administrador.
- **Telemetría Forense y Detección de Dispositivos**:
  - Toda interacción con la pasarela o modo demo captura y audita: `hwid`, `deviceBrand`, `deviceModel`, `isEmulator`, `clientIp` y `lastActiveAt`.
  - **Bloqueo de Mutaciones SQL en Modo Demo**: Toda operación de inserción, edición o borrado SQL en modo demo se rechaza de inmediato con HTTP 403 `FUNCION_RESTRINGIDA_PRO`.
  - **WAF y Anti-Explotación**: Intentos deliberados de burlar restricciones demo o inyecciones maliciosas disparan baneo de IP por 24 horas y registro de auditoría en `securityLogs.json`.
