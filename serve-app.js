/**
 * Combined HTTPS server — serves Angular app + push API on the same port.
 * No CORS, no mixed content, no cross-origin cert issues.
 * Usage: node serve-app.js
 */
const https  = require('https');
const express = require('express');
const webPush = require('web-push');
const fs   = require('fs');
const path = require('path');

const PORT  = 4200;
const DIST  = path.join(__dirname, 'dist', 'angular-pwa-push', 'browser');
const SSL_KEY  = path.join(__dirname, 'ssl', '192.168.1.157+2-key.pem');
const SSL_CERT = path.join(__dirname, 'ssl', '192.168.1.157+2.pem');
const STORE_FILE = path.join(__dirname, 'push-server', 'subscriptions.json');
const ENV_FILE   = path.join(__dirname, 'push-server', '.env');

// ── Load .env ────────────────────────────────────────────────────────────────
if (fs.existsSync(ENV_FILE)) {
  fs.readFileSync(ENV_FILE, 'utf8').split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
  });
}

const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT     = process.env.VAPID_SUBJECT || 'mailto:ezhil.ab3@gmail.com';

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('❌ VAPID keys missing in push-server/.env'); process.exit(1);
}
webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// ── Subscriptions store ───────────────────────────────────────────────────────
let subscriptions = [];
try { if (fs.existsSync(STORE_FILE)) subscriptions = JSON.parse(fs.readFileSync(STORE_FILE)); } catch {}
const saveSubscriptions = () => fs.writeFileSync(STORE_FILE, JSON.stringify(subscriptions, null, 2));

// ── Express app ───────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

// ── Push API routes ───────────────────────────────────────────────────────────
app.get('/api/vapid-public-key', (req, res) => res.json({ publicKey: VAPID_PUBLIC_KEY }));

app.post('/api/subscribe', (req, res) => {
  const sub = req.body;
  if (!sub?.endpoint) return res.status(400).json({ error: 'Invalid subscription' });
  if (!subscriptions.some(s => s.endpoint === sub.endpoint)) {
    subscriptions.push(sub);
    saveSubscriptions();
    console.log(`✅ Subscription saved. Total: ${subscriptions.length}`);
  }
  res.status(201).json({ success: true, total: subscriptions.length });
});

app.post('/api/notify', async (req, res) => {
  const { type = 'general', name = '' } = req.body;
  const payload = buildPayload(type, name);
  console.log(`\n📤 Sending "${type}" to ${subscriptions.length} subscriber(s)...`);

  const results = await Promise.allSettled(
    subscriptions.map(sub =>
      webPush.sendNotification(sub, JSON.stringify(payload)).catch(err => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          subscriptions = subscriptions.filter(s => s.endpoint !== sub.endpoint);
          saveSubscriptions();
        }
        throw err;
      })
    )
  );
  const sent = results.filter(r => r.status === 'fulfilled').length;
  console.log(`   ✅ Sent to ${sent}/${subscriptions.length}`);
  res.json({ sent, total: subscriptions.length });
});

app.get('/api/subscriptions', (req, res) => {
  res.json({ count: subscriptions.length });
});

// ── Serve SSL cert for iPhone installation ────────────────────────────────────
app.get('/cert.pem', (req, res) => {
  res.setHeader('Content-Type', 'application/x-pem-file');
  res.sendFile(SSL_CERT);
});

// ── Static Angular app with SPA fallback ─────────────────────────────────────
app.use(express.static(DIST, {
  maxAge: '1y',
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html') || filePath.endsWith('ngsw.json') || filePath.endsWith('ngsw-worker.js')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// SPA fallback
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────────
const sslOptions = { key: fs.readFileSync(SSL_KEY), cert: fs.readFileSync(SSL_CERT) };
https.createServer(sslOptions, app).listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ App + Push server: https://192.168.1.157:${PORT}`);
  console.log(`   Subscriptions: ${subscriptions.length}`);
  console.log('\nAPI:');
  console.log(`  POST https://192.168.1.157:${PORT}/api/subscribe`);
  console.log(`  POST https://192.168.1.157:${PORT}/api/notify`);
  console.log(`  GET  https://192.168.1.157:${PORT}/cert.pem  (for iPhone cert install)\n`);
});

// ── Notification payload builder ──────────────────────────────────────────────
function buildPayload(type, name) {
  if (type === 'birthday') return {
    notification: {
      title: '🎂 Birthday Alert!',
      body: `It\'s ${name}\'s birthday! Don\'t forget to wish them!`,
      icon: '/assets/icons/icon-192x192.png',
      badge: '/assets/icons/icon-72x72.png',
      tag: 'birthday',
      data: {
        url: '/birthday',
        onActionClick: { default: { operation: 'navigateLastFocusedOrOpen', url: '/?deeplink=/birthday' } }
      }
    }
  };
  if (type === 'anniversary') return {
    notification: {
      title: '💍 Anniversary Reminder!',
      body: `${name}\'s anniversary is coming up!`,
      icon: '/assets/icons/icon-192x192.png',
      badge: '/assets/icons/icon-72x72.png',
      tag: 'anniversary',
      data: {
        url: '/anniversaries',
        onActionClick: { default: { operation: 'navigateLastFocusedOrOpen', url: '/?deeplink=/anniversaries' } }
      }
    }
  };
  return {
    notification: {
      title: '🎉 Reminder',
      body: name || 'New notification',
      icon: '/assets/icons/icon-192x192.png',
      data: { url: '/?deeplink=/home' }
    }
  };
}
