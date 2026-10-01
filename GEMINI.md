# MU MANAGER PRO - REGLAS PERMANENTES DE DESARROLLO
> **NOTA DE AUTORIDAD NORMATIVA**:
> La **fuente canónica maestra y única verdad (Single Source of Truth)** del proyecto es [`PROJECT_RULES.md`](file:///c:/Users/Cris/Desktop/APK%20Editor%20MU/PROJECT_RULES.md).
> Este documento (`GEMINI.md`) actúa como directriz operativa para el agente y debe interpretarse siempre en estricta consonancia con `PROJECT_RULES.md`.

## 1. SISTEMA DE DISEÑO OFICIAL: STITCH APPROVED IRONFORGE

Antigravity debe leer [`DESIGN.md`](./DESIGN.md) completo antes de modificar estilos. Es la única autoridad visual y deriva de las ocho pantallas aprobadas del proyecto Stitch `348688986963428015`.

- Al comenzar o reanudar una migración visual, descartar instrucciones visuales cacheadas de sesiones anteriores y recargar `PROJECT_RULES.md`, `DESIGN.md` y esta sección antes de editar.
- Una ejecución iniciada con las reglas antiguas debe detener su plan visual y reevaluar los archivos ya modificados contra `DESIGN.md`; no continuar por inercia.
- Ignorar reglas visuales históricas contenidas en respaldos, prompts, auditorías y comentarios.
- Usar el ZIP y `Codigo.txt` identificados en `DESIGN.md` como evidencia local del diseño aprobado.
- `04 Biblioteca MU V2` es exclusivamente un sistema visual; nunca crear una ruta, pestaña o función para esa biblioteca.
- Traducir las referencias HTML a componentes React Native reutilizables; nunca incrustar HTML ni sustituir la aplicación por capturas.
- Conservar todos los controles, rutas, parámetros, handlers, validaciones, permisos, estados, datos y navegación.
- Trabajar una pantalla o primitiva compartida por vez y cerrar los inventarios antes/después.
- El diseño oficial Stitch Approved Ironforge se implementa directamente en la APK general (`com.mumanager.pro`), aboliendo versiones o bifurcaciones de test. No publicar, desplegar, hacer push ni cambiar versión sin autorización explícita y directa.
- ❌ **Prohibición Total de Bordes Lisos/Planos**: Cero bordes rectos de un solo color CSS sin relieve. Toda superficie, botón, slot, celda, tarjeta e input debe contar con biseles chiseled multidireccionales (relieve 3D con luz en borde superior/izquierdo y sombra en inferior/derecho, o ranura hundida inversa) o texturas oficiales del cliente MU.
- ❌ **Cero Sobreposiciones de Botones**: Prohibido sobreponer pestañas flotantes (`cornerTabLeft`, `cornerTabRight`) o marcos artificiales sobre sprites o texturas nativas de MU (`btn_small.png`, `btn_big.png`, etc.). Deben renderizarse limpios y originales según su diseño.
- 🎮 **Texturas Nativas Obligatorias en Botones, Pestañas, Modales y Selectores (100% Cobertura)**:
  - **Pestañas y Subnavegadores**: Renderizado mandatorio con texturas nativas de MU (`STITCH_ASSETS.tabs.tabModeActive` para activo y `tabModeInactive` para inactivo). Cero cajas lisas de CSS o amarillos planos.
  - **Botones de Acción, Modales y Cabeceras**: Botones de tarjetas, modales y cabeceras (`Detalle`, `Baúl`, `Bloquear`, `Eliminar`, `Nuevo PJ/Cuenta`, `SYNC`, `BORRAR`, `OK`, `MOVER`, `EDITAR`, `COPIAR HWID`, `WHATSAPP`, `TELEGRAM`, `DESCARGAR E INSTALAR`, `ACTIVAR PRO`, etc.) deben lucir con texturas metálicas nativas de MU (`btn_small.png`, `btn_medium.png`, `btn_big.png`, `tab_mode_active.png`, `tab_mode_inactive.png` vía `MuButton` o `ImageBackground`). Cero cajas planas de 1px.
  - **Steppers, Filtros y Botones Rápidos**: Todo selector de nivel/opción (`-`, `+`, `MAX`), botón de incremento (`+1000`, `+5000`), chip de filtro (raza, categoría, estado), switch de opciones (Luck, Skill, Exc, 380), catálogo de sets rápidos (`QUICK_SETS_CATALOG`), enlaces inter-módulos y presets de premios debe renderizarse con texturas nativas de MU (`tabModeActive`/`tabModeInactive` vía `ImageBackground` o `MuButton`), erradicando botones rectangulares planos con `borderWidth: 1`.
  - **Contenedores Táctiles Anti-Sangrado**: Todo `TouchableOpacity` que aloje una textura nativa `ImageBackground` debe declarar explícitamente `borderRadius: 2, overflow: 'hidden'` para garantizar un recorte perfecto en Android y evitar sangrados de textura en esquinas biseladas.
  - 🚫 **Prohibición de Alturas Porcentuales en Touchables No Acotados (Anti-Estiramiento Yoga)**: Queda terminantemente prohibido utilizar `height: '100%'` en un `ImageBackground` o `View` cuando su `TouchableOpacity` padre carece de altura rígida (por ejemplo, con solo `minHeight: 34` o sin altura acotada). En el motor de maquetación Yoga de React Native, una altura porcentual en un contenedor flexible se evalúa contra el viewport completo, estirando los botones verticalmente hasta abarcar el 100% de la pantalla. Todo botón o selector con textura debe declarar una altura numérica explícita fija en dp (`height: 32`, `height: 36`, `height: 40`, `height: 44`).
  - 🏛️ **Estiramiento Completo Borde a Borde en Zócalos Góticos (`gothicBottomFooter`)**: Todo zócalo o marco inferior gótico (`STITCH_ASSETS.decorations.gothicBottomFooter`) debe renderizarse obligatoriamente con `resizeMode="stretch"` y `width: '100%'` (o acotado al ancho de su tarjeta/modal). Prohibido utilizar `resizeMode="contain"` en pies de modales o pantallas, ya que la relación de aspecto 190x45 colapsa la imagen a una franja angosta central (~135-180 px), dejando los extremos del borde vacíos.
  - 📏 **Blindaje de Encabezados Compactos Anti-Aplastamiento**: En cabeceras ricas (ej. `CharacterEditScreen`), los botones de acción (`VOLVER`, `SYNC`, `BORRAR`) deben tener anchos y alturas fijas compactas (`width: 68`, `altura: 34`, `flexShrink: 0`). El área de título central debe declarar `flex: 1`, `minWidth: 80`, `numberOfLines={1}` y `ellipsizeMode="tail"` con `flexWrap: 'nowrap'` para evitar el aplastamiento horizontal a pocos píxeles y el envoltura vertical de badges.
- 🔆 **Estándar de Contraste Tipográfico y Nitidez Canónica (WCAG AAA)**:
  - **Pestañas y Botones Activos (`tabModeActive`, `btn_*.png`)**: El texto e iconos deben renderizarse obligatoriamente en oro radiante `#FEDF99` o `#EFD28D` con `fontWeight: '900'` y sombra profunda (`...THEME.effects.textShadowHigh` o `textShadowSubtle`), garantizando contraste óptico nítido superior a 12:1 sobre el fondo de piedra oscura de la textura. ❌ **Cero texto negro u oscuro (`#0D0E0D`, `#252625`) sobre texturas nativas**.
  - **Pestañas Inactivas (`tabModeInactive`)**: El texto e iconos deben renderizarse en plata/acero gótico `#CDC6B9` o `#A8A296` con `fontWeight: '700'`.
  - **Sombra Tipográfica Profunda para Máxima Nitidez**: Todo texto principal, título, métrica, etiqueta de pestaña y cabecera de tarjeta sobre fondos oscuros o texturas metálicas debe aplicar sombra tipográfica profunda (`textShadowColor: 'rgba(0, 0, 0, 0.95)'`, `textShadowOffset: { width: 1, height: 1 }`, `textShadowRadius: 2` o `THEME.effects.textShadowHigh`), asegurando legibilidad nítida y separación cristalina respecto al fondo texturizado.
  - **Contraste de Textos Secundarios y Subtítulos**: Prohibido el uso de grises oscuros o atenuados que se confundan con el fondo de piedra. Los textos secundarios deben mantener un tono acero/plata claro mínimo (`#C8C0B0` o `#D4CDBC`) con contraste óptico superior a 4.5:1.
  - **Superficies de Alerta Doradas Sólidas (CSS plano excepcional)**: Si se usa un fondo sólido amarillo oro `#EFD28D`, el texto usa `#0D0E0D` gótico oscuro. Sobre cualquier textura nativa de MU, el texto siempre es oro radiante o plata clara.
- 🖼️ **Erradicación de Bordes Blancos/Matte en Sprites e Iconos**: Todo sprite, icono o textura recortada (incluyendo `tab_ajustes.png`, `ajustes_clean.png`, engranajes, joyas, alas, armas y armaduras) debe poseer transparencia alfa 100% limpia sin bordes blancos accidentales, halos de compresión ni marcos o fondos tipo "matte" derivados de software de diseño gráfico.
- 🚫 **Abolición del Botón de Soporte de WhatsApp en el APK Móvil**: Queda terminantemente abolido el botón o enlace flotante de soporte de WhatsApp en las pantallas del APK móvil (ej. `ConfigScreen.tsx`). La asistencia y comunidad para los usuarios se canaliza con exclusividad a través de los canales oficiales de **Discord** (`https://discord.gg/4YXguuBFV` o `/discord`) y **Telegram** (`https://t.me/ToolForg3` o `/telegram`).
- 🛡️ **Depuración Completa del Diseño Antiguo e Integración de Texturas Nativas**: Todo módulo de la app móvil (stats, barras de progreso, catálogo de skills, cuadrículas de inventario, baúl/almacén [vault], creador de objetos, modales de seguridad/bloqueo, banners de watermark y pestañas de herramientas) debe utilizar acabados metálicos y texturas nativas de MU, erradicando fondos planos, paletas genéricas o colores desincronizados de IA.
- 📱 **Adaptabilidad Multi-Resolución y Legibilidad**: Todo componente debe adaptarse dinámicamente a diferentes densidades y anchos de pantalla sin desbordes horizontales, manteniendo una jerarquía tipográfica legible (alto contraste con `...THEME.effects.textShadow` o `textShadowSubtle` sobre superficies oscuras) y un espaciado limpio sin ruido visual.
- Si una decisión visual no está definida, detenerse y reportarla; no revivir el diseño anterior ni inventar una nueva estética.

## 2. EMULADORES Y COMPATIBILIDAD SQL
- **Louis S6 Intacto**: Es la referencia principal; ninguna consulta debe alterar ni romper Louis.
- **Compatibilidad Dual Louis & MSPro**: Consultas dinámicas (`sp_executesql`, `COL_LENGTH`, `OBJECT_ID`) ante columnas de MSPro (`RuudToken`, `ExtWarehouse`). Cero `ALTER TABLE` o fallos por Msg 207 / Msg 911.
- ❌ **Prohibición de DDL en Caliente**: Cero `ALTER TABLE`, `DROP`, `TRUNCATE` en tiempo de ejecución.
- ❌ **Cero Pruebas sobre Datos o Servicios Productivos**: Queda terminantemente prohibido ejecutar pruebas automatizadas o tests destructivos contra bases de datos o servicios en producción.

## 3. PROTOCOLO DE LANZAMIENTO Y AUTORIZACIÓN EXPLÍCITA
Toda subida de versión debe sincronizar simultáneamente los 6 archivos:
1. `package.json`
2. `src/constants/appVersion.ts`
3. `app.json`
4. `android/app/build.gradle`
5. `version.json`
6. `data/settings.json` y `server/data/settings.json`
- ⚠️ **CONDICIÓN INELUDIBLE DE AUTORIZACIÓN EXPLÍCITA DEL USUARIO**:
  - Queda **TERMINANTEMENTE PROHIBIDO** ejecutar `node scripts/release-update.js`, realizar `git push`, desplegar a producción (Vercel/servidores) o sincronizar repositorios hermanos (`MuManagerPro-App`, `MuManagerPro-Gateway`) sin una orden explícita, directa e inequívoca del usuario en el turno actual ("publica", "despliega", "haz push", "lanza la actualización").
  - Preparar una versión, compilar binarios o ejecutar tests **NO constituye autorización para publicar**.
- **Bloqueo Incondicional de Publicación**: Si existen defectos comprobados de severidad Crítica o Alta en seguridad, integridad de datos o flujos esenciales, queda estrictamente bloqueada cualquier recomendación o ejecución de publicación.
- **Compilación Gradle Obligatoria**: Jamás publicar sin compilar previamente el APK (`gradlew assembleRelease`). El pipeline `release-update.js` inspecciona obligatoriamente con `aapt.exe` que `versionCode` y `versionName` del APK coincidan exactamente con `version.json`.
- **Política de Actualizaciones Forzadas (`forceUpdate`)**: `forceUpdate` debe mantenerse en `false` en `version.json` y `settings.json` para parches y releases menores. Solo se permite `forceUpdate = true` ante incidentes de integridad crítica, rollbacks de emergencia o roturas de esquema SQL incompatibles.
- **Política Mandatoria de Incremento de Versión/Build para Entrega OTA**:
  - El mecanismo OTA (`isNewerVersion(targetVer, currentVer)` en backend y `fetchGitHubUpdateFallback()` en cliente) evalúa `remoteVer > localVer || (remoteVer === localVer && remoteBuild > localBuild)`.
  - Queda **estrictamente prohibido** publicar parches o compilaciones para usuarios conservando la versión y build anteriores. Si coinciden con la versión instalada en el dispositivo, resolverá `hasUpdate: false` y **los celulares jamás recibirán el diálogo de actualización**.
  - Todo cambio funcional/visual a distribuir exige incrementar versión (patch) o build en los 6 archivos simultáneamente y actualizar Upstash Redis (`update-settings`).

## 4. VERIFICACIONES PREVIAS Y MEDICIONES DE RENDIMIENTO
- `npm run ts:check` (0 errores de tipado).
- `npm run check:contrast` como verificador técnico; `DESIGN.md` conserva la autoridad sobre la nueva paleta.
- `npm test` (100% pruebas unitarias y de seguridad pasando).
- **Distinción Rigurosa de Rendimiento**: Al evaluar tiempos o latencias, diferenciar taxativamente entre benchmarks sintéticos locales en memoria y métricas de desempeño reales en producción (latencia de red, cold starts, contención de pool SQL).
- Cero combinaciones de bajo contraste conforme a WCAG AA y a los roles definidos en `DESIGN.md`.

## 5. SEGURIDAD, CRIPTOGRAFÍA Y BLINDAJE DE CREDENCIALES (OWASP MOBILE & BACKEND)
- **Cero Contraseñas en Texto Plano**: Prohibido guardar contraseñas en claro en `AsyncStorage` (ej. `@mumanager_auth_password`). Las credenciales u hashes locales para modo offline deben residir exclusivamente en `SecureStorage` (AES-256-CBC + HMAC) con hash PBKDF2/SHA-256 salado.
- **Autoridad Exclusiva del Servidor sobre Secretos**:
  - El secreto `MASTER_SECURITY_SALT` y los secretos JWT residen **exclusivamente en variables de entorno del servidor** (`process.env.MASTER_SECURITY_SALT`, `process.env.JWT_SECRET`).
  - ❌ **Prohibición de Distribuir Secretos en Cliente**: Queda terminantemente prohibido incluir o exigir salts o secretos en el APK móvil mediante ofuscación XOR (la ofuscación en binarios cliente no protege un secreto distribuido). La validación criptográfica y autorización es potestad exclusiva del servidor.
- **Firma Android y compilación local sin fugas**:
  - ❌ Prohibido guardar `mumanager-release.keystore`, contraseñas de firma o alias privados en `gradle.properties`, `.env`, código, scripts, documentos, respaldos o Git.
  - ✅ Gradle release debe consumir exclusivamente `RELEASE_STORE_FILE`, `RELEASE_STORE_PASSWORD`, `RELEASE_KEY_ALIAS` y `RELEASE_KEY_PASSWORD` del entorno seguro de compilación; si falta una, debe abortar sin fallback a debug.
  - 🔒 `ADMIN_KEY`, JWT, SMTP y sales pertenecen al backend/Vercel. Vercel no inyecta automáticamente secretos en Gradle local; no afirmarlo sin comprobación autorizada en su dashboard.
  - 🔒 Un secreto encontrado en claro bloquea cualquier publicación y exige revocación/rotación por infraestructura. Nunca imprimir, copiar ni conservar el valor.
  - 🔒 Antes de entregar un APK: verificar firma, `debuggable=false`, R8/ProGuard, ausencia de `.env`/source maps/secretos en el ZIP y realizar prueba física. La ofuscación JS y nativa solo dificulta la ingeniería inversa; nunca garantiza que un APK sea imposible de descompilar.
- **Protección de OTPs y Secretos en Producción**:
  - `devCode` prohibido en respuestas JSON si `process.env.NODE_ENV === 'production'`.
  - Códigos OTP de recuperación deben enmascararse (`[ ****** ]`) antes de registrarse en auditorías o logs.
  - El conector local debe persistir sus sales y claves en `data/connector-secrets.json` (cero regeneración aleatoria por reinicio).
- **Protección de Rutas, Default-Deny y Revocación Efectiva**:
  - **Denegación por Defecto (Default-Deny)**: Ante cualquier estado ambiguo o token no validado, la respuesta predeterminada es denegar acceso (HTTP 401/403).
  - **Vinculación Estricta Token/HWID**: Todo token debe validar coincidencia estricta con el HWID del dispositivo emisor (`token.hwid === req.body.hwid`); discrepancias resultan en HTTP 403 `HWID_MISMATCH`.
  - **Revocación Inmediata**: El incremento de `sessionVersion` o bloqueo de usuario invalida al instante todos los tokens activos.
  - `authRateLimitMiddleware` mandatorio en **todos** los endpoints `/api/auth/*` (login, registro, reenvíos, recuperación, verificación y reset).
  - Toda mutación o consulta SQL en el conector debe estar registrada en `_sqlPaths` para bloquear accesos no autorizados o cuentas DEMO.
  - **Política de contraseña mínima de 8 caracteres** aplicable a TODAS las operaciones: registro, cambio de contraseña y restablecimiento por OTP.
- **WAF y Endurecimiento de Pasarela Web**:
  - Cabeceras HTTP bancarias obligatorias: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`, `Referrer-Policy: strict-origin-when-cross-origin`.
  - **Honeypot Anti-Scanners**: Baneo automático de IP (24 horas) ante peticiones a rutas trampa (`/.env`, `/wp-admin`, `/phpmyadmin`, `/.git`).
  - **Filtro Anti-Bots**: Bloqueo automático de herramientas de intrusión (`sqlmap`, `nikto`, `masscan`, etc.) por User-Agent.
  - **Límite de Payload DoS**: `express.json` limitado a un máximo de `2mb`.

## 6. RED, CONCURRENCIA E IDEMPOTENCIA TRANSACCIONAL (SQL CLIENT & BACKEND)
- **Cero Reintentos en Mutaciones de Estado**: `sendSecureRequest()` en `sqlClient.ts` debe forzar `maxRetries = 0` ante timeouts o fallos de red en rutas de mutación (`/create`, `/delete`, `/inject`, `/save`, `/purge`, `/update`, `/toggle`, `/reset`, `/clear`) para prevenir duplicación transaccional.
- **Gestión Estricta de Idempotencia**:
  - Máquina de estados `PENDING` -> `COMPLETED`.
  - Aislamiento de ámbito estricto: clave vinculada a `(user, path, bodyHash)`.
  - Políticas de capacidad en memoria con límites que **jamás desalojen claves en estado `PENDING`** (operaciones en vuelo).
  - Tolerancia a concurrencia elevada con bloqueos atómicos de exclusión mutua.

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

## 10. LICENCIAMIENTO, SOLICITUDES PRO Y TELEMETRÍA FORENSE ANTI-ABUSO
- **Autoridad Absoluta del Servidor sobre Licencias**:
  - La condición `PRO` y sus permisos dependen exclusivamente de la autorización registrada en el servidor (Upstash Redis / `devices.json`).
  - ❌ **Prohibición Total de Autoactivación por el Cliente**: Una clave matemáticamente válida enviada por el cliente (`verifyKey`) en `/api/telemetry/ping` **JAMÁS concede modo PRO ni desactiva el modo demo**. El servidor rechaza o limpia (`forceWipeKey: true`) cualquier clave no asignada formalmente por el administrador.
- **Protocolo de Solicitud de Licencia PRO (`/api/license/request-pro`)**:
  - Tanto la pasarela como el conector deben disponer del endpoint `POST /api/license/request-pro`.
  - La solicitud se vincula irrevocablemente al `HWID` y a la telemetría del dispositivo en `data/proRequests.json` (y Upstash Redis), evitando peticiones duplicadas y registrando contacto (WhatsApp, email) y motivo del usuario para auditoría del administrador.
- **Telemetría Forense y Detección de Dispositivos**:
  - Toda interacción con la pasarela o modo demo captura y audita: `hwid`, `deviceBrand`, `deviceModel`, `isEmulator`, `clientIp` y `lastActiveAt`.
  - **Bloqueo de Mutaciones SQL en Modo Demo**: Toda operación de inserción, edición o borrado SQL en modo demo se rechaza de inmediato con HTTP 403 `FUNCION_RESTRINGIDA_PRO`.
  - **WAF y Anti-Explotación**: Intentos deliberados de burlar restricciones demo o inyecciones maliciosas disparan baneo de IP por 24 horas y registro de auditoría en `securityLogs.json`.
- **Diferenciación Estricta entre Expiración y Bloqueo (Zero Auto-Bloqueos por Vencimiento)**:
  - ❌ **Prohibición de Auto-Bloqueo**: Al concluir un período PRO o Demo, el sistema **JAMÁS debe mutar `dev.blocked = true`** automáticamente. El bloqueo es potestad manual y deliberada exclusiva del Administrador (Kill-Switch).
  - Los dispositivos expirados se registran con `expiresAt < now`, `isDeviceExpired: true` y `expireReason: 'expired'`.
  - El Panel Web (`adminDashboard.html`) los agrupa en la tarjeta KPI `metric-expired` ("Vencidos (Renovación)"), usa badges ámbar (`PRO`) y naranja (`TEST`), habilita la subtab `⏳ Vencidos` y preserva el botón `⛔ Bloquear` en su fila para control discrecional.
- **Flujo de Pantalla de Login ante Expiración y Solicitud de Renovación**:
  - Al vencerse la vigencia, el cliente móvil permanece en la pantalla de `Login` (sin pantalla roja de bloqueo de hardware).
  - Al autenticar una cuenta en un equipo vencido, el backend responde con HTTP 403 `LICENCIA_EXPIRADA`.
  - La UI presenta una alerta informativa con el botón táctil interactivo **`⭐ Solicitar PRO / Extra Demo`** (que abre el modal nativo para enviar WhatsApp/correo al panel) y el botón `Entendido`.
- **Estándar Cronométrico Universal UTC y Extensión Acumulativa**:
  - Todas las marcas de expiración y comparaciones se realizan en ISO 8601 UTC y milisegundos universales (`Date.now()`), evitando desajustes por zonas horarias del teléfono.
  - La adición de tiempo (`extend-demo`) se calcula acumulativamente: `baseTime = Math.max(Date.now(), currentExpires) + addMs`.

## 11. PRINCIPIOS DE INGENIERÍA, CONTROL DE CALIDAD Y GESTIÓN DE CAMBIOS
- **Cambios Pequeños, Reversibles y con Base Identificada**: Toda modificación debe ser atómica y delimitar línea base (hashes/archivos), limitaciones y procedimiento de reversión (*rollback*).
- **Ciclo de Corrección de Defectos**:
  - *Antes*: Reproducción o aislamiento previo del fallo.
  - *Después*: Pruebas de comportamiento (*behavioral assertions*) que certifiquen dinámicamente la resolución.
- **Pruebas sobre Código Real y Separación de Fallos de Entorno**: Ejecución sobre componentes y módulos reales (sin mocks irreales de lógica central), distinguiendo fallos de entorno de fallos de lógica.
- **Auditoría E2E del Panel Administrativo**: Verificación integral de las 5 fases: Acción ➔ Autorización ➔ Persistencia ➔ Respuesta ➔ Estado Visible.
- **Clasificación Explícita de Hallazgos**: Todo reporte de pruebas y auditoría debe categorizarse en `PASS`, `FAIL` o `NO VERIFICADO`.
- **Bloqueo de Publicación ante Defectos Críticos o Altos**: Prohibición terminante de recomendar o ejecutar lanzamientos ante fallos comprobados de severidad Crítica o Alta.
- **Prohibición de Declarar Seguridad Total**: Prohibido taxativamente asegurar o certificar "100% de seguridad" o "cero vulnerabilidades" basándose exclusivamente en pruebas automáticas.

## 12. MINIMIZACIÓN DE SUPERFICIE, PRIVACIDAD Y TRANSPARENCIA TÉCNICA
- **Estándar Criptográfico de Almacenamiento Local (`SecureStorage` ENC_V3)**:
  - Todo resguardo de credenciales locales u hashes en el dispositivo debe utilizar cifrado autenticado de estándar **`ENC_V3:`** (PBKDF2/SHA-256 de al menos 500 rondas iterativas + HMAC-SHA256 Encrypt-then-MAC).
  - ❌ **Prohibición de Cifrado Trivial Reversible**: Cero XOR simple sin código de autenticación de mensajes (MAC).
  - 🔄 **Migración Transparente**: Toda lectura debe migrar automáticamente cargas heredadas (`ENC_V2:` o texto plano) hacia `ENC_V3:`.
  - 🔒 **Erradicación de Residuos en Claro**: Cero persistencia de `@mumanager_admin_key` u otros secretos en `AsyncStorage`. Toda mutación debe purgar de inmediato cualquier residuo legible de `AsyncStorage`.
- **Acotación Estricta de Credenciales en Transporte HTTP (`X-Admin-Key`)**:
  - En el cliente móvil (`sqlClient.ts`), la cabecera sensible `X-Admin-Key` solo debe adjuntarse en peticiones cuyo destino comience explícitamente por `/api/admin`.
  - ❌ **Prohibición de Dispersión**: Jamás transmitir `X-Admin-Key` hacia rutas generales de datos SQL, telemetría o endpoints públicos. Prohibidas cabeceras redundantes innecesarias (`X-Session-Token`).
- **Minimización de Respuestas en Telemetría Pública**:
  - `/api/telemetry/check/:hwid` debe responder de forma estrictamente mínima y opaca ante peticiones anónimas o sin credenciales administrativas válidas: `{ registered: boolean, blocked: boolean, mode: string }`.
  - ❌ **Prohibición de Fuga de Metadatos**: Cero exposición de marcas temporales (`lastSeen`), fechas de vencimiento (`expiresAt`), motivos de sanción (`blockReason`) o notas internas a visitantes no autorizados.
- **Sanitización de Registros de Depuración y Confirmación Explícita**:
  - Diagnóstico de red y logs no deben exponer datos sensibles en claro.
  - Hosts de base de datos enmascarados (`maskHost`), consultas SQL sanitizadas (`[REDACTED]`).
  - Confirmación obligatoria previa con previsualización en la UI antes de compartir registros a canales externos.
- **Blindaje de Mensajes de Error (Anti-Fuga de Infraestructura)**:
  - Backend: Jamás emitir en la respuesta JSON el mensaje de error interno del motor (`err.message`), rutas locales o sintaxis SQL. Usar `sendSafeInternalError(res, err, context)` con identificador de auditoría (`ERR_...`).
  - Frontend: `ErrorBoundary` y vistas deben atrapar excepciones mostrando un mensaje seguro con identificador (`ERR_UI_...`), suprimiendo trazas técnicas de pila.
- **Persistencia Efímera de Cachés Administrativas en Navegador (`sessionStorage`)**:
  - En el Panel de Control Web (`adminDashboard.html`), los datos de inventario administrativo (`mumanager_users_cache`, `mumanager_devices_cache`) residen exclusivamente en `sessionStorage`.
  - ❌ **Prohibición de `localStorage` para Datos de Sesión**: Prohibido persistir usuarios o celulares en `localStorage`.
- **Acotación de Permisos Nativos y Almacenamiento Android**:
  - En `AndroidManifest.xml`, `READ_EXTERNAL_STORAGE` y `WRITE_EXTERNAL_STORAGE` deben declararse obligatoriamente con `android:maxSdkVersion="28"`.
  - Android 10+ (API 29+) usa exclusivamente almacenamiento privado scoped sin solicitar permisos invasivos.
- **Enmascaramiento de HWID y Consentimiento de Soporte**:
  - `HWID` enmascarado por defecto en la UI (`CEL-••••-••••-XXXX`) con botón de revelación táctil temporal.
  - Diálogo de consentimiento antes de abrir enlaces externos a WhatsApp para decidir si incluir el identificador técnico en el mensaje.
- **Transparencia Editorial y Prohibición de Garantías Absolutas**:
  - ❌ **Prohibición de Promesas Absolutas**: Prohibido usar expresiones engañosas o redundantes como "seguridad militar", "garantía corporativa absoluta", "totalmente seguro" o "jamás será vulnerado".
  - Modelo de conexión transparente: Gateway HTTPS seguro preconfigurado o Conector Local Windows para `localhost`.
  - Política de Privacidad detallada con datos exactos de telemetría y tratamiento cifrado de credenciales.
- **Sincronización Automática del Verificador de Integridad y Aislamiento de Binarios**:
  - `release-update.js` inspecciona criptográficamente el hash SHA-256 y tamaño exacto del nuevo binario compilado, actualizando automáticamente `website/js/hash-verifier.js` y `server/website/js/hash-verifier.js`.
  - Binarios obsoletos resguardados en `APKs_Resguardo_Local/` fuera del árbol servido públicamente.
  - El verificador web certifica exclusivamente la coincidencia de integridad bit a bit con el SHA-256 oficial publicado, sin promesas no verificables de firmas o antivirus.

## 13. SINCRONIZACIÓN MONOTÓNICA, COHERENCIA DE LICENCIAS Y EXPERIENCIA DE SESIÓN (v2.2.0 & v2.2.1)
- **Revisiones Monotónicas Autoritativas (`authRevision` y `authUpdatedAt`)**:
  - Todo cambio de autorización en un dispositivo (`mode`, `blocked`, `expiresAt`, `licenseKey`, `forceDemo`) en cualquier backend o endpoint administrativo DEBE incrementar monótonamente `authRevision` y fijar `authUpdatedAt = Date.now()`.
  - En `syncCloudStorage`, el registro con mayor `authRevision` (o mayor `authUpdatedAt` en caso de empate) prevalece irrevocablemente. La nube desempata registros heredados (*legacy*). Queda formalmente abolida la priorización ciega de PRO sobre DEMO.
- **Invariante de Coherencia de Tombstones y Claves Activas**:
  - `saveTombstones()` gestiona `version` y `updatedAt`.
  - Ninguna clave asignada a un dispositivo activo autoritativamente como PRO (`mode === 'PRO' && !forceDemo`) puede residir en `revokedKeys`. Al unificar tombstones locales y cloud, las claves activas PRO se purgan de inmediato de `revokedKeys`.
- **Aislamiento de Decisión en Telemetría y Cero Democión por Clave Obsoleta**:
  - El otorgamiento del modo PRO es potestad exclusiva del servidor. Si el servidor determina autoritativamente que un dispositivo es PRO (`isServerAuthoritativePro`), la recepción rutinaria de claves desactualizadas enviadas por el APK en el ping NO debe demotar el dispositivo a DEMO.
- **Desacoplamiento de Escrituras Cloud en Telemetría Rutinaria (`skipCloudWrite`)**:
  - Los pings periódicos que no alteren el estado de autorización deben invocar `saveDevices(devices, { skipCloudWrite: true })`. Las escrituras completas a Upstash Redis se reservan con exclusividad para altas o mutaciones reales de estado.
- **Coalescencia Single-Flight en Sincronización de Almacenamiento**:
  - Múltiples llamadas concurrentes a `syncCloudStorage` deben coalescer en una única promesa en vuelo (`activeSyncPromise`), previniendo lecturas duplicadas y sobreescrituras desordenadas.
- **Filtro de Desorden y Cola Serializada en Cliente (`LicenseService`)**:
  - La app móvil descarta silenciosamente respuestas de telemetría con `authRevision` o `authUpdatedAt` inferiores a las ya procesadas.
  - Toda persistencia o purga local en `AsyncStorage` debe serializarse estrictamente mediante la cola FIFO `queueStorageOperation`.
- **Erradicación de Estado Zombie y Validación Activa de Sesión (v2.2.0)**:
  - Ante un error 401 en cualquier consulta, el cliente purga de inmediato el token de sesión y transiciona a estado no autenticado, eliminando la etiqueta engañosa "SQL Conectada".
  - Al iniciar la app, `AuthContext` valida activamente el token contra `/api/auth/validate-session` antes de confiar en la sesión local.
- **Auto-Activación Híbrida y Deep Linking (v2.2.0)**:
  - Soporte de activación web de 1-clic (`GET /api/auth/activate`), código numérico y deep linking móvil (`mumanager://`).
  - La app escucha `AppState: active` y consulta `/api/auth/check-status` para cerrar automáticamente el modal de verificación al activarse en el navegador.
- **Depuración Estética y Banco de Joyas Kundun +1..+5 (v2.2.0)**:
  - Prohibido duplicar encabezados o barras de pestañas en pantallas secundarias (`PlayersHubScreen`, `ToolsScreen`).
  - Soporte oficial de Box of Kundun +1 al +5 con sprites oficiales transparentes y persistencia completa en Louis S6 y MSPro.

## 14. PROTOCOLO DE SANEAMIENTO A CERO (TABULA RASA) Y AUTORIDAD DEL SERVIDOR EN PANEL WEB
- **Autoridad Absoluta del Servidor en el Panel Web (`adminDashboard.html`)**:
  - El servidor y la nube (Upstash Redis) son la **única fuente autoritativa de verdad**.
  - ❌ **Abolición del Cumulative Merge en Cliente**: Prohibido que `refreshUsers()` o `refreshDevices()` unan acumulativamente entidades de `allUsersCache` / `allDevicesCache`. Todo elemento ausente en la respuesta del servidor se desaloja inmediatamente de la pantalla y de `sessionStorage`.
  - `sessionStorage` es únicamente un búfer transitorio de pintado; jamás debe emplearse para revivir cuentas o celulares eliminados en la base de datos.
- **Operaciones Normales de Borrado en el Panel**:
  - `POST /api/admin/user/delete`: Añade a `tombstones.deletedUsers`, desvincula celulares y purga `users.json` y la nube.
  - `POST /api/admin/device/delete`: Limpia el celular de `devices.json` y de la nube sin bloquearlo, permitiendo que ingrese como nuevo con 72h de prueba.
  - `POST /api/admin/security-logs/clear`: Limpieza completa de registros de auditoría y alertas sin tocar licencias ni usuarios.
- **Protocolo de Reseteo a Cero (Tabula Rasa)**:
  - Resguardo previo obligatorio en `_ARCHIVOS_PRUEBAS_HISTORICAS/` fuera del árbol servido.
  - Sincronización atómica en las 4 capas: Local (`users.json` solo con `usr_admin_default`, `devices.json: {}`), Repositorios hermanos (`MuManagerPro-Gateway`), Nube Upstash Redis (`/api/admin/backup/import`), y purga de caché del navegador (`Ctrl + Shift + R` o logout).
  - Inviolabilidad absoluta de `settings.json` (versión, build, URL APK, 72h demo) y catálogos de juego.

## 15. GOOGLE OAUTH 2.0 & IDENTIFICADOR DUAL (v2.2.1+)
- **Identificador Dual Unificado**: El usuario puede iniciar sesión indistintamente con su ID de usuario (`username`) o con su correo electrónico (`email`). Soporte simétrico en backend (`/api/auth/login`) y modo offline (`AuthContext.tsx` con `SecureStorage`).
- **Google OAuth 2.0 Seguro**:
  - Secreto OAuth (`GOCSPX-...`) reside **exclusivamente en variables de entorno del servidor** (`process.env.GOOGLE_CLIENT_SECRET`). Prohibido en binarios o `src/`.
  - `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` no admiten fallbacks en código. Ambos deben llegar por variables de entorno del backend; en producción, la falta de uno aborta el arranque y en desarrollo OAuth queda deshabilitado explícitamente.
  - Rutas de backend: `GET /api/auth/oauth/google` y `GET /api/auth/oauth/google/callback`.
  - Creación con `status: 'ACTIVE'` instantáneo (sin códigos de activación OTP) o activación de cuenta previa.
  - Deep Link móvil `mumanager://oauth-callback?token=...` interceptado por `LoginScreen.tsx` y `loginWithToken()` en `AuthContext.tsx`.
  - Preservación estricta de `HWID` y asignación automática del período de prueba de 72 horas.

## 16. SISTEMA COMPARTIDO DE AVISOS Y DIÁLOGOS

- Preservar `GothicAlertManager`, `<GothicAlertContainer />`, `GothicAlert.installGlobal()` y la API compatible con `Alert.alert`.
- Tratar `GothicAlert` como nombre funcional; su apariencia procede solo de `DESIGN.md` y de `FINAL 12 Estados comunes`.
- Conservar variantes, texto más icono, callbacks, cancelación, cola FIFO, idempotencia y apilamiento sobre modales.
- Mantener las cuatro acciones existentes de `promptDemoAccess` y todas sus consecuencias actuales.
- Mantener desplazamiento para contenido largo, adaptación móvil y objetivos táctiles mínimos de 44 dp.
- Solo se exceptúan diálogos de permisos controlados directamente por Android Runtime.

## 17. COBERTURA VISUAL STITCH Y BANCO DE JOYAS

- Auditar toda la APK real y demostrar correspondencia antes/después; no limitarse a las pantallas de ejemplo.
- Usar exclusivamente los ocho IDs aprobados y el `DESIGN.md` raíz como autoridad visual.
- Tratar `04 Biblioteca MU V2` como catálogo visual, nunca como ruta funcional.
- Traducir el ZIP y `Codigo.txt` a primitivas React Native sin incrustar HTML ni capturas.
- Conservar Box of Kundun +1 a +5, `ItemLevel` 8..12, sprites, compatibilidad Louis/MSPro y protecciones transaccionales.
- No declarar cobertura completa con controles omitidos, parciales o no verificados.
- No tocar lógica, rutas, datos, permisos, SQL, licencias, publicación ni versión estable.

## 18. SISTEMA MULTI-CANAL DE ALERTAS (TELEGRAM, DISCORD, CALLMEBOT), CANALES OFICIALES Y SEGURIDAD

- **Canales Oficiales de Comunidad y Soporte**:
  - Discord oficial: `https://discord.gg/4YXguuBFV` (o ruta corta `/discord`).
  - Telegram oficial: `https://t.me/ToolForg3` (o ruta corta `/telegram`).
  - ❌ **Abolición de Soporte Directo por WhatsApp en el APK**: Prohibido incluir botones o enlaces de soporte por WhatsApp en las pantallas de la app móvil. La atención se centraliza en Discord y Telegram.
- **Sistema Multi-Canal Modular de Alertas de Seguridad y Solicitudes PRO**:
  - Activación modular e independiente en `settings.json` / Upstash Redis: `channels.telegram`, `channels.discord`, `channels.callmebot`, `channels.webhook`.
  - **Telegram Bot**: Despacho directo vía Bot API (`sendMessage`) con `botToken` y `chatId` en formato Markdown/HTML.
  - **Discord Webhook**: Despacho directo con embeds enriquecidos en oro y grafito, avatar personalizado (`mumanager_bot_avatar`), nombre configurable y menciones `@here` / `@everyone` para incidentes críticos.
  - **CallMeBot (WhatsApp)**: Respaldo para administradores vía bot oficial `+34 684 728 023`, requiriendo opt-in previo obligatorio (`I allow callmebot to send me messages`) y API Key personal vinculada. Prohibido referenciar el número revocado `+34 644 10 55 84`.
  - **Webhook Personalizado**: Integración HTTP POST para sistemas de monitoreo externos.
  - **Despacho Asíncrono en Paralelo (Non-Blocking)**: Envíos ejecutados con `Promise.allSettled()`, garantizando cero latencia o degradación para el usuario si una API externa tarda o falla.
  - Diagnóstico en vivo sin falsos positivos: `/api/admin/alerts/test` y `/api/admin/whatsapp/test` reportan códigos HTTP y respuestas reales de los proveedores. Prohibido simular envíos exitosos ante fallos.
  - Paridad obligatoria entre `bridgeServer.js`, `adminDashboard.html`, `MuManager-Connector` y `MuManagerPro-Gateway`.
- **Blindaje WAF y Proxies Inversos**:
  - `app.set('trust proxy', 1)` obligatorio en servidores Express tras proxies inversos (Vercel Serverless, Cloudflare, Render) para resolver IPs reales desde `x-forwarded-for` / `x-real-ip`.
  - Inmunidad de loopback: Las IPs locales (`127.0.0.1`, `::1`, `localhost`) jamás se incorporan a `BANNED_IPS` ni se bloquean.
  - Bypass de administrador: Toda petición con `X-Admin-Key` o parámetro `?adminKey=` válido elimina inmediatamente la IP de `BANNED_IPS` y omite el WAF.
- **Sincronización de Dispositivos y Cierre de Sesión Silencioso**:
  - En `/api/auth/login` y `/api/auth/validate-session`, el servidor asocia `devices[hwid].currentUser = user.email || user.username`.
  - Reconciliación proactiva: `GET /api/admin/devices` empareja dispositivos sin usuario contra `users.json`.
  - Endpoint de desconexión `POST /api/auth/logout`: Invocado por `sqlClient.logoutDevice(hwid, priorUser)` en `logout()` y `logoutDemo()`, limpiando `currentUser` y `activeHwid`.
  - Panel sin pestañeo: `adminDashboard.html` actualiza exclusivamente el nodo de texto `.dev-user-text` in-situ sin recargar ni reconstruir filas en la tabla de celulares.
