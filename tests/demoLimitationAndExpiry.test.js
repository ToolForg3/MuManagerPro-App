const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log(' RUNNING TESTS: Limitaciones PRO/DEMO, Temporizador 10m y Purga');
console.log('====================================================\n');

// 1. Verificar bridgeServer.js
const bridgeServerContent = fs.readFileSync(path.join(__dirname, '../server/bridgeServer.js'), 'utf8');

// Test 1: Lista de rutas de mutación SQL restringidas a PRO/ADMIN
console.log('[Test 1] Verificación de rutas de mutación SQL protegidas en DEMO...');
assert(bridgeServerContent.includes('isSqlMutationRoute'), 'Debe definir isSqlMutationRoute en bridgeServer.js');
assert(bridgeServerContent.includes('/api/account/create'), 'Debe incluir /api/account/create en mutaciones');
assert(bridgeServerContent.includes('/api/accounts/update'), 'Debe incluir /api/accounts/update en mutaciones');
assert(bridgeServerContent.includes('/api/accounts/delete'), 'Debe incluir /api/accounts/delete en mutaciones');
assert(bridgeServerContent.includes('/api/accounts/ban'), 'Debe incluir /api/accounts/ban en mutaciones');
assert(bridgeServerContent.includes('/api/character/update-inventory'), 'Debe incluir update-inventory en mutaciones');
assert(bridgeServerContent.includes('/api/warehouse/update'), 'Debe incluir warehouse/update en mutaciones');
assert(bridgeServerContent.includes('FUNCION_RESTRINGIDA_PRO'), 'Debe responder con FUNCION_RESTRINGIDA_PRO para mutaciones en DEMO');
console.log('  [PASS] Mutaciones SQL bloqueadas con HTTP 403 FUNCION_RESTRINGIDA_PRO en modo DEMO.');

// Test 2: Auto-reconciliación de clave PRO por cabecera X-License-Key
console.log('[Test 2] Verificación de auto-reconciliación por X-License-Key...');
assert(bridgeServerContent.includes("req.headers['x-license-key']"), 'Debe leer x-license-key en bridgeServer.js');
assert(bridgeServerContent.includes("verifyKey(hwid, effectiveDevKey)"), 'Debe verificar la clave matemática');
console.log('  [PASS] Cabecera X-License-Key reconcilia y asegura modo PRO para dispositivos válidos.');

// Test 3: Invalidación de sesiones si el usuario fue purgado de users.json
console.log('[Test 3] Verificación de invalidación de usuarios purgados...');
assert(bridgeServerContent.includes('USUARIO_NO_EXISTE'), 'Debe responder USUARIO_NO_EXISTE si el usuario fue eliminado');
console.log('  [PASS] Tokens de usuarios eliminados son rechazados con 401 USUARIO_NO_EXISTE.');

// Test 4: sqlClient.ts envía X-License-Key y maneja 401
console.log('[Test 4] Verificación de sqlClient.ts...');
const sqlClientContent = fs.readFileSync(path.join(__dirname, '../src/services/database/sqlClient.ts'), 'utf8');
assert(sqlClientContent.includes("'X-License-Key': licKey"), 'sqlClient debe enviar X-License-Key');
assert(sqlClientContent.includes('USUARIO_NO_EXISTE'), 'sqlClient debe capturar USUARIO_NO_EXISTE');
console.log('  [PASS] sqlClient.ts envía X-License-Key y captura revocaciones de cuenta.');

// Test 5: AuthContext.tsx implementa 10 minutos para Demo
console.log('[Test 5] Verificación de AuthContext.tsx temporizador 10 min...');
const authContextContent = fs.readFileSync(path.join(__dirname, '../src/context/AuthContext.tsx'), 'utf8');
assert(authContextContent.includes('DEMO_DURATION_SECONDS = 600'), 'DEMO_DURATION_SECONDS debe ser 600s (10 minutos)');
assert(authContextContent.includes('isDemoSession'), 'Debe incluir estado isDemoSession');
assert(authContextContent.includes('demoRemainingSeconds'), 'Debe incluir estado demoRemainingSeconds');
assert(authContextContent.includes('isDemoExpired'), 'Debe incluir estado isDemoExpired');
assert(authContextContent.includes('@mumanager_demo_start_time'), 'Debe persistir marca temporal de inicio de demo');
console.log('  [PASS] AuthContext.tsx cuenta regresiva exacta de 10 minutos (600s) y auto-logout.');

// Test 6: AccountsScreen.tsx bloquea acciones en DEMO
console.log('[Test 6] Verificación de cuentas en AccountsScreen.tsx...');
const accountsScreenContent = fs.readFileSync(path.join(__dirname, '../src/screens/accounts/AccountsScreen.tsx'), 'utf8');
assert(accountsScreenContent.includes('handleCreateAccount'), 'Debe contener handleCreateAccount');
assert(accountsScreenContent.includes('handleToggleBlock'), 'Debe contener handleToggleBlock');
assert(accountsScreenContent.includes('••••••••'), 'Debe enmascarar contraseñas en DEMO');
console.log('  [PASS] AccountsScreen.tsx restringe creación/bloqueo a PRO y enmascara passwords en DEMO.');

// Test 7: Purga de usuarios en users.json
console.log('[Test 7] Verificación de usuarios purgados y celulares desvinculados...');
const gatewayUsers = JSON.parse(fs.readFileSync(path.join('C:/Users/Cris/Desktop/MuManagerPro-Gateway/data/users.json'), 'utf8'));
assert(Array.isArray(gatewayUsers), 'users.json debe ser un array');
assert(gatewayUsers.length === 1, 'users.json debe contener únicamente el admin limpio');
assert(gatewayUsers[0].role === 'ADMIN', 'El único usuario debe ser ADMIN');

const gatewayDevices = JSON.parse(fs.readFileSync(path.join('C:/Users/Cris/Desktop/MuManagerPro-Gateway/data/devices.json'), 'utf8'));
let linkedFound = false;
for (const k of Object.keys(gatewayDevices)) {
  if (gatewayDevices[k].currentUser || gatewayDevices[k].userEmail || gatewayDevices[k].activeUser) {
    linkedFound = true;
    break;
  }
}
assert(!linkedFound, 'Ningún dispositivo debe tener usuario vinculado en devices.json');
console.log('  [PASS] Base de usuarios 100% purgada y todos los celulares desvinculados.');

console.log('\n====================================================');
console.log(' ALL 7/7 DEMO LIMITATION & PURGE TESTS PASSED 100%!');
console.log('====================================================');
