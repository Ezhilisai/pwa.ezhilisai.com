/**
 * Run this once to generate your VAPID keys:
 *   node generate-vapid.js
 *
 * Then:
 *   1. Copy the public key into src/app/services/push-notification.service.ts
 *   2. Copy both keys into push-server/.env (or update server.js directly)
 */

const webPush = require('web-push');

const vapidKeys = webPush.generateVAPIDKeys();

console.log('\n=== VAPID Keys Generated ===\n');
console.log('PUBLIC KEY (paste into push-notification.service.ts):');
console.log(vapidKeys.publicKey);
console.log('\nPRIVATE KEY (paste into push-server/.env or server.js):');
console.log(vapidKeys.privateKey);
console.log('\n=== .env format ===');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('VAPID_SUBJECT=mailto:your@email.com');
console.log('');
