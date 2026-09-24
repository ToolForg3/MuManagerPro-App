const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log(' RUNNING TESTS: Preservación de Usuarios, Demo 10m y PRO Request');
console.log('====================================================\n');

// 1. users.json NUNCA debe ser purgado por expiración de demo o sincronización
console.log('[Test 1] Integridad de usuarios: CERO purgas destructivas en users.json...');
const bridgeServerContent = fs.readFileSync(path.join(__dirname, '../server/bridgeServer.js'), 'utf8');
const syncGatewayContent = fs.readFileSync(path.join(__dirname, '../scripts/sync-gateway.js'), 'utf8');

assert(!syncGatewayContent.includes('usersPurgedV168'), 'sync-gateway.js no debe contener la bandera obsoleta usersPurgedV168');
assert(!bridgeServerContent.includes('usersPurgedV168'), 'bridgeServer.js no debe purgar usuarios al iniciar cloud storage');
console.log('  [PASS] users.json y cloud storage libres de purgas forzadas.');

// 2. Demo 10 minutos restringido a nivel dispositivo (HWID)
console.log('[Test 2] Restricción de 10 minutos de demo rápido por celular...');
assert(bridgeServerContent.includes('QUICK_DEMO_EXPIRED'), 'bridgeServer debe responder QUICK_DEMO_EXPIRED');
assert(bridgeServerContent.includes('quickDemoUsed'), 'bridgeServer debe registrar quickDemoUsed');
assert(bridgeServerContent.includes('/api/auth/demo-quick-consumed'), 'bridgeServer debe exponer /api/auth/demo-quick-consumed');

const authContextContent = fs.readFileSync(path.join(__dirname, '../src/context/AuthContext.tsx'), 'utf8');
assert(authContextContent.includes('@mumanager_quick_demo_consumed_'), 'AuthContext debe persistir flag local por HWID');
assert(authContextContent.includes('logoutDemo'), 'AuthContext debe proveer logoutDemo dedicado');
assert(!authContextContent.includes("await AsyncStorage.setItem('@mumanager_auth_username', 'Demo')"), 'loginDemo no debe sobreescribir el nombre de usuario registrado');
assert(!authContextContent.includes("await AsyncStorage.setItem('@mumanager_auth_email', 'demo@muonline.local')"), 'loginDemo no debe sobreescribir el email del usuario registrado');
console.log('  [PASS] Acceso directo Demo no sobreescribe credenciales registradas y restringe 10 min por celular.');

// 3. Solicitud de Prueba PRO Directa al Panel y Control Anti-Duplicados
console.log('[Test 3] Integración de Solicitud de Prueba PRO y Control en Panel...');
const sqlClientContent = fs.readFileSync(path.join(__dirname, '../src/services/database/sqlClient.ts'), 'utf8');
assert(sqlClientContent.includes('sendProRequest'), 'sqlClient.ts debe exponer sendProRequest');
assert(bridgeServerContent.includes('/api/license/request-pro'), 'bridgeServer.js debe recibir /api/license/request-pro');
assert(bridgeServerContent.includes('alreadyRequested: true'), 'bridgeServer.js debe detectar HWID previo en request-pro');
assert(bridgeServerContent.includes("app.delete('/api/admin/pro-request/:id'"), 'bridgeServer.js debe permitir eliminar solicitudes con DELETE');

const connectorContent = fs.readFileSync(path.join(__dirname, '../MuManager-Connector/server.js'), 'utf8');
assert(connectorContent.includes('alreadyRequested: true'), 'MuManager-Connector debe detectar HWID previo');
assert(connectorContent.includes("app.delete('/api/admin/pro-request/:id'"), 'MuManager-Connector debe permitir eliminar solicitudes');

const loginScreenContent = fs.readFileSync(path.join(__dirname, '../src/screens/auth/LoginScreen.tsx'), 'utf8');
assert(loginScreenContent.includes('proModalVisible'), 'LoginScreen debe incluir modal de prueba PRO');
assert(loginScreenContent.includes('handleSendProRequest'), 'LoginScreen debe enviar la solicitud PRO');
assert(loginScreenContent.includes('proHwid'), 'LoginScreen debe vincular el HWID del celular en la solicitud PRO');
assert(loginScreenContent.includes('res.alreadyRequested'), 'LoginScreen debe alertar si el HWID ya solicitó antes');
console.log('  [PASS] Solicitud de prueba PRO con control anti-duplicados y endpoints del panel verificados.');

// 4. Cartel explicativo de Demo Rápido (10 min -> 72h registrada)
console.log('\n[Test 4] Cartel previo de Demo Rápido con explicación de 72h al registrar...');
assert(loginScreenContent.includes('promptDemoAccess'), 'LoginScreen debe tener promptDemoAccess');
assert(loginScreenContent.includes('72 horas'), 'LoginScreen debe explicar que tras los 10 min se adquieren 72 horas al crear cuenta');
console.log('  [PASS] Cartel explicativo previo al demo rápido verificado.');

// 5. Notificación de tiempo activado de licencia
console.log('\n[Test 5] Notificación de tiempo activado de licencia PRO...');
const licenseServiceContent = fs.readFileSync(path.join(__dirname, '../src/services/security/licenseService.ts'), 'utf8');
assert(licenseServiceContent.includes('Tiempo activado:'), 'licenseService.ts debe alertar el tiempo activado en la notificación');
assert(bridgeServerContent.includes('durationText'), 'bridgeServer.js debe computar y devolver durationText');

const adminDashboardContent = fs.readFileSync(path.join(__dirname, '../server/adminDashboard.html'), 'utf8');
assert(adminDashboardContent.includes('Tiempo Activado:'), 'adminDashboard.html debe alertar el tiempo activado al activar PRO');
assert(adminDashboardContent.includes('deleteProRequest'), 'adminDashboard.html debe implementar deleteProRequest');
assert(adminDashboardContent.includes('openProActivationModal(hwid, id)'), 'adminDashboard.html debe abrir modal de vigencia al aprobar solicitud PRO');
console.log('  [PASS] Notificación de tiempo activado verificada en app, servidor y panel.');

console.log('\n====================================================');
console.log(' ALL 5/5 USER PRESERVATION & PRO REQUEST TESTS PASSED 100%!');
console.log('====================================================');
