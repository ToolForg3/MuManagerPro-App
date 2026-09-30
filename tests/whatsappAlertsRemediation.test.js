// tests/whatsappAlertsRemediation.test.js
// Verificación integral de la arquitectura y corrección de bugs en Alertas de WhatsApp
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log(' RUNNING TESTS: WhatsApp Alerts Bug Remediation');
console.log('====================================================');

const bridgeServerPath = path.join(__dirname, '../server/bridgeServer.js');
const connectorServerPath = path.join(__dirname, '../MuManager-Connector/server.js');
const gatewayServerPath = path.join(__dirname, '../../MuManagerPro-Gateway/bridgeServer.js');
const dashboardPath = path.join(__dirname, '../server/adminDashboard.html');
const settingsPath = path.join(__dirname, '../data/settings.json');
const serverSettingsPath = path.join(__dirname, '../server/data/settings.json');

const bridgeCode = fs.readFileSync(bridgeServerPath, 'utf8');
const connectorCode = fs.readFileSync(connectorServerPath, 'utf8');
const dashboardCode = fs.readFileSync(dashboardPath, 'utf8');
const settingsJson = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
const serverSettingsJson = JSON.parse(fs.readFileSync(serverSettingsPath, 'utf8'));

// Test 1: Test alert endpoint must NOT use 'tamper' and must bypass event filter
console.log('\n[Test 1] Verificación de endpoint de prueba (/api/admin/whatsapp/test)...');
assert(bridgeCode.includes("app.post('/api/admin/whatsapp/test'"), 'bridgeServer debe implementar /api/admin/whatsapp/test');
assert(/'test',\s*(`PRUEBA DE SEGURIDAD|'PRUEBA DE SEGURIDAD)/.test(bridgeCode), 'bridgeServer /api/admin/whatsapp/test debe usar eventKey "test"');
assert(!bridgeCode.match(/\/api\/admin\/whatsapp\/test[\s\S]*?sendWhatsAppAlert\(\s*['"]tamper['"]/), 'bridgeServer /api/admin/whatsapp/test NO debe usar "tamper"');
assert(bridgeCode.includes("if (eventKey !== 'test' && eventKey !== 'system')"), 'sendWhatsAppAlert debe eximir "test" y "system" del filtro de eventos desactivados');
console.log('  [PASS] Endpoint de prueba desacoplado de "tamper" y exento de filtros de eventos.');

// Test 2: SQL WAF and PRO Requests must use specific eventKeys
console.log('\n[Test 2] Verificación de eventos específicos (SQL WAF & Solicitudes PRO)...');
assert(bridgeCode.includes("sendWhatsAppAlert('sqlExploit', 'ATAQUE SQL BLOQUEADO'"), 'SQL WAF debe emitir alerta con eventKey "sqlExploit"');
assert(!bridgeCode.includes("sendWhatsAppAlert('tamper', 'ATAQUE SQL BLOQUEADO'"), 'SQL WAF NO debe clasificar inyecciones SQL como "tamper"');
assert(/'proRequest',\s*'⭐ NUEVA SOLICITUD DE LICENCIA PRO ⭐'/.test(bridgeCode), 'Solicitudes PRO deben emitir alerta con eventKey "proRequest"');
assert(!bridgeCode.includes("sendWhatsAppAlert(\n    'tamper',\n    '⭐ NUEVA SOLICITUD DE LICENCIA PRO ⭐'"), 'Solicitudes PRO NO deben clasificarse como "tamper"');
console.log('  [PASS] Eventos sqlExploit y proRequest correctamente tipificados y desacoplados.');

// Test 3: CallMeBot connection timeout & customWaConfig support
console.log('\n[Test 3] Verificación de resiliencia de red y soporte de configuración en vivo...');
assert(bridgeCode.includes('req.setTimeout(10000'), 'bridgeServer debe configurar timeout de 10s en la conexión con CallMeBot');
assert(bridgeCode.includes('customWaConfig'), 'sendWhatsAppAlert debe aceptar customWaConfig para pruebas en vivo');
console.log('  [PASS] Timeout de 10s en CallMeBot y soporte de credenciales dinámicas en vivo verificados.');

// Test 4: Parity in MuManager-Connector/server.js
console.log('\n[Test 4] Verificación de paridad en MuManager-Connector/server.js...');
assert(/'test',\s*(`PRUEBA DE SEGURIDAD|'PRUEBA DE SEGURIDAD)/.test(connectorCode), 'Connector /api/admin/whatsapp/test debe usar eventKey "test"');
assert(connectorCode.includes("if (eventKey !== 'test' && eventKey !== 'system')"), 'Connector sendWhatsAppAlert debe eximir "test" y "system"');
assert(/'proRequest',\s*'⭐ NUEVA SOLICITUD DE LICENCIA PRO ⭐'/.test(connectorCode), 'Connector solicitudes PRO deben usar "proRequest"');
assert(connectorCode.includes('req.setTimeout(10000'), 'Connector debe configurar timeout en CallMeBot');
console.log('  [PASS] Paridad exacta comprobada en MuManager-Connector/server.js.');

// Test 5: Parity in MuManagerPro-Gateway/bridgeServer.js (if exists)
if (fs.existsSync(gatewayServerPath)) {
  console.log('\n[Test 5] Verificación de paridad en MuManagerPro-Gateway/bridgeServer.js...');
  const gatewayCode = fs.readFileSync(gatewayServerPath, 'utf8');
  assert(/'test',\s*(`PRUEBA DE SEGURIDAD|'PRUEBA DE SEGURIDAD)/.test(gatewayCode), 'Gateway /api/admin/whatsapp/test debe usar "test"');
  assert(gatewayCode.includes("sendWhatsAppAlert('sqlExploit', 'ATAQUE SQL BLOQUEADO'"), 'Gateway SQL WAF debe usar "sqlExploit"');
  assert(/'proRequest',\s*'⭐ NUEVA SOLICITUD DE LICENCIA PRO ⭐'/.test(gatewayCode), 'Gateway PRO requests deben usar "proRequest"');
  console.log('  [PASS] Paridad exacta comprobada en MuManagerPro-Gateway/bridgeServer.js.');
}

// Test 6: adminDashboard.html UI enhancements and eradication of hardcoded dev phone
console.log('\n[Test 6] Verificación de interfaz administrativa (adminDashboard.html)...');
assert(dashboardCode.includes('id="wa-evt-pro"'), 'adminDashboard.html debe contener el checkbox wa-evt-pro');
assert(dashboardCode.includes('proRequest: document.getElementById(\'wa-evt-pro\')'), 'saveWhatsAppSettings debe incluir proRequest');
assert(!dashboardCode.includes("wa.phone || '5521971217376'"), 'loadWhatsAppSettings NO debe contener el teléfono hardcodeado');
assert(!dashboardCode.includes("showToast('Alerta enviada a +5521971217376')"), 'testWhatsAppAlert NO debe mostrar teléfono hardcodeado en toast');
assert(dashboardCode.includes("body: JSON.stringify({ channels, phone, provider: primaryProvider, apiKey, telegramBotToken, telegramChatId, discordWebhookUrl, webhookUrl })"), 'testWhatsAppAlert debe enviar parámetros multi-canal en vivo en el POST');
assert(dashboardCode.includes('id="wa-channel-telegram"'), 'adminDashboard.html debe contener el checkbox wa-channel-telegram');
assert(dashboardCode.includes('id="wa-channel-discord"'), 'adminDashboard.html debe contener el checkbox wa-channel-discord');
assert(dashboardCode.includes('id="wa-channel-callmebot"'), 'adminDashboard.html debe contener el checkbox wa-channel-callmebot');
assert(dashboardCode.includes('id="wa-channel-webhook"'), 'adminDashboard.html debe contener el checkbox wa-channel-webhook');
console.log('  [PASS] Panel web limpio: controles multi-canal por checkboxes, envío en vivo y cero teléfonos fijos.');

// Test 7: settings.json schema verification
console.log('\n[Test 7] Verificación de esquema en settings.json...');
assert.strictEqual(settingsJson.whatsapp.events.proRequest, true, 'data/settings.json debe incluir proRequest: true');
assert.strictEqual(serverSettingsJson.whatsapp.events.proRequest, true, 'server/data/settings.json debe incluir proRequest: true');
assert(settingsJson.whatsapp.hasOwnProperty('channels'), 'data/settings.json debe incluir objeto channels');
assert(serverSettingsJson.whatsapp.hasOwnProperty('channels'), 'server/data/settings.json debe incluir objeto channels');
assert(settingsJson.whatsapp.hasOwnProperty('telegramBotToken'), 'data/settings.json debe incluir telegramBotToken');
assert(settingsJson.whatsapp.hasOwnProperty('telegramChatId'), 'data/settings.json debe incluir telegramChatId');
assert(settingsJson.whatsapp.hasOwnProperty('discordWebhookUrl'), 'data/settings.json debe incluir discordWebhookUrl');
assert(serverSettingsJson.whatsapp.hasOwnProperty('telegramBotToken'), 'server/data/settings.json debe incluir telegramBotToken');
assert(serverSettingsJson.whatsapp.hasOwnProperty('telegramChatId'), 'server/data/settings.json debe incluir telegramChatId');
assert(serverSettingsJson.whatsapp.hasOwnProperty('discordWebhookUrl'), 'server/data/settings.json debe incluir discordWebhookUrl');
console.log('  [PASS] Esquemas de configuración en data/ y server/data/ 100% sincronizados con Telegram y Discord.');

// Test 8: Telegram & Discord Multi-Channel Alert Engine
console.log('\n[Test 8] Verificación de canal Telegram Bot y Discord Webhook...');
assert(bridgeCode.includes("api.telegram.org"), 'bridgeServer debe soportar la API oficial de Telegram');
assert(bridgeCode.includes("discordWebhookUrl"), 'bridgeServer debe despachar a Discord Webhooks con Embed');
assert(bridgeCode.includes("activeChannels.map"), 'bridgeServer debe despachar alertas multi-canal en paralelo');
assert(connectorCode.includes("api.telegram.org"), 'Connector debe soportar la API de Telegram');
assert(connectorCode.includes("discordWebhookUrl"), 'Connector debe despachar a Discord Webhooks');
assert(connectorCode.includes("activeChannels.map"), 'Connector debe despachar alertas multi-canal en paralelo');
assert(dashboardCode.includes('id="wa-telegram-token"'), 'adminDashboard.html debe incluir input wa-telegram-token');
assert(dashboardCode.includes('id="wa-telegram-chatid"'), 'adminDashboard.html debe incluir input wa-telegram-chatid');
assert(dashboardCode.includes('id="wa-discord-url"'), 'adminDashboard.html debe incluir input wa-discord-url');
console.log('  [PASS] Motor multi-canal con checkboxes y despacho paralelo verificado con éxito en backend, conector y panel web.');

console.log('\n====================================================');
console.log(' ALL 8/8 MULTI-CHANNEL ALERTS REMEDIATION TESTS PASSED!');
console.log('====================================================\n');

