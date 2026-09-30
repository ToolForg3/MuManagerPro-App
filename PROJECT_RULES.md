# 📜 DIRECTRICES MAESTRAS Y REGLAS PERMANENTES DEL PROYECTO
> **IMPORTANTE PARA CUALQUIER AGENTE DE IA O DESARROLLADOR:**
> Este documento es la **FUENTE CANÓNICA MAESTRA Y ÚNICA VERDAD (SINGLE SOURCE OF TRUTH)** del proyecto **Mu Manager PRO**.
> Todo otro documento normativo (`GEMINI.md`, `.cursorrules`, etc.) deriva de este y debe alinearse estrictamente sin divergencias ni contradicciones.
> Antes de realizar cualquier cambio, agregar pantallas, modificar estilos o preparar actualizaciones, **DEBES LEER Y SEGUIR ESTAS REGLAS ESTRICTAMENTE**.

---

## 1. SISTEMA DE DISEÑO OFICIAL: STITCH APPROVED IRONFORGE

Las reglas de esta sección gobiernan exclusivamente la apariencia. La única fuente visual canónica es [`DESIGN.md`](./DESIGN.md), derivada de las ocho pantallas aprobadas del proyecto Google Stitch `348688986963428015`.

### Jerarquía visual obligatoria

1. Ocho pantallas Stitch aprobadas y enumeradas en `DESIGN.md`.
2. `DESIGN.md` como traducción canónica a React Native.
3. Capturas y HTML exportados únicamente como evidencia visual.
4. Cualquier propuesta generada por agentes.

Las reglas visuales históricas presentes en respaldos, prompts, auditorías o comentarios no tienen autoridad. Ante cualquier contradicción visual, prevalece `DESIGN.md`. El archivo `04 Biblioteca MU V2` es un catálogo visual y nunca debe convertirse en ruta, módulo o función.

### Límite funcional inquebrantable

- Un cambio visual no puede modificar rutas, parámetros, handlers, validaciones, permisos, datos, SQL, autenticación, licencias ni navegación.
- Toda migración visual debe conservar el 100% de controles y contenido mediante `INVENTARIO_UI_ANTES_DESPUES.csv` e `INVENTARIO_CONTENIDO_ANTES_DESPUES.csv`.
- Las verificaciones se clasifican como `PASS`, `FAIL` o `NO VERIFICADO`; la equivalencia estática no sustituye pruebas reales en dispositivo.
- El diseño oficial Stitch Approved Ironforge se implementa directamente en la APK general (`com.mumanager.pro`), quedando abolida cualquier bifurcación o concepto de "versión test" paralela. No autoriza publicación, despliegue, push ni incremento de versión sin orden explícita.

### Identidad resumida

- Consola oscura y compacta de fantasía técnica: piedra grafito, hierro forjado, plata envejecida y un único acento de oro antiguo.
- Geometría rectangular de 0 a 2 px, biseles duros, ranuras hundidas, marcos mecánicos y ornamentos de esquina.
- Tipografía `Domine` solo para títulos breves; `Roboto Flex` para cuerpo, formularios, datos y controles.
- Movimiento mínimo y funcional; sin brillos neón, vidrio, tarjetas SaaS, píldoras infladas ni animación decorativa perpetua.
- Objetivos mínimos: contraste WCAG AA, controles táctiles de 44x44 dp, adaptación móvil y ausencia de solapamientos.

### Reglas estrictas de renderizado visual y erradicación total del diseño antiguo
- ❌ **Prohibición Total de Bordes Lisos/Planos**: Queda terminantemente prohibido el uso de bordes rectos/planos de un solo color CSS (ej. `borderColor: '#4C463A'` o `borderColor: THEME.colors.borde` uniforme en los 4 lados sin profundidad). Toda superficie, botón, tarjeta, input, celda, barra y ranura debe emplear biseles chiseled multidireccionales (placas elevadas con luz superior/izquierda y sombra inferior/derecha, o ranuras hundidas con sombra superior/izquierda y reflejo inferior/derecho) o marcos con texturas oficiales del cliente MU.
- ❌ **Prohibición Total de Sobreposiciones en Botones**: Queda prohibido sobreponer pestañas flotantes o marcos artificiales (`cornerTabLeft`, `cornerTabRight` o bordes CSS redundantes) sobre botones o texturas nativas de MU (`btn_small.png`, `btn_big.png`, etc.). Los botones con texturas deben renderizarse limpios, nítidos y originales según su sprite oficial.
- 🎮 **Texturas Nativas Obligatorias en Botones, Pestañas, Modales y Selectores (100% Cobertura)**:
  - **Pestañas y Subnavegadores**: Deben renderizarse obligatoriamente con texturas nativas de MU (`STITCH_ASSETS.tabs.tabModeActive` para activo y `tabModeInactive` para inactivo). Prohibido usar cajas lisas de CSS o fondos amarillos planos (`backgroundColor: oroClaro`).
  - **Botones de Acción, Modales y Cabeceras**: Todos los botones de tarjetas, modales y cabeceras (`Detalle`, `Baúl`, `Bloquear`, `Eliminar`, `Nuevo PJ/Cuenta`, `Guardar`, `SYNC`, `BORRAR`, `OK`, `MOVER`, `EDITAR`, `COPIAR HWID`, `WHATSAPP`, `TELEGRAM`, `DESCARGAR E INSTALAR`, `ACTIVAR PRO`, etc.) deben renderizarse con sprites y texturas metálicas nativas de MU (`btn_small.png`, `btn_medium.png`, `btn_big.png`, `tab_mode_active.png`, `tab_mode_inactive.png` mediante `MuButton` o `ImageBackground`). Prohibido usar cajas negras o rojas planas de CSS con bordes de 1px.
  - **Steppers, Filtros y Botones Rápidos**: Todo selector de nivel/opción (`-`, `+`, `MAX`), botón de incremento (`+1000`, `+5000`), chip de filtro (raza, categoría, estado), switch de opciones (Luck, Skill, Exc, 380), catálogo de sets rápidos (`QUICK_SETS_CATALOG`), enlaces inter-módulos y presets de premios debe renderizarse con texturas nativas de MU (`tabModeActive`/`tabModeInactive` vía `ImageBackground` o `MuButton`), erradicando botones rectangulares planos con `borderWidth: 1`.
  - **Contenedores Táctiles Anti-Sangrado**: Todo `TouchableOpacity` que aloje una textura nativa `ImageBackground` debe declarar explícitamente `borderRadius: 2, overflow: 'hidden'` para garantizar un recorte perfecto en Android y evitar sangrados de textura en esquinas biseladas.
  - 🚫 **Prohibición de Alturas Porcentuales en Touchables No Acotados (Anti-Estiramiento Yoga)**: Queda terminantemente prohibido utilizar `height: '100%'` en un `ImageBackground` o `View` cuando su `TouchableOpacity` padre carece de altura rígida (por ejemplo, con solo `minHeight: 34` o sin altura acotada). En el motor de maquetación Yoga de React Native, una altura porcentual en un contenedor flexible se evalúa contra el viewport completo, estirando los botones verticalmente hasta abarcar el 100% de la pantalla. Todo botón o selector con textura debe declarar una altura numérica explícita fija en dp (`height: 32`, `height: 36`, `height: 40`, `height: 44`).
  - 🏛️ **Estiramiento Completo Borde a Borde en Zócalos Góticos (`gothicBottomFooter`)**: Todo zócalo o marco inferior gótico (`STITCH_ASSETS.decorations.gothicBottomFooter`) debe renderizarse obligatoriamente con `resizeMode="stretch"` y `width: '100%'` (o acotado al ancho de su tarjeta/modal). Prohibido utilizar `resizeMode="contain"` en pies de modales o pantallas, ya que la relación de aspecto 190x45 colapsa la imagen a una franja angosta central (~135-180 px), dejando los extremos del borde vacíos.
  - 📏 **Blindaje de Encabezados Compactos Anti-Aplastamiento**: En cabeceras ricas (ej. `CharacterEditScreen`), los botones de acción (`VOLVER`, `SYNC`, `BORRAR`) deben tener anchos y alturas fijas compactas (`width: 68`, `altura: 34`, `flexShrink: 0`). El área de título central debe declarar `flex: 1`, `minWidth: 80`, `numberOfLines={1}` y `ellipsizeMode="tail"` con `flexWrap: 'nowrap'` para evitar el aplastamiento horizontal a pocos píxeles y el envoltura vertical de badges.
- 🔆 **Estándar de Contraste Tipográfico Canónico (WCAG AAA)**:
  - **Pestañas y Botones Activos (`tabModeActive`, `btn_*.png`)**: El texto e iconos deben renderizarse obligatoriamente en oro radiante `#FEDF99` o `#EFD28D` con `fontWeight: '900'` y sombra sutil (`...THEME.effects.textShadowSubtle`), garantizando contraste óptico nítido superior a 12:1 sobre el fondo de piedra oscura de la textura. ❌ **Cero texto negro u oscuro (`#0D0E0D`, `#252625`) sobre texturas nativas**.
  - **Pestañas Inactivas (`tabModeInactive`)**: El texto e iconos deben renderizarse en plata/acero gótico `#CDC6B9` o `#A8A296` con `fontWeight: '700'`.
  - **Superficies de Alerta Doradas Sólidas (CSS plano excepcional)**: Si se usa un fondo sólido amarillo oro `#EFD28D`, el texto usa `#0D0E0D` gótico oscuro. Sobre cualquier textura nativa de MU, el texto siempre es oro radiante o plata clara.
- 🛡️ **Depuración Completa del Diseño Antiguo e Integración de Texturas Nativas**: Todo módulo de la app móvil (stats, barras de progreso, catálogo de skills, cuadrículas de inventario, baúl/almacén [vault], creador de objetos, modales de seguridad/bloqueo, banners de watermark y pestañas de herramientas) debe utilizar acabados metálicos y texturas nativas de MU, erradicando fondos planos, paletas genéricas o colores desincronizados de IA.
- 📱 **Adaptabilidad Multi-Resolución y Legibilidad**: Todo componente debe adaptarse a diferentes densidades y anchos de pantalla móvil sin desbordes horizontales, manteniendo una jerarquía tipográfica legible (alto contraste con `...THEME.effects.textShadow` o `textShadowSubtle` sobre superficies oscuras) y un espaciado limpio sin ruido visual.

La paleta, tipografía, componentes, estados, espaciado, movimiento, prohibiciones y mapeo exacto de pantallas se mantienen únicamente en `DESIGN.md` para evitar duplicación y futuros conflictos.

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
   - `npm run check:contrast` como verificador técnico de contraste; `DESIGN.md` es la autoridad de paleta y cualquier regla histórica codificada por el script debe reportarse, no imponerse al nuevo diseño.
2. **Compilar el Release APK (Hermes Bytecode)**:
   - `cd android && ./gradlew.bat assembleRelease`
   - Genera el binario en: `android/app/build/outputs/apk/release/app-release.apk`
3. **Condición Obligatoria de Autorización Explícita del Usuario para Publicar o Desplegar**:
   - ⚠️ **PROHIBICIÓN TOTAL DE AUTO-PUBLICACIÓN**: Queda **TERMINANTEMENTE PROHIBIDO** ejecutar `node scripts/release-update.js`, realizar `git push`, desplegar a producción (Vercel/servidores) o sincronizar repositorios hermanos (`MuManagerPro-App`, `MuManagerPro-Gateway`) sin una orden explícita, directa e inequívoca del usuario en el turno actual ("publica", "despliega", "haz push", "lanza la actualización").
   - Preparar una versión, compilar artefactos o ejecutar suites de pruebas **NO constituye autorización para publicar**. Todo binario y cambio permanece estrictamente local hasta recibir aprobación expresa.
   - **Bloqueo Incondicional de Publicación**: Si existen defectos comprobados de severidad Crítica o Alta en seguridad, integridad de datos o flujos esenciales, queda estrictamente bloqueada cualquier recomendación o ejecución de publicación.
4. **Ejecución del Pipeline (Exclusivamente tras Autorización Expresa)**:
   - Una vez recibida la instrucción directa del usuario:
     `node scripts/release-update.js`
   - Copia a Escritorio, sincroniza repositorios `MuManagerPro-App` y `MuManagerPro-Gateway`, hace push a GitHub y actualiza la pasarela.

---

## 📱 5. ERGONOMÍA MÓVIL Y MODALES

- Todos los modales y diálogos deben adaptarse al viewport y a las áreas seguras, mantener sus acciones alcanzables y habilitar desplazamiento vertical con `nestedScrollEnabled` cuando el contenido lo requiera.
- Tamaño, geometría, superficie, marco y espaciado se rigen exclusivamente por `DESIGN.md`; no conservar medidas visuales heredadas como constantes universales.

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
   - 🔒 **Autoridad Exclusiva del Servidor sobre Secretos Maestros**: `MASTER_SECURITY_SALT` reside **exclusivamente en las variables de entorno del servidor** (`process.env.MASTER_SECURITY_SALT`). Queda terminantemente prohibida la exigencia o práctica de distribuir el salt dentro del APK mediante ofuscación XOR (en `stringObfuscator.ts` o cualquier otro módulo), dado que la ofuscación en binarios cliente no protege un secreto distribuido. La validación, firma y autorización criptográfica es potestad exclusiva e inmutable del servidor.
   - 🔒 **Separación estricta de firma Android**: `mumanager-release.keystore`, sus contraseñas y cualquier alias privado NUNCA pueden estar en `android/gradle.properties`, `.env`, archivos de código, scripts, documentación, respaldos, repositorios o rutas servidas. `android/gradle.properties` solo puede contener propiedades no secretas.
   - 🔒 La compilación release debe obtener exclusivamente `RELEASE_STORE_FILE`, `RELEASE_STORE_PASSWORD`, `RELEASE_KEY_ALIAS` y `RELEASE_KEY_PASSWORD` desde el entorno seguro de la sesión de compilación o un gestor de secretos local excluido de Git. Si falta cualquiera, Gradle debe abortar: nunca usar `debug.keystore` ni valores fallback.
   - 🔒 Vercel administra secretos del backend (`ADMIN_KEY`, JWT, SMTP y sales); no es una fuente automática de credenciales de firma para Gradle local. No asumir que una variable existe en Vercel sin comprobarla allí mediante una acción autorizada.
   - 🔒 Si un secreto de firma o administración aparece en texto plano, se considera comprometido: bloquear publicación, revocarlo/rotarlo por el administrador de infraestructura y eliminarlo antes de continuar. No imprimirlo, copiarlo ni registrarlo.
   - 🔒 Antes de una compilación de distribución se exige un escaneo de secretos sobre archivos rastreables y la verificación de que el APK no contiene `.env`, source maps, claves, sales, contraseñas ni secretos de servidor. Una coincidencia es FAIL y bloquea distribución.
   - 🔒 R8/ProGuard, Hermes y la ofuscación de JavaScript son capas de dificultación, no almacenamiento de secretos ni garantía contra decompilación. Nunca describir el APK como “imposible de descompilar”. Todo cambio de ofuscación requiere pruebas de arranque, navegación y flujos críticos en dispositivo.

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

2. **AUTORIDAD ABSOLUTA DEL SERVIDOR Y VERIFICACIÓN DE LICENCIAS EN TELEMETRÍA**:
   - 🔒 **Autoridad Estricta del Servidor**: La condición de licencia `PRO` y los permisos asociados dependen exclusivamente de la autorización registrada y validada en el servidor (Upstash Redis / `devices.json`).
   - ❌ **Prohibición Total de Autoactivación por el Cliente**: Una clave matemáticamente válida enviada unilateralmente por el cliente (`verifyKey`) en `/api/telemetry/ping` **JAMÁS concede modo PRO ni desactiva el modo demo**. El servidor no confía en aserciones criptográficas emitidas por el cliente sin un registro de licencia previamente autorizado y asignado por el administrador.
   - 🛡️ Si el cliente envía una clave no autorizada o ausente en el almacén central del servidor, el servidor deniega el estado PRO y ordena el saneamiento de la clave (`forceWipeKey: true`).
   - 🔒 En el cliente APK (`licenseService.ts`), el borrado local de licencia en `AsyncStorage` solo debe ejecutarse si el servidor ordena explícitamente `forceWipeKey: true` o `forceDemo: true`.

3. **ACCESO AUTORIZADO AL MODO DEMO (PRUEBA DE 72 HORAS)**:
   - 🛡️ El middleware de seguridad Zero-Trust **DEBE permitir a los dispositivos en período de prueba activo (`isDemoActive`)** acceder a las rutas de datos estándar (`/api/accounts`, `/api/character`, `/api/warehouse`, `/api/guilds`, `/api/pk`, `/api/players`, `/api/items`, `/api/mu`).
   - Las rutas críticas de administración y sistema (`/api/tools`, `/api/gm`, `/api/ip`, `/api/prizes`) permanecen **estrictamente exclusivas** para licencias `PRO` activas o rol `ADMIN`.

4. **SEGURIDAD DEL PANEL DE CONTROL Y RATE LIMITING ADMINISTRATIVO**:
   - 🔒 **Rate Limiting Administrativo**: El router `/api/admin/*` debe contar con un limitador en memoria que bloquee por 15 minutos (HTTP 429) a cualquier IP con 10 intentos fallidos de autenticación administrativa.
   - 🔒 **Header Exclusivo**: La clave administrativa **SOLO se transmite mediante la cabecera `X-Admin-Key`**. Queda estrictamente prohibido aceptar `adminKey` en el cuerpo del JSON (`body`) o en parámetros de consulta (`query`) en cualquier endpoint.
   - 🔒 **Sincronización Dual con Vercel**: `isValidAdminKey` debe verificar en tiempo constante (`crypto.timingSafeEqual`) contra `process.env.ADMIN_KEY` (configurada en Vercel) y `settings.adminKey` (configurada desde el panel web), garantizando que ambas funcionen sin desincronización ni bloqueos de acceso.
   - 🔒 **Sanitización de Datos Semilla**: Los objetos `DEFAULT_SEED_DEVICES` y `DEFAULT_SEED_USERS` en el código fuente deben permanecer siempre vacíos (`{}` y `[]`). En producción, los datos residen exclusivamente en Upstash Redis.

5. **DIFERENCIACIÓN ESTRICTA ENTRE EXPIRACIÓN Y BLOQUEO (ZERO AUTO-BLOQUEOS POR VENCIMIENTO)**:
   - ❌ **Prohibición de Auto-Bloqueo**: Al finalizar el período PRO o de Prueba (Demo), el sistema **JAMÁS debe mutar `dev.blocked = true`** automáticamente. El bloqueo (`blocked: true`) queda reservado con carácter exclusivo a la decisión manual y deliberada del Administrador (Kill-Switch).
   - ⏳ **Identificación de Vencidos**: Un dispositivo con tiempo cumplido se identifica exclusivamente mediante `expiresAt < now`, `isDeviceExpired: true` y `expireReason: 'expired'`.
   - 📊 **Panel de Control y Notificaciones**: El panel administrativo (`adminDashboard.html`) debe distinguir claramente estos estados:
     - Tarjeta KPI dedicada: `⏳ Vencidos (Renovación)` (`metric-expired`), separada de `⛔ Bloqueados (Admin)`.
     - Badges de color ámbar/dorado para `⏳ Vencido (PRO)` y naranja/brasa para `⏳ Vencido (TEST)`, prohibiendo el rojo de bloqueo para expiraciones.
     - Pestaña de filtrado rápido `⏳ Vencidos` (`view-btn-expired`) y banner de alerta superior en la vista de celulares.
     - El botón de acción en la fila de dispositivos vencidos debe mantenerse como `⛔ Bloquear` para permitir la sanción discrecional del administrador.

6. **EXPERIENCIA EN LOGIN ANTE EXPIRACIÓN Y SOLICITUD DE RENOVACIÓN**:
   - 📱 **Permanencia en Login**: Al expirar el tiempo de un dispositivo, la aplicación móvil **NUNCA debe expulsar al usuario a una pantalla roja de bloqueo de hardware**. El usuario debe permanecer libremente en la pantalla de `Login`.
   - 🔒 **Respuesta Autorizada en Login**: Al intentar autenticarse en un dispositivo expirado (y no ser cuenta ADMIN), el backend responde con **HTTP 403 `LICENCIA_EXPIRADA`**.
   - 💬 **Diálogo y Botón Directo de Solicitud**: La app muestra un diálogo informativo claro indicando que su período concluyó e invitando a adquirir PRO o solicitar tiempo extra de demo, incorporando el botón táctil interactivo **`⭐ Solicitar PRO / Extra Demo`** para abrir de inmediato el modal de solicitud (`openProModal`) y el botón `Entendido`.

7. **ESTÁNDAR CRONOMÉTRICO UNIVERSAL UTC Y EXTENSIÓN ACUMULATIVA**:
   - ⏱️ **Cálculo Universal en Epoch / UTC**: Toda fecha de expiración debe generarse y serializarse en formato ISO 8601 UTC (`expDate.toISOString()`), y toda comparación y cálculo de descuento debe ejecutarse sobre milisegundos universales (`Date.now()`), garantizando independencia absoluta de husos horarios o alteraciones del reloj local del dispositivo.
   - ➕ **Extensiones Acumulativas**: Al conceder tiempo adicional (`extend-demo`), el cálculo debe realizarse mediante:
     `baseTime = Math.max(Date.now(), currentExpires) + addMs`
     asegurando que si el usuario aún posee tiempo a favor se le sumen los nuevos días u horas al final de su vigencia previa, y si ya expiró, el cómputo comience a partir del instante presente.

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

---

### 13. 📐 PRINCIPIOS DE INGENIERÍA, CONTROL DE CALIDAD Y GESTIÓN DE CAMBIOS

1. **CAMBIOS PEQUEÑOS, REVERSIBLES Y CON BASE IDENTIFICADA**:
   - Toda intervención técnica debe ser modular, atómica y con alcance estrictamente acotado.
   - Cada entrega debe documentar la línea base previa (hashes de commit, versiones o estado previo de archivos), los archivos modificados exactos, las limitaciones conocidas del cambio y un procedimiento paso a paso para la reversión (*rollback*).

2. **REPRODUCCIÓN PREVIA Y PRUEBAS DE COMPORTAMIENTO**:
   - **Antes**: Reproducir o aislar fehacientemente el defecto antes de aplicar cualquier modificación sobre el código.
   - **Después**: Implementar y ejecutar pruebas de comportamiento (*behavioral assertions*) que certifiquen la solución del problema en escenarios dinámicos, no limitándose a validar que el código compile sin errores sintácticos.

3. **PRUEBAS SOBRE CÓDIGO REAL Y AISLAMIENTO DE FALLOS DE ENTORNO**:
   - Las pruebas deben ejecutarse directamente sobre los módulos y funciones reales del sistema (sin sustituir la lógica crítica con mocks artificiales triviales).
   - Se deben diferenciar con precisión los fallos atribuibles a infraestructura o entorno local (puertos saturados, caídas transitorias de red, timeouts de sandbox) de fallos genuinos de lógica del software.

4. **MODELO ZERO-TRUST EN DEMO, VINCULACIÓN TOKEN/HWID Y REVOCACIÓN EFECTIVA**:
   - **Denegación Predeterminada (Default-Deny)**: Ante cualquier estado ambiguo, token malformado o ruta sin permisos explícitos, el sistema debe denegar el acceso (HTTP 401/403).
   - **Vinculación Estricta Token/HWID**: Todo token emitido debe estar vinculado criptográficamente al identificador físico (`hwid`) del dispositivo (`req.body.hwid === token.hwid`). Si falta o hay discrepancia, se rechaza inmediatamente con HTTP 403 `HWID_MISMATCH`.
   - **Revocación Inmediata y Efectiva**: El incremento de `sessionVersion` o el bloqueo administrativo de un usuario debe invalidar inmediatamente todos los tokens vigentes en circulación, sin depender de la expiración temporal cronológica del JWT.

5. **IDEMPOTENCIA, CONCURRENCIA Y RESILIENCIA ANTE REINICIOS**:
   - Toda operación de mutación sensible debe implementar claves de idempotencia gestionadas mediante una máquina de estados estricta (`PENDING` -> `COMPLETED`).
   - **Aislamiento de Ámbito**: La unicidad de la clave debe aislarse a nivel de usuario, ruta y hash del payload (`user:path:bodyHash`) para evitar colisiones cruzadas o fuga de datos entre cuentas.
   - **Políticas de Capacidad**: Los almacenes de idempotencia en memoria deben implementar límites de tamaño con políticas de desalojo que **NUNCA descarten claves en estado `PENDING`** (operaciones en vuelo).
   - El sistema debe ser tolerante a concurrencia elevada (bloqueos atómicos de exclusión mutua) y reiniciar de forma segura sin dejar registros transaccionales corruptos o inconclusos.

6. **INTEGRIDAD DE BASE DE DATOS Y ENTORNO PRODUCTIVO**:
   - **Compatibilidad Dual Louis S6 & MSPro**: Louis S6 es el estándar de referencia inmutable. Las consultas deben ser dinámicas y utilizar introspección segura (`COL_LENGTH`, `OBJECT_ID`).
   - ❌ **Prohibición de DDL en Caliente**: Cero `ALTER TABLE`, `DROP` o mutaciones de esquema en tiempo de ejecución.
   - ❌ **Prohibición Estricta de Pruebas sobre Entornos Productivos**: Queda terminantemente prohibido ejecutar scripts de prueba, tests de carga o comandos de verificación destructivos contra bases de datos reales o servicios en producción. Las pruebas se ejecutan exclusivamente en bases de prueba aisladas o arneses de test locales.

7. **VERIFICACIÓN DEL PANEL ADMINISTRATIVO DE EXTREMO A EXTREMO (E2E)**:
   - Toda funcionalidad o ajuste en el panel de control administrativo debe auditarse verificando integralmente sus 5 fases:
     1. *Acción*: Disparo correcto desde el control de la interfaz (botón, toggle, formulario).
     2. *Autorización*: Validación estricta de credenciales en el backend (`X-Admin-Key` / JWT con rol ADMIN).
     3. *Persistencia*: Confirmación de escritura atómica en almacenamiento (Upstash Redis / archivo JSON).
     4. *Respuesta*: Emisión del código HTTP correspondiente y carga útil saneada sin exposición de secretos.
     5. *Estado Visible*: Actualización reactiva inmediata en la interfaz sin requerir recarga forzada ni dejar estados desincronizados.

8. **MEDICIONES DE DESEMPEÑO RIGUROSAS**:
   - Al medir o reportar métricas de rendimiento, se debe distinguir taxativamente entre pruebas sintéticas locales (micro-benchmarks en memoria / sandbox) y métricas de desempeño en producción (latencia real de internet, cold starts de serverless, cuellos de botella de red y contención del pool de conexiones SQL).

9. **VALIDACIÓN MULTINIVEL OBLIGATORIA**:
   - Todo cambio debe superar satisfactoriamente:
     1. Verificación de sintaxis y tipos estáticos: `npm run ts:check` (0 errores).
     2. Verificación de reglas de contraste y accesibilidad visual: `npm run check:contrast`.
     3. Suite completa de no-regresión: `npm test` (100% pruebas pasando).
     4. Verificación funcional específica del componente modificado.

10. **CRITERIOS DE CLASIFICACIÓN DE HALLAZGOS Y AUDITORÍA**:
    - Todo informe de auditoría, verificación o checklist debe categorizar de manera explícita cada hallazgo en una de tres clasificaciones:
      - `PASS`: Verificado y validado empíricamente de forma completa.
      - `FAIL`: No cumple el estándar o presenta discrepancias demostrables.
      - `NO VERIFICADO`: No pudo comprobarse por limitaciones del entorno o requiere validación bajo condiciones especiales no disponibles.

11. **BLOQUEO INCONDICIONAL DE PUBLICACIÓN ANTE DEFECTOS CRÍTICOS O ALTOS**:
    - Si se detecta un defecto comprobado de severidad Crítica o Alta que afecte la seguridad, la integridad de los datos o los flujos esenciales del sistema (autenticación, licenciamiento, transacciones SQL), queda **TERMINANTEMENTE BLOQUEADA cualquier recomendación o ejecución de publicación** hasta que dicho defecto esté 100% subsanado y validado.

12. **PROHIBICIÓN DE DECLARAR SEGURIDAD TOTAL BASÁNDOSE EN PRUEBAS AUTOMÁTICAS**:
    - Queda estrictamente prohibido emitir declaraciones de "seguridad absoluta", "cero vulnerabilidades" o "blindaje impenetrable" fundamentadas únicamente en el resultado exitoso de suites de pruebas automáticas. Las pruebas automáticas únicamente confirman el comportamiento ante los casos y vectores explícitamente programados, pero no garantizan la inexistencia de vectores de ataque imprevistos.

---

## 🔒 14. MINIMIZACIÓN DE SUPERFICIE, PRIVACIDAD Y TRANSPARENCIA TÉCNICA (NORMATIVA CANÓNICA)

1. **ESTÁNDAR CRIPTOGRÁFICO DE ALMACENAMIENTO LOCAL (`SecureStorage` ENC_V3)**:
   - Todo resguardo de credenciales locales u hashes en el dispositivo debe utilizar cifrado autenticado de estándar **`ENC_V3:`** (PBKDF2/SHA-256 de al menos 500 rondas iterativas + HMAC-SHA256 Encrypt-then-MAC).
   - ❌ **Prohibición de Cifrado Trivial Reversible**: Queda terminantemente prohibido utilizar esquemas de XOR simple de una ronda sin código de autenticación de mensajes (MAC).
   - 🔄 **Migración Transparente**: Toda rutina de lectura de almacenamiento debe detectar y migrar automáticamente cargas heredadas (`ENC_V2:` o texto plano) hacia `ENC_V3:`.
   - 🔒 **Erradicación de Residuos en Claro**: Queda prohibido persistir la clave administrativa (`@mumanager_admin_key`) u otros secretos en `AsyncStorage`. Toda mutación de claves debe purgar de inmediato cualquier residuo legible de `AsyncStorage`.

2. **ACOTACIÓN ESTRICTA DE CREDENCIALES EN TRANSPORTE HTTP (`X-Admin-Key`)**:
   - 🔒 En el cliente móvil (`sqlClient.ts`), la cabecera sensible `X-Admin-Key` solo debe adjuntarse en peticiones cuyo destino comience explícitamente por `/api/admin`.
   - ❌ **Prohibición de Dispersión**: Jamás debe transmitirse `X-Admin-Key` hacia rutas generales de datos SQL, telemetría o endpoints públicos. Se prohíbe además el uso de cabeceras redundantes innecesarias como `X-Session-Token`.

3. **MINIMIZACIÓN DE RESPUESTAS EN TELEMETRÍA PÚBLICA**:
   - 🔒 El endpoint de consulta de estado de dispositivos (`/api/telemetry/check/:hwid`) debe responder de forma estrictamente mínima y opaca ante peticiones anónimas o sin credenciales administrativas válidas:
     `{ registered: boolean, blocked: boolean, mode: string }`.
   - ❌ **Prohibición de Fuga de Metadatos**: Queda prohibido exponer marcas temporales (`lastSeen`), fechas de vencimiento (`expiresAt`), motivos de sanción (`blockReason`) o notas internas a visitantes no autorizados.

4. **SANITIZACIÓN DE REGISTROS DE DEPURACIÓN Y CONFIRMACIÓN EXPLÍCITA**:
   - 🔍 Las herramientas de diagnóstico de red y rendimiento no deben exponer datos sensibles en claro.
   - 🛡️ Al compartir o exportar registros de depuración:
     - Las direcciones IP o hosts de base de datos deben enmascararse (`maskHost`).
     - Las consultas SQL deben sanitizarse mediante `sanitizeQueryForExport`, sustituyendo literales y parámetros por `'[REDACTED]'`.
     - La interfaz de usuario debe solicitar obligatoriamente una **confirmación previa con previsualización** antes de transferir logs a canales externos.

5. **BLINDAJE DE MENSAJES DE ERROR (ANTI-FUGA DE INFRAESTRUCTURA)**:
   - 🔒 **Backend**: Los controladores de rutas y middlewares jamás deben emitir en la respuesta JSON el mensaje de error interno original del motor (`err.message`), rutas de archivos locales ni detalles de sintaxis SQL. Se debe invocar `sendSafeInternalError(res, err, context)` para registrar el detalle en logs internos y responder al cliente con un mensaje genérico y un código de seguimiento de auditoría (`ERR_...`).
   - 📱 **Frontend**: `ErrorBoundary` y componentes de vista deben atrapar excepciones de renderizado mostrando un mensaje seguro con identificador de soporte (`ERR_UI_...`), suprimiendo trazas de pila técnicas.

6. **PERSISTENCIA EFÍMERA DE CACHÉS ADMINISTRATIVAS EN NAVEGADOR (`sessionStorage`)**:
   - 🔒 En el Panel de Control Web (`adminDashboard.html`), los datos de inventario administrativo (`mumanager_users_cache`, `mumanager_devices_cache`) **deben residir exclusivamente en `sessionStorage`**.
   - ❌ **Prohibición de `localStorage` para Datos de Sesión**: Queda prohibido persistir listados de usuarios o celulares en `localStorage` del navegador, garantizando que toda información confidencial se desaloje automáticamente al cerrar la pestaña o ventana del navegador.

7. **ACOTACIÓN DE PERMISOS NATIVOS Y POLÍTICA DE ALMACENAMIENTO ANDROID**:
   - 📱 En `AndroidManifest.xml`, los permisos `READ_EXTERNAL_STORAGE` y `WRITE_EXTERNAL_STORAGE` deben declararse obligatoriamente con el atributo `android:maxSdkVersion="28"`.
   - En Android 10+ (API 29+) se debe utilizar exclusivamente el almacenamiento privado scoped de la aplicación sin exigir permisos invasivos de almacenamiento global al usuario.
   - Todos los permisos declarados deben figurar de forma transparente en la documentación pública y en la ficha técnica del portal web.

8. **ENMASCARAMIENTO DE HWID Y CONSENTIMIENTO DE SOPORTE**:
   - 📱 El identificador de hardware del dispositivo (`HWID`) debe presentarse enmascarado por defecto en la pantalla de configuración (`CEL-••••-••••-XXXX`) para prevenir miradas indiscretas, contando con un botón de revelación táctil temporal.
   - 💬 Antes de invocar aplicaciones externas de mensajería (WhatsApp) con enlaces profundos, la app debe desplegar un diálogo de consentimiento que permita al usuario decidir explícitamente si desea incluir su identificador técnico en el mensaje prellenado.

9. **TRANSPARENCIA EDITORIAL Y PROHIBICIÓN DE GARANTÍAS ABSOLUTAS EN LA WEB**:
   - ❌ **Prohibición de Promesas Absolutas**: Queda terminantemente prohibido utilizar en el portal web, app o documentación expresiones engañosas o redundantes como *"seguridad militar"*, *"garantía corporativa absoluta"*, *"totalmente seguro"* o *"jamás será vulnerado/hackeado"*.
   - 🌐 **Arquitectura Unificada y Realista**: Se debe explicar con rigor técnico el modelo de conexión: Gateway HTTPS seguro preconfigurado o Conector Local Windows para administradores que requieren mantener SQL Server restringido a `localhost`. Queda prohibido afirmar que el móvil conecta mediante socket binario TDS directo al puerto 1433 sin pasar por los servicios autorizados.
   - 📋 **Política de Privacidad Integral**: La Política de Privacidad debe detallar con precisión la totalidad de los datos transmitidos en telemetría (HWID, versión, plan, modelo/marca, flag emulador, sesión), su propósito estricto de licenciamiento/seguridad y el tratamiento cifrado de credenciales de base de datos.

10. **SINCRONIZACIÓN AUTOMÁTICA DEL VERIFICADOR DE INTEGRIDAD Y AISLAMIENTO DE BINARIOS**:
    - 🔒 **Pipeline Atómico**: El pipeline de lanzamiento (`release-update.js`) debe inspeccionar obligatoriamente mediante criptografía el hash SHA-256 y tamaño exacto en bytes del nuevo binario compilado, actualizando de forma automatizada `website/js/hash-verifier.js` y `server/website/js/hash-verifier.js`.
    - 📁 **Aislamiento de Binarios Obsoletos**: Los artefactos y versiones compiladas anteriores deben resguardarse en carpetas locales dedicadas (`APKs_Resguardo_Local/`), fuera del árbol de directorios servidos estáticamente por la web, manteniendo únicamente en distribución pública el APK canónico oficial y sus alias designados.
    - 🔍 **Aseveraciones del Verificador**: El texto del verificador web debe limitarse a certificar la *coincidencia de integridad bit a bit con el SHA-256 oficial publicado*, sin emitir aserciones de firmas de código complejas o certificados antivirus que no forman parte del cálculo de un resumen criptográfico en navegador.

---

## 💎 15. SINCRONIZACIÓN MONOTÓNICA, COHERENCIA DE LICENCIAS Y EXPERIENCIA DE SESIÓN (v2.2.0 & v2.2.1)

1. **REVISIONES MONOTÓNICAS AUTORITATIVAS (`authRevision` Y `authUpdatedAt`)**:
   - 🛡️ Todo cambio en el estado de autorización de un dispositivo (`mode`, `blocked`, `expiresAt`, `licenseKey`, `forceDemo`) en cualquier backend (Gateway o Conector) o endpoint administrativo (`/mode`, `/toggle-block`, `/set-expiration`, `/emergency-lock`, `/extend-demo`, `/generate-key`) DEBE incrementar monótonamente `dev.authRevision = (Number(dev.authRevision) || 0) + 1` y fijar `dev.authUpdatedAt = Date.now()`.
   - 🔄 **Resolución de Conflictos Multi-Instancia (`syncCloudStorage`)**: En sincronizaciones entre instancias o con almacenamiento en la nube, el registro con mayor `authRevision` (o mayor `authUpdatedAt` en caso de empate) prevalece irrevocablemente. La nube desempata registros heredados (*legacy*). Queda formalmente abolida la priorización ciega de PRO sobre DEMO.

2. **INVARIANTE DE COHERENCIA DE TOMBSTONES Y CLAVES ACTIVAS**:
   - 📜 `saveTombstones()` debe gestionar explícitamente `version` y `updatedAt`.
   - 🔒 **Prohibición de Resurrección de Claves**: Ninguna clave asignada a un dispositivo que se encuentre activo autoritativamente como PRO (`mode === 'PRO' && !forceDemo`) puede residir en la lista de claves revocadas (`revokedKeys`). Al unificarse tombstones entre instancias locales y cloud, las claves activas PRO se purgan de inmediato de `revokedKeys`.

3. **AISLAMIENTO DE DECISIÓN EN TELEMETRÍA Y CERO DEMOCIÓN POR CLAVE OBSOLETA**:
   - 🛡️ El otorgamiento del modo PRO es potestad exclusiva del servidor. Si el servidor determina autoritativamente que un dispositivo es PRO (`isServerAuthoritativePro`), la recepción rutinaria de claves desactualizadas o residuales enviadas por el APK móvil en el ping NO debe demotar el dispositivo a DEMO.
   - 🚫 Únicamente la revocación explícita de la clave activa vigente del servidor en tombstones puede degradar un equipo PRO a DEMO.

4. **DESACOPLAMIENTO DE ESCRITURAS CLOUD EN TELEMETRÍA RUTINARIA (`skipCloudWrite`)**:
   - ⚡ Los pings de telemetría periódicos (cada 45-60s) que no modifiquen el estado de autorización del celular deben invocar `saveDevices(devices, { skipCloudWrite: true })`. Las escrituras completas a Upstash Redis se reservan con exclusividad para altas de nuevos dispositivos o transiciones reales de estado.

5. **COALESCENCIA SINGLE-FLIGHT EN SINCRONIZACIÓN DE ALMACENAMIENTO**:
   - 🚀 Múltiples llamadas concurrentes a `syncCloudStorage` deben coalescer en una única promesa en vuelo (`activeSyncPromise`), garantizando que todas las solicitudes esperen la misma operación sin generar lecturas duplicadas ni sobreescrituras desordenadas.

6. **FILTRO DE DESORDEN Y COLA SERIALIZADA EN LA APLICACIÓN MÓVIL (`LicenseService`)**:
   - 📱 La aplicación móvil debe descartar silenciosamente cualquier respuesta de telemetría cuya `authRevision` sea menor que la última procesada (o igual pero con `authUpdatedAt` menor), blindando la UI contra la recepción desordenada de paquetes TCP/UDP en conexiones móviles inestables y suprimiendo el bucle de alertas alternadas.
   - 🔒 **Cola FIFO Atómica en `AsyncStorage`**: Toda operación de persistencia o purga de licencias locales (`setItem` / `removeItem`) debe canalizarse obligatoriamente a través de `queueStorageOperation`, garantizando ejecución estrictamente secuencial y libre de condiciones de carrera en el almacenamiento del dispositivo.

7. **ERRADICACIÓN DE ESTADO ZOMBIE Y VALIDACIÓN ACTIVA DE SESIÓN (v2.2.0)**:
   - 🔌 Ante cualquier respuesta HTTP 401 (`NO_AUTORIZADO`, `TOKEN_EXPIRADO`, `HWID_MISMATCH`) en consultas de datos o métricas, el cliente móvil (`sqlClient.ts`) debe purgar de inmediato el token de sesión y forzar el estado no autenticado, erradicando la etiqueta engañosa "SQL Conectada".
   - 🛡️ Al iniciar la app, `AuthContext` valida activamente el token contra `/api/auth/validate-session` antes de confiar en la sesión local. Si la sesión expiró o fue invalidada, se presenta el botón interactivo de inicio de sesión sin obligar a reinstalar la app.

8. **AUTO-ACTIVACIÓN HÍBRIDA Y DEEP LINKING (v2.2.0)**:
   - ✉️ El flujo de verificación de cuentas soporta activación por enlace web de 1 solo clic (`GET /api/auth/activate`), código numérico tradicional y deep linking móvil (`mumanager://`).
   - 📱 La aplicación móvil escucha los cambios de estado en primer plano (`AppState: active`), consultando `/api/auth/check-status` para cerrar automáticamente el modal de verificación en cuanto el usuario activa su cuenta en el navegador web.

9. **DEPURACIÓN ESTÉTICA Y BANCO DE JOYAS KUNDUN +1..+5 (v2.2.0)**:
   - 🎨 Se prohíbe duplicar encabezados, barras de navegación o tabs redundantes en pantallas secundarias (ej. `PlayersHubScreen`, `ToolsScreen`).
   - 💎 El banco de joyas soporta oficialmente Box of Kundun +1 al +5 con sprites transparentes del cliente original de juego y sincronización universal con Louis S6 y MSPro.

---

## 🧹 16. PROTOCOLO DE SANEAMIENTO A CERO (TABULA RASA) Y AUTORIDAD DEL SERVIDOR EN PANEL WEB

1. **AUTORIDAD ABSOLUTA DEL SERVIDOR EN EL PANEL WEB (`adminDashboard.html`)**:
   - 🛡️ El servidor y la nube (Upstash Redis) son la **única fuente autoritativa de verdad** para el inventario de usuarios y dispositivos.
   - 🚫 **Abolición Formal del "Cumulative Merge" en Cliente**: Las funciones `refreshUsers()` y `refreshDevices()` no deben realizar uniones acumulativas (`userMap` / `devMap` iniciando desde `allUsersCache` / `allDevicesCache`). Si un usuario o dispositivo no está presente en la respuesta del servidor (`/api/admin/users`, `/api/admin/devices`), debe eliminarse de inmediato de la UI y del `sessionStorage` del navegador.
   - 🔒 **Persistencia y Ciclo de Vida**: `sessionStorage` se utiliza exclusivamente como búfer efímero de renderizado mientras se recibe la respuesta fresca del servidor; jamás debe emplearse para revivir entidades eliminadas en la base de datos.

2. **OPERACIONES NORMALES DE BORRADO DESDE EL PANEL DE CONTROL**:
   - 🗑️ **Borrado de Usuarios (`POST /api/admin/user/delete`)**: Registra la exclusión en `tombstones.deletedUsers`, desvincula celulares asociados y purga la cuenta de `users.json` y de la nube.
   - 📱 **Limpieza de Dispositivos (`POST /api/admin/device/delete`)**: Elimina el registro del celular de `devices.json` y de la nube sin bloquear el equipo ni alterar su HWID, permitiendo que el cliente reingrese como nuevo con su período de prueba completo.
   - 🛡️ **Limpieza de Historiales (`POST /api/admin/security-logs/clear`)**: Permite vaciar logs de auditoría y alertas de seguridad sin afectar credenciales ni licencias.

3. **PROTOCOLO DE REINICIO A CERO (TABULA RASA DEL PANEL Y BASE DE DATOS)**:
   - 📁 **Resguardo Seguro Previo Obligatorio**: Todo proceso de limpieza total debe crear un resguardo histórico en `_ARCHIVOS_PRUEBAS_HISTORICAS/` fuera de las rutas servidas por la aplicación.
   - 🔄 **Sincronización Atómica en 4 Capas**: Para erradicar cuentas de prueba sin que resuciten por reconciliación automática:
     1. *Local Server*: `server/data/users.json` (solo `usr_admin_default`), `server/data/devices.json` (`{}`), `tombstones.json` (`{ version: 2, revokedKeys: {}, deletedUsers: {} }`).
     2. *Sibling Repos*: Saneamiento idéntico en `MuManagerPro-Gateway/data/` y `MuManagerPro-App/`.
     3. *Upstash Redis Cloud*: Inyección obligatoria vía `POST /api/admin/backup/import` con el payload saneado, validando con `GET /api/admin/backup/export` que `totalDevices === 0` y `totalUsers === 1`.
     4. *Panel Web*: Recarga forzada de caché en el navegador (`Ctrl + Shift + R`) o cierre de sesión para purgar `sessionStorage`.
   - 🛡️ **Inviolabilidad de Configuración Estructural**: `settings.json` (versión del sistema, build, URLs del APK canónico, ventana demo de 72h) y los catálogos de juego (`itemCatalog.json`, `ancientCatalogGenerated.json`) están permanentemente protegidos y jamás deben vaciarse en un proceso de saneamiento.
---

## 🔑 17. AUTENTICACIÓN GOOGLE OAUTH 2.0 & RESOLUCIÓN DUAL DE IDENTIFICADOR (v2.2.1+)

1. **IDENTIFICADOR DUAL UNIFICADO (NOMBRE DE USUARIO O CORREO ELECTRÓNICO)**:
   - 👤 **Resolución Transparente en Servidor**: El endpoint `/api/auth/login` debe permitir indistintamente que el campo identificador sea un nombre de usuario (`username`) o una dirección de correo (`email`). Las búsquedas de usuario se realizan de forma case-insensitive (`(u.username && u.username.toLowerCase() === cleanId) || (u.email && u.email.toLowerCase() === cleanId)`).
   - 📱 **Soporte Offline Simétrico**: En modo fuera de línea (`AuthContext.tsx`), la validación del hash criptográfico (`SecureStorage` `@mumanager_auth_pwhash`) debe admitir que el usuario ingrese tanto su `username` como su `email`, resolviendo correctamente la identidad del usuario y evitando bloqueos locales por tipeo del correo en vez del usuario.
   - 🎨 **Consistencia en Interfaz de Usuario**: En `LoginScreen.tsx`, las etiquetas y placeholders deben reflejar explícitamente el soporte dual: `"Usuario o Correo Electrónico"` y `"Ingresa tu usuario o correo"`.

2. **INICIO DE SESIÓN CON GOOGLE OAUTH 2.0 (SOCIAL LOGIN)**:
   - 🔒 **Autoridad Exclusiva del Servidor sobre Secretos OAuth (OWASP Mobile)**:
     - Queda **terminantemente prohibido** distribuir o compilar el Secreto de Cliente de Google (`GOOGLE_CLIENT_SECRET`, `GOCSPX-...`) en el APK móvil ni en el árbol `src/`.
     - `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` deben provenir exclusivamente de variables de entorno del backend. No se permiten valores de respaldo, fragmentos, concatenaciones ni IDs de clientes OAuth eliminados en código, pruebas, backups ejecutables o artefactos empaquetables. En producción, la ausencia de cualquiera de los dos debe abortar el arranque; en desarrollo, OAuth queda explícitamente deshabilitado.
     - Todos los intercambios de tokens de autorización (`/token`) y consultas de perfil (`/userinfo`) residen con exclusividad en los microservicios de backend (`server/bridgeServer.js` y `MuManagerPro-Gateway/bridgeServer.js`).
   - ⚡ **Creación y Activación Instantánea de Cuentas (Zero Esperas)**:
     - Toda cuenta registrada a través de Google OAuth se crea con estado `status: 'ACTIVE'`, con su `emailVerifiedAt` estampado en UTC y sin requerir envío de códigos OTP numéricos por correo.
     - Si ya existía un usuario registrado previamente con el mismo correo electrónico en estado `PENDING_VERIFICATION`, el inicio con Google activa la cuenta de inmediato.
   - 📱 **Enlace Profundo (Deep Linking) y Navegador Seguro**:
     - La app móvil inicia el flujo invocando `GET /api/auth/oauth/google?hwid=...` adjuntando el identificador del celular en el parámetro `state`.
     - Tras la validación en Google, la pasarela emite el token de sesión JWT y redirige a la aplicación mediante el esquema nativo `mumanager://oauth-callback?token=...&email=...&username=...`.
     - `LoginScreen.tsx` intercepta el deep link y utiliza `loginWithToken()` en `AuthContext.tsx` para iniciar la sesión automáticamente al instante.
   - 🛡️ **Vinculación Irrevocable de HWID y 72 Horas de Prueba**:
     - El login con Google mantiene la vinculación estricta al hardware (`activeHwid = clientHwid`).
     - Si el celular no tenía registro previo en `devices.json`, se le asigna de forma inmediata el período de prueba reglamentario de 72 horas (`settings.demoDurationHours = 72`). Si el celular ya contaba con licencia PRO autorizada por el administrador, esta se respeta y preserva íntegramente.

---

## 18. SISTEMA COMPARTIDO DE AVISOS Y DIÁLOGOS

> Las reglas de esta sección preservan el comportamiento del sistema de avisos. Su apariencia se rige exclusivamente por `DESIGN.md` y por la pantalla Stitch aprobada `FINAL 12 Estados comunes` (`be5020a811044a39b2486d5c611bdc98`).

1. **ARQUITECTURA COMPARTIDA INTACTA (`GothicAlert`)**:
   - Se conservan `GothicAlertManager`, `<GothicAlertContainer />` y su montaje raíz en `App.tsx`.
   - La API sigue siendo retrocompatible con `Alert.alert` y conserva `info`, `success`, `warning`, `error` y `confirm`.
   - `GothicAlert.installGlobal()` continúa interceptando llamadas residuales. El nombre `GothicAlert` es un identificador de compatibilidad y no autoriza reutilizar normas visuales antiguas.

2. **APARIENCIA ÚNICA**:
   - Superficies, marcos, tipografía, colores, radios, iconografía, estados y botones deben proceder de `DESIGN.md`.
   - Cada variante debe conservar identificación por texto e icono; nunca depender solo del color.
   - Los textos largos usan `ScrollView` con `nestedScrollEnabled={true}`; altura máxima adaptable y controles táctiles mínimos de 44 dp.
   - No se permiten diálogos claros predeterminados, estilos heredados ni diseños particulares por pantalla.

3. **SOPORTE PARA CUATRO O MÁS ACCIONES**:
   - Se conserva el soporte de N acciones sin la limitación de tres botones de `AlertDialog`.
   - `promptDemoAccess` mantiene sus cuatro acciones y callbacks actuales, incluido Cancelar sin efectos secundarios. El rediseño no puede renombrar, eliminar, reordenar semánticamente ni alterar estas acciones.

4. **COLA, IDEMPOTENCIA Y APILAMIENTO**:
   - Se conserva la cola FIFO sin superposición ni pérdida.
   - Cada `onPress` y `onDismiss` se ejecuta una sola vez.
   - `<Modal transparent statusBarTranslucent>` debe superponerse correctamente a modales existentes y devolver el control al modal subyacente.

5. **EXCEPCIONES Y VERIFICACIÓN**:
   - Los diálogos nativos de permisos gestionados por Android Runtime son la única excepción.
   - Toda modificación se valida con `node tests/gothicAlertSystem.test.js`, `npm run ts:check` y una revisión visual contra `DESIGN.md`.
   - `npm run check:contrast` se ejecuta como verificación existente; si todavía codifica paletas históricas, su resultado se registra como `NO VERIFICADO` para el nuevo diseño hasta actualizar ese verificador mediante una tarea separada y autorizada.

---

## 19. COBERTURA VISUAL STITCH Y BANCO DE JOYAS KUNDUN

1. **COBERTURA VISUAL SIN OMISIONES**:
   - Toda migración debe revisar la totalidad real de `App.tsx` y `src/**`, incluidos hubs, rankings, cuentas, personajes, inventario, equipo, baúl, banco de joyas, tienda, estadísticas, logs, configuración, modales y avisos.
   - La apariencia de cada módulo debe converger en `DESIGN.md`; queda prohibido conservar estilos heredados como autoridad.
   - La cobertura se demuestra con inventarios antes/después y una matriz de correspondencia entre control real y referencia Stitch. No se declara cobertura completa mientras exista una fila `OMITIDO`, `PARCIAL` o `NO VERIFICADO`.

2. **USO DE LAS OCHO PANTALLAS APROBADAS**:
   - Solo los ocho IDs enumerados en `DESIGN.md` son referencia visual aprobada.
   - `04 Biblioteca MU V2` aporta componentes, texturas y estados, pero nunca una ruta funcional.
   - El ZIP y `Codigo.txt` registrados en `DESIGN.md` son evidencia inmutable. El HTML se traduce a React Native; no se incrusta, ejecuta ni copia como arquitectura.

3. **BANCO DE JOYAS Y KUNDUN**:
   - Se conserva el soporte deduplicado de Box of Kundun +1 a +5 y sus `ItemLevel` 8, 9, 10, 11 y 12.
   - Se conservan los sprites auténticos con transparencia, las operaciones existentes y la protección contra operaciones en vuelo.
   - Se mantiene compatibilidad SQL entre Louis y MSPro mediante detección dinámica segura, sin errores Msg 207 o Msg 911.
   - La agrupación, marcos, contadores, estados y botones del banco se diseñan exclusivamente conforme a `DESIGN.md`.

4. **ALCANCE Y UNIFICACIÓN EN LA APK GENERAL**:
   - El diseño Stitch Approved Ironforge es el diseño oficial, permanente y definitivo de la APK general, erradicando versiones paralelas de test.
   - Se preserva el 100% de funciones, datos, permisos, rutas, navegación, SQL, licencias y lógica de negocio.
   - No autoriza publicación, push ni despliegue sin autorización explícita y directa del usuario.

---

## 20. SISTEMA DE ALERTAS WHATSAPP, BLINDAJE WAF Y SESIONES DE DISPOSITIVOS

1. **SISTEMA CANÓNICO DE ALERTAS DE SEGURIDAD POR WHATSAPP**:
   - **Proveedor Oficial CallMeBot**:
     - El bot oficial activo es exclusivamente **`+34 684 728 023`** (`https://wa.me/34684728023`). Queda permanentemente abolido cualquier número histórico revocado (`+34 644 10 55 84`).
     - **Opt-in de WhatsApp Mandatorio**: Por directivas anti-spam de Meta/WhatsApp, el receptor debe enviar primero el mensaje `I allow callmebot to send me messages` al bot para autorizar la recepción de alertas antes de intentar envíos.
     - **API Key Obligatoria**: La API Key generada por el bot debe guardarse en la configuración (`apiKey`). Sin ella, CallMeBot rechaza la entrega con código HTTP 203.
     - **Diagnóstico en Tiempo Real y Desacoplamiento de Pruebas**: El endpoint `/api/admin/whatsapp/test` está desacoplado de las reglas de filtrado de eventos de producción y reporta en vivo el código HTTP y el mensaje de error o éxito retornado por el proveedor (CallMeBot / Webhook). Prohibido simular envíos exitosos en la interfaz si la llamada remota falla.
     - **Paridad Obligatoria**: Toda modificación a la lógica o parámetros de WhatsApp debe replicarse exactamente en `server/bridgeServer.js`, `server/adminDashboard.html`, `MuManager-Connector/server.js` y `MuManagerPro-Gateway`.

2. **ENDURECIMIENTO WAF, PROXIES INVERSOS E INMUNIDAD LOOPBACK**:
   - **Confianza en Proxy Inverso (`trust proxy`)**: Todo servidor Express alojado tras infraestructura de borde o proxy inverso (Vercel Serverless, Render, Cloudflare, Koyeb) debe declarar obligatoriamente `app.set('trust proxy', 1)` para resolver la IP pública real del cliente desde `x-forwarded-for` / `x-real-ip`.
   - **Inmunidad Estricta de Bucle Local (`isLoopbackIp`)**: Queda terminantemente prohibido incorporar direcciones de bucle local (`127.0.0.1`, `::1`, `localhost`) en `BANNED_IPS` o estructuras de baneo del WAF. Las consultas internas, escaneos de salud o llamadas serverless jamás deben provocar bloqueos cruzados (*cross-tenant lockout*).
   - **Bypass de Emergencia y Auto-Desbloqueo de Administrador**: Si una petición entrante incluye una cabecera `X-Admin-Key` o parámetro `?adminKey=` criptográficamente válido, el middleware WAF debe eliminar de inmediato la IP del mapa `BANNED_IPS` y otorgar paso sin interrupciones.

3. **VINCULACIÓN CUENTA-DISPOSITIVO Y DESCONEXIÓN SILENCIOSA (ZERO-FLICKER)**:
   - **Asociación en Login y Validación de Sesión**: Al autenticar con éxito (`/api/auth/login`) o validar token (`/api/auth/validate-session`), el backend debe asignar `devices[hwid].currentUser = user.email || user.username`.
   - **Reconciliación Proactiva de Celulares Conectados**: `GET /api/admin/devices` debe reconciliar de forma proactiva cualquier dispositivo con `currentUser` vacío contra `users.json`, garantizando que en el panel siempre figure la cuenta vinculada real.
   - **Ruta Dedicada de Desconexión (`POST /api/auth/logout`)**: Al invocar `logout()` o `logoutDemo()`, la app móvil invoca `sqlClient.logoutDevice(hwid, priorUser)`. El backend desvincula inmediatamente `currentUser` y `activeHwid` del dispositivo.
   - **Actualización Quirúrgica sin Parpadeo en Panel**: Las actualizaciones de telemetría en `adminDashboard.html` deben modificar quirúrgicamente el nodo de texto (`.dev-user-text`) en el DOM sin reconstruir la tabla, erradicando el parpadeo de pantalla (*flickering*) y la pérdida de interacción táctil.
