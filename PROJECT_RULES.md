# 📜 DIRECTRICES MAESTRAS Y REGLAS PERMANENTES DEL PROYECTO
> **IMPORTANTE PARA CUALQUIER AGENTE DE IA O DESARROLLADOR:**
> Este documento contiene las directrices inquebrantables del proyecto **Mu Manager PRO**.
> Antes de realizar cualquier cambio, agregar pantallas, modificar estilos o publicar actualizaciones, **DEBES LEER Y SEGUIR ESTAS REGLAS ESTRICTAMENTE**.

---

## 🎨 1. SISTEMA DE DISEÑO OFICIAL (SEASON 6 PIEDRA & ORO)

La identidad visual de la aplicación es **Medieval Fantasía Clásica Season 6** inspirada en la interfaz original de MU Online. Todos los componentes deben respetar esta estética.

### Paleta de Colores Obligatoria:
| Rol | Código Hex | Uso |
| :--- | :--- | :--- |
| **Fondo Profundo** | `#191512` / `#100D0B` | Fondo de pantallas, slots de inventario e inputs |
| **Piedra / Tarjetas** | `#241E1A` / `#2B2521` | Contenedores, tarjetas, modales y barras |
| **Grabado / Borde** | `#6B5533` | Bordes estándar, separadores y divisores |
| **Borde Resaltado** | `#A8894D` / `#E8C86A` | Bordes activos, selecciones y foco |
| **Oro Primario** | `#B58F3C` / `#E8C86A` | Botones principales, acentos, títulos y ranuras de sockets |
| **Brasa / Peligro** | `#E2703A` / `#FF884D` | Acciones destructivas, desconexiones, bloqueos y alertas |
| **Jade / Zen** | `#3FCF8E` | ZEN, estado 'Online', éxitos y bonificaciones excelentes |
| **Arcano / Ancient** | `#5B8DEF` | Texto de ítems Ancient, stats mágicos y datos auxiliares |
| **Texto Principal** | `#FAF6EE` | Textos legibles, títulos de ítems, números clave (14.2:1 WCAG AAA) |
| **Texto Secundario**| `#C8BEAF` | Etiquetas, subtítulos, botones de cierre, descripciones (9.8:1 WCAG AAA) |
| **Texto Atenuado (Muted)**| `#B8AEA0` | Placeholders, opciones inactivas, notas técnicas (8.5:1 WCAG AAA) |
| **Oro Texto (TextGold)**| `#F0D27A` | Acentos numéricos dorados, stats destacados (11.4:1 WCAG AAA) |

### 🔍 ESTÁNDAR OBLIGATORIO DE CONTRASTE Y LEGIBILIDAD (WCAG AAA):
- **Contraste Mínimo 7:1 (WCAG AAA)**: Todo texto, pista (*placeholder*), etiqueta, píldora o icono funcional sobre los fondos de piedra (`#100D0B`, `#191512`, `#241E1A`, `#2B2521`) debe superar un ratio de contraste de 7:1 para garantizar lectura nítida bajo cualquier brillo de pantalla.
- **Uso Estricto de Tokens Canónicos de Tema (`THEME.colors`)**:
  - Títulos y textos principales: `THEME.colors.texto` (`#FAF6EE`).
  - Etiquetas, subtítulos y botones de cierre modal: `THEME.colors.textoSecundario` (`#C8BEAF`).
  - Placeholders de inputs y controles inactivos: `THEME.colors.textMuted` (`#B8AEA0`).
  - Valores numéricos y acentos: `THEME.colors.oroClaro` (`#E8C86A`) o `THEME.colors.textGold` (`#F0D27A`).
- **Estados Inactivos Claros pero Legibles**: Las opciones o toggles inactivos (`Luck`, `Skill`, `Full Exc`, `380 PvP`) y botones deshabilitados deben estilizarse con `THEME.colors.textMuted` (`#B8AEA0`), evitando tonos grises oscuros que los hagan parecer rotos o invisibles.

### 🚫 COLORES Y ESTILOS TOTALMENTE PROHIBIDOS:
- ❌ **NO usar morados / púrpuras** (`#BA68C8`, `#9C27B0`, `#7B1FA2`, `#4A3469`).
- ❌ **NO usar tonos cyan neón** (`#00E5FF`, `#00F0FF`) salvo el azul clásico Season 6 `#5B8DEF` para ítems Ancient.
- ❌ **NO usar verdes fluorescentes o lima** (`#00C853`, `#00E676`). Usar siempre Jade Season 6 (`#3FCF8E`).
- ❌ **NO usar grises oscuros / apagados de bajo contraste para texto sobre fondos oscuros**:
  - Queda terminantemente prohibido utilizar `#666`, `#777`, `#888`, `#999`, `#AAA`, `#BBB`, `#CCC`, `#DDD`, `#9C9182` o variantes en hexadecimal para textos, etiquetas, iconos funcionales o placeholders.
- ❌ **NO usar bordes circulares inflados** (`borderRadius: 20+` en tarjetas o inputs). El radio oficial en todo el proyecto es **`borderRadius: 6`** para evocar piedra y metal biselado.

---

## ⚔️ 2. EMULADORES Y BASE DE DATOS (REGLA SAGRADA)

1. **EL EMULADOR LOUIS DEBE PERMANECER 100% INTACTO**:
   - Ninguna consulta SQL, función o ajuste introducido para otros emuladores debe modificar o romper las consultas ni procedimientos del emulador Louis.
   - Louis es el estándar principal del proyecto.

2. **COMPATIBILIDAD DUAL LOUIS & MSPRO**:
   - El emulador MSPro y Louis conviven armónicamente.
   - Siempre que se consulten columnas o tablas exclusivas de MSPro (por ejemplo, `RuudToken` en `Character` o `AccountCharacter.ExtWarehouse`), se deben utilizar consultas SQL dinámicas o de detección segura (`COL_LENGTH`, `OBJECT_ID`, o `CASE WHEN`) para que jamás fallen en bases de datos Louis estándar.

---

## 📦 3. PROTOCOLO DE ACTUALIZACIÓN DE VERSIONES (6 ARCHIVOS OBLIGATORIOS)

La versión de la aplicación **NO se actualiza en un solo archivo**. Si olvidas alguno, la app entrará en un **bucle infinito de actualización** o el instalador APK no reflejará el cambio.

Cada vez que se suba una versión (ej. de `1.7.5` a `1.7.6`), **DEBES ACTUALIZAR SIMULTÁNEAMENTE ESTOS 6 ARCHIVOS**:

1. **`package.json`**: `version: 'X.X.X'`
2. **`src/constants/appVersion.ts`**: `APP_VERSION = ... || 'X.X.X';` y `APP_BUILD = ... || 'XX';`
3. **`app.json`**: `expo.version = 'X.X.X'` y `expo.android.versionCode = XX`
4. **`android/app/build.gradle`**: `versionCode XX` y `versionName 'X.X.X'`
5. **`version.json`**: `version: 'X.X.X'`, `build: XX`, y `downloadUrl: 'https://github.com/ToolForg3/MuManagerPro-App/releases/download/vX.X.X/MuManagerPro.apk'` *(Alojamiento oficial en GitHub Releases AWS S3 sin límites de concurrencia)*
6. **`data/settings.json` y `server/data/settings.json`**: `latestVersion: 'X.X.X'`, `versionCode: XX`, `latestApkUrl: 'https://github.com/ToolForg3/MuManagerPro-App/releases/download/vX.X.X/MuManagerPro.apk'`

---

## 🚀 4. PIPELINE DE COMPILACIÓN Y DESPLIEGUE

1. **Verificar tipado y pruebas**:
   - `npm run ts:check` (0 errores)
   - `npm test` (todas las pruebas pasan 100%)
   - Escáner de contraste: 0 colores prohibidos y 0 grises apagados (`contrast_checker.js`)
2. **Compilar el Release APK (Hermes Bytecode)**:
   - `cd android && ./gradlew.bat assembleRelease`
   - Genera el binario en: `android/app/build/outputs/apk/release/app-release.apk`
3. **Ejecutar el Pipeline de Lanzamiento Maestro**:
   - `node scripts/release-update.js`
   - Copia a Escritorio, sincroniza repositorios `MuManagerPro-App` y `MuManagerPro-Gateway`, hace push a GitHub y actualiza la pasarela.

---

## 📱 5. ERGONOMÍA MÓVIL Y MODALES

- Todos los modales y diálogos deben tener `maxHeight: '90%'`, `maxWidth: 420`, y `ScrollView` vertical activo con `nestedScrollEnabled` para garantizar accesibilidad en cualquier resolución de celular.

---

## 💎 6. SISTEMA DE SOCKETS SEASON 6

- Implementado en `src/constants/socketCatalog.ts`.
- Fórmula matemática: `Byte = OptionID + (Nivel - 1) * 50`.
- Valores especiales: `0xFF` (inactivo), `0xFE` (ranura libre/gris).
- Mapeo 100% idéntico a las bonificaciones del cliente oficial del juego.

---

## 🛡️ 7. DIRECTRICES DE SEGURIDAD, CRIPTOGRAFÍA Y ANTI-FUGA (REGLAS INQUEBRANTABLES)

Cualquier cambio de código, script o despliegue debe respetar estas reglas de forma obligatoria:

1. **PROHIBICIÓN TOTAL DE CREDENCIALES Y SALTS EN TEXTO PLANO**:
   - ❌ **JAMÁS escribir contraseñas reales, tokens, app passwords, API keys o salts maestros** en archivos `.json`, `.js`, `.ts`, `.bat`, `.sql` o `.md`.
   - 🔒 `MASTER_SECURITY_SALT`: **NUNCA tener fallbacks hardcodeados en el código** (`process.env.MASTER_SECURITY_SALT || '...'`). En producción, el servidor **DEBE abortar con `process.exit(1)`** si la variable no existe. En desarrollo, generar un salt efímero aleatorio con `crypto.randomBytes(32).toString('hex')` y advertencia en consola.
   - 🔒 En los tests unitarios, **NUNCA usar el salt de producción**; usar siempre constantes de test explícitas (`TEST_ONLY_SALT...`).
   - 🔒 El campo `"pass"` en `data/settings.json` y `server/data/settings.json` **DEBE permanecer siempre vacío (`""`)**. Las credenciales de correo se cargan **exclusivamente por variable de entorno** (`process.env.SMTP_PASS`).
   - 🔒 Los secretos JWT deben configurarse en producción vía `process.env.JWT_SECRET`.

2. **PROTECCIÓN DE LA CLAVE ADMINISTRATIVA (`ADMIN_KEY`)**:
   - ❌ **PROHIBIDO usar claves de administración por defecto conocidas** (como `MuAdmin2026!`).
   - 🔒 En desarrollo, si `ADMIN_KEY` no está configurada, el servidor debe generar una clave efímera aleatoria de 40 caracteres hex con `crypto.randomBytes(20).toString('hex')` e imprimirla una sola vez en consola.
   - 🔒 En producción, `ADMIN_KEY` es obligatoria por variable de entorno (mínimo 8 caracteres).
   - 🔒 **Canal estricto**: La clave administrativa **SOLO se acepta mediante el header HTTP `X-Admin-Key`**. Queda **estrictamente prohibido aceptarla en el body de la petición (`req.body.adminKey`)** para evitar que quede registrada en logs de proxies o gateways.

3. **PROTECCIÓN DE DATOS DE USUARIOS Y TELEMETRÍA EN GIT**:
   - ❌ **PROHIBIDO commitear o trackear en Git** (`git add`) cualquiera de estos archivos en CUALQUIER repositorio (`MuManagerPro-App` o `MuManagerPro-Gateway`):
     - `data/users.json`
     - `data/devices.json` y `data/devices.json.bak`
     - `data/tombstones.json`, `data/securityLogs.json`, `data/proRequests.json`
     - `server/data/`
     - Archivos de respaldo (`*.bak`)
     - Archivos de entorno `.env`, `.env.local`, `.env.production`
     - Herramienta privada de licencias `scripts/keygen.js`
   - ✅ Los scripts de sincronización (`sync-gateway.js`, `release-update.js`) deben ejecutar `git rm --cached -f` forzoso de cualquier archivo de datos sensible inmediatamente después de cualquier comando `git add`.

4. **RATE LIMITING ESTRICTO EN ENDPOINTS DE AUTENTICACIÓN**:
   - 🔒 Todos los endpoints de acceso (`/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password/request`) deben implementar un rate limiter en memoria estricto e independiente (máximo 5 intentos por ventana de 15 minutos por IP) con header `Retry-After`.

5. **LONGITUD MÍNIMA DE CONTRASEÑAS**:
   - 🔒 En todos los endpoints de registro, reseteo por OTP y administración, la longitud mínima de contraseña para usuarios debe ser de al menos **8 caracteres** (nunca 4).

6. **CABECERAS DE SEGURIDAD Y HSTS**:
   - 🔒 En producción, el servidor debe emitir obligatoriamente `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin` y `Permissions-Policy`.

7. **PROHIBICIÓN ESTRICTA DE BACKDOORS O BYPASSES EN CLIENTE**:
   - ❌ **PROHIBIDO introducir listas de bypass de usuario** (como `isLocalTestUser` o `cleanUser === 'admin'` / `'cris'`) que permitan iniciar sesión sin verificar la contraseña auténtica o saltándose la API remota.
   - ❌ **PROHIBIDO retornar o emitir tokens de desarrollo simulados** (`LOCAL_DEV_...`) que otorguen acceso no autenticado.

8. **BLINDAJE DE CÓDIGOS OTP / 2FA EN LA API**:
   - 🔒 En entornos de producción (`process.env.NODE_ENV === 'production'`), **los códigos de 6 dígitos de verificación o reseteo de clave NUNCA deben devolverse en el JSON de respuesta HTTP (`devCode`)**.
   - Solo deben ser enviados por correo electrónico real o consultados en el panel de auditoría por el administrador.

9. **PROTECCIÓN DE FIRMAS ANDROID Y CLAVE MAESTRA DE LICENCIAS**:
   - 🔒 El secreto `MASTER_SECURITY_SALT` de generación de licencias **NUNCA debe ser distribuido a clientes** ni empaquetado en archivos comprimidos públicos como `MuManager-Connector.zip`.
   - 🔒 En el APK móvil, el salt reside **exclusivamente como bytes cifrados con matriz rotativa XOR en `stringObfuscator.ts`**. Si el salt rota en el servidor, debe re-ofuscarse y recompilarse el APK.
   - 🔒 El almacén de claves de producción `mumanager-release.keystore` y sus credenciales en `android/gradle.properties` deben mantenerse exclusivamente en el entorno seguro de compilación.

10. **CUARENTENA OBLIGATORIA**:
    - La carpeta `_SEGURIDAD_ARCHIVOS_ORIGINALES/` es un almacén de resguardo local de emergencia del desarrollador. Está **estrictamente prohibido incluirla en Git, en `tsconfig.json` o en respaldos en la nube** (`backup_onedrive.py`, `backup_source.py`).

---

### 8. ⚡ REGLAS DE DESPLIEGUE EN VERCEL / NUBE Y COMPILACIÓN LOCAL (ANTI-CUOTAS)

1. **PROHIBICIÓN ESTRICTA DE BINARIOS PESADOS EN REPOSITORIOS DE DESPLIEGUE**:
   - ❌ **PROHIBIDO subir archivos `.apk`, `.aab`, `.zip` pesados a `MuManagerPro-Gateway` o Vercel**.
   - Vercel tiene un límite estricto de **10 GB** en "Functions & Deployment Storage". Cada despliegue con APKs pesados consume cientos de megabytes acumulativos.
   - El archivo `.vercelignore` debe excluir permanentemente `*.apk`, `*.aab`, `*.zip`, carpetas de descargas y datos de usuario.
   - Si se generan APKs locales, deben guardarse en el Escritorio o en carpetas de resguardo local (`APKs_Resguardo_Local/`), NUNCA dentro de directorios rastreados por Git para despliegue.

2. **COMPILACIÓN LOCAL DE APK (ZERO CONSUMO DE NUBE / EAS)**:
   - ✅ Para compilar el APK oficial de lanzamiento, se debe utilizar el script local:
     `COMPILAR-APK-LOCAL.bat`
   - Este script utiliza el compilador de la máquina (Java 17 OpenJDK Temurin, Gradle 8.10.2 y Android SDK local), garantizando compilaciones ilimitadas, gratuitas y seguras sin consumir cuotas de EAS Cloud ni llenar límites de almacenamiento.

3. **GESTIÓN DE SECRETOS Y SMTP EN VERCEL**:
   - 🔒 Los secretos de producción (`SMTP_PASS`, `SMTP_USER`, `ADMIN_KEY`, `JWT_SECRET`, `MASTER_SECURITY_SALT`) se configuran **exclusivamente** en el panel de Vercel:
     `Vercel Dashboard ➔ Tu Proyecto ➔ Settings ➔ Environment Variables`.
   - En desarrollo local, se leen desde el archivo `.env` (el cual está 100% ignorado por `.gitignore`). NUNCA se deben incluir en `settings.json`.

4. **DISTRIBUCIÓN DE APKs VÍA GITHUB RELEASES / CDN**:
   - Las descargas de la app para usuarios finales deben resolverse a través de los endpoints de redirección HTTP 302 hacia GitHub Releases (`https://github.com/ToolForg3/MuManagerPro-App/releases/...`).
   - El servidor de Vercel solo debe ejecutar la lógica de API Serverless (< 5 MB por despliegue).

5. **MANTENIMIENTO DE ALMACENAMIENTO EN VERCEL**:
   - Si la cuota de Vercel se aproxima al límite, se deben eliminar los despliegues históricos obsoletos desde:
     `Vercel Dashboard ➔ Deployments ➔ [...] ➔ Delete`.
   - Una vez eliminados los despliegues antiguos que contenían APKs pesados, el almacenamiento recupera su estado óptimo (< 50 MB en total).

---

### 9. 📦 GESTIÓN DE REPOSITORIO DE APLICACIÓN (MuManagerPro-App) Y ACTUALIZACIONES

1. **CANAL OFICIAL DE DESCARGAS Y ZERO SOBRECARGA EN GIT**:
   - ❌ **PROHIBIDO commitear múltiples archivos `.apk` históricos o compilaciones intermedias en `MuManagerPro-App`**.
   - El repositorio de la app debe mantenerse ligero (< 100 MB de código fuente y assets).
   - En Git solo se conserva el archivo canónico `MuManagerPro.apk` (o referencias a GitHub Releases).
   - Los binarios versionados antiguos deben resguardarse en `APKs_Resguardo_Local/` y distribuirse vía GitHub Releases.

2. **PROTECCIÓN ESTRICTA DE PRIVACIDAD EN REPOSITORIO DE APP**:
   - 🔒 Los archivos de datos de usuarios y celulares (`data/users.json`, `data/devices.json`, `server/data/`) **DEBEN figurar permanentemente en `.gitignore` de `MuManagerPro-App`** y NUNCA rastrearse en Git.
   - Las contraseñas en `data/settings.json` y `server/data/settings.json` deben permanecer vacías (`"pass": ""`).

3. **INTEGRIDAD DEL FLUJO DE ACTUALIZACIONES AUTOMÁTICAS**:
   - El archivo `version.json` en la rama `main` es el manifiesto canónico de actualización.
   - La propiedad `"downloadUrl"` debe apuntar a la URL pública de entrega de GitHub Releases (`https://github.com/ToolForg3/MuManagerPro-App/releases/download/vX.X.X/MuManagerPro.apk` o latest), garantizando alta concurrencia en AWS S3 sin límites de conexión.
   - La pasarela en Vercel redirige automáticamente `/download/latest` y `/download/:filename` hacia el CDN oficial mediante HTTP 302, garantizando que todos los clientes instalados reciban la actualización sin interrupciones ni costos de infraestructura.

---

### 10. 🔑 SISTEMA DE LICENCIAS Y PANEL DE CONTROL (REGLAS INQUEBRANTABLES)

1. **FORMATO CANÓNICO DE LICENCIAS**:
   - 🔒 El formato oficial de toda clave es estrictamente:
     `MUMANAGER-[PLAN]-[SIG1]-[SIG2]-[SIG3]`
     (Ejemplo: `MUMANAGER-PRO-A8F1-44B9-C012`).
   - La firma consta de exactamente 12 caracteres hexadecimales generados mediante el hash SHA-256 de `${cleanHwid}:${plan}:${MASTER_SECURITY_SALT}`.
   - ❌ **PROHIBIDO generar formatos HMAC aleatorios o diferentes** en el servidor web o pasarela. Toda clave emitida por el panel web debe ser 100% compatible con la verificación del APK y el script `scripts/keygen.js`.
   - 🛡️ El servidor debe verificar las claves en 3 capas de resiliencia:
     1. Firma canónica SHA-256 (matemática).
     2. Claves pre-asignadas en Upstash Redis (`devices[hwid].licenseKey` o `generatedKey`).
     3. Claves legadas HMAC (retrocompatibilidad total con dispositivos históricos).

2. **PROHIBICIÓN ESTRICTA DE AUTO-WIPE DE LICENCIAS EN TELEMETRÍA**:
   - ❌ **JAMÁS emitir `forceWipeKey: true` ante claves válidas o dispositivos nuevos en modo DEMO**.
   - En el endpoint `/api/telemetry/ping`, si el dispositivo envía una clave matemáticamente válida (`verifyKey`), el servidor **DEBE** actualizar inmediatamente `mode = 'PRO'`, desactivar `forceDemo = false`, y responder con `forceWipeKey: false`.
   - `forceWipeKey: true` es **exclusivo** para revocaciones deliberadas del administrador (`forceDemo: true`), dispositivos eliminados en `tombstones` o intentos de spoofing con claves fraudulentas.
   - En el cliente APK (`licenseService.ts`), el borrado local de licencia en `AsyncStorage` solo debe ejecutarse si el servidor ordena explícitamente `forceWipeKey: true` o `forceDemo: true`.

3. **ACCESO AUTORIZADO AL MODO DEMO (PRUEBA DE 72 HORAS)**:
   - 🛡️ El middleware de seguridad Zero-Trust **DEBE permitir a los dispositivos en período de prueba activo (`isDemoActive`)** acceder a las rutas de datos estándar (`/api/accounts`, `/api/character`, `/api/warehouse`, `/api/guilds`, `/api/pk`, `/api/players`, `/api/items`, `/api/mu`).
   - Las rutas críticas de administración y sistema (`/api/tools`, `/api/gm`, `/api/ip`, `/api/prizes`) permanecen **estrictamente exclusivas** para licencias `PRO` activas o rol `ADMIN`.

4. **SEGURIDAD DEL PANEL DE CONTROL Y RATE LIMITING ADMINISTRATIVO**:
   - 🔒 **Rate Limiting Administrativo**: El router `/api/admin/*` debe contar con un limitador en memoria que bloquee por 15 minutos (HTTP 429) a cualquier IP con 10 intentos fallidos de autenticación administrativa.
   - 🔒 **Header Exclusivo**: La clave administrativa **SOLO se transmite mediante la cabecera `X-Admin-Key`**. Queda estrictamente prohibido aceptar `adminKey` en el cuerpo del JSON (`body`) o en parámetros de consulta (`query`) en cualquier endpoint.
   - 🔒 **Sincronización Dual con Vercel**: `isValidAdminKey` debe verificar en tiempo constante (`crypto.timingSafeEqual`) contra `process.env.ADMIN_KEY` (configurada en Vercel) y `settings.adminKey` (configurada desde el panel web), garantizando que ambas funcionen sin desincronización ni bloqueos de acceso.
   - 🔒 **Sanitización de Datos Semilla**: Los objetos `DEFAULT_SEED_DEVICES` y `DEFAULT_SEED_USERS` en el código fuente deben permanecer siempre vacíos (`{}` y `[]`). En producción, los datos residen exclusivamente en Upstash Redis.

---

### 11. ⏱️ POLÍTICA DE ACCESO RÁPIDO DEMO (10 MIN HWID LOCK) Y PRESERVACIÓN PERMANENTE DE USUARIOS

1. **ACCESO RÁPIDO DEMO DE 10 MINUTOS (BLOQUEO ESTRICTO POR HWID)**:
   - 🛡️ El botón "Acceso Rápido Demo" permite evaluar la app sin crear cuenta durante un lapso improrrogable de **10 minutos**.
   - 🔒 **1 Único Uso por Dispositivo Físico (`HWID`)**: El servidor Gateway/Vercel y el Conector registran:
     `quickDemoStartedAt`, `quickDemoExpiresAt`, y `quickDemoUsed: true`.
   - 🚫 Cualquier intento posterior de acceso rápido desde el mismo celular recibe inmediatamente **HTTP 403 `QUICK_DEMO_EXPIRED`**, forzando al usuario a registrarse formalmente.

2. **PRUEBA DE 72 HORAS PARA CUENTAS REGISTRADAS**:
   - ✅ Todo usuario que completa el registro con correo y contraseña obtiene 72 horas completas de evaluación (`settings.demoDurationHours = 72`).

3. **PRESERVACIÓN ABSOLUTA DE CUENTAS DE USUARIO (ZERO PURGAS)**:
   - ❌ **TERMINANTEMENTE PROHIBIDO purgar, vaciar o truncar cuentas de usuarios registrados (`users.json` o Upstash Redis `mumanager:users`)** al expirar demos, reiniciar el servicio o ejecutar sincronizaciones.
   - ❌ **Abolición de Banderas de Purga**: Banderas históricas automáticas como `usersPurgedV168` están prohibidas y eliminadas del código.
   - 🔒 Las cuentas registradas persisten de por vida. Solo el administrador puede dar de baja una cuenta específica mediante `DELETE /api/admin/users/:username`.

4. **BLINDAJE DE CREDENCIALES EN CIERRE DE SESIÓN DEMO (`logoutDemo`)**:
   - 🔒 Al expirar el demo rápido o salir voluntariamente del modo demo, el cliente móvil **DEBE ejecutar obligatoriamente `logoutDemo()`**.
   - ❌ **PROHIBIDO invocar `logout(true)` en flujos demo**: Las credenciales saladas de la cuenta real guardadas en `SecureStorage` (`@mumanager_auth_pwhash`, `@mumanager_auth_user_saved`) no deben borrarse jamás por una sesión de demo, permitiendo al usuario volver a ingresar a su cuenta registrada sin tener que reescribir su clave.

---

### 12. 🛡️ SOLICITUDES DE PRUEBA PRO Y TELEMETRÍA FORENSE ANTI-ABUSO

1. **ENDPOINT OFICIAL DE SOLICITUD PRO (`POST /api/license/request-pro`)**:
   - 📋 La app móvil cuenta con un modal interactivo nativo donde el usuario solicita una prueba extendida PRO indicando su WhatsApp, correo y motivo.
   - 🔒 La solicitud se vincula irrevocablemente al `HWID` y a la telemetría del dispositivo en `data/proRequests.json` (y Upstash Redis), impidiendo spam de solicitudes y auditando el estado `PENDING_REVIEW`.

2. **TELEMETRÍA FORENSE DE DISPOSITIVOS**:
   - 🔍 Toda conexión a la pasarela registra y preserva forensemente:
     `hwid`, `deviceBrand`, `deviceModel`, `isEmulator`, `clientIp` y `lastActiveAt`.
   - 🔒 **Bloqueo Total de Mutaciones SQL en Modo Demo**: Cualquier intento de mutación SQL (`INSERT`, `UPDATE`, `DELETE`, procedimientos almacenados críticos) sin licencia PRO activa es interceptado por el middleware y denegado con **HTTP 403 `FUNCION_RESTRINGIDA_PRO`**.
   - 🚨 **WAF y Anti-Explotación**: Intentos reiterados de violación de permisos o patrones de inyección conllevan baneo automático de IP por 24 horas y registro de evento de seguridad en `securityLogs.json`.
