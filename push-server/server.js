/**
 * PWA Push Notification Server
 * Deployed to: push.ezhilisai.com (Render.com)
 *
 * No SSL here — Render handles HTTPS termination.
 * Set env vars in Render dashboard:
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 *
 * Endpoints:
 *   GET  /                  — health check
 *   GET  /api/vapid-public-key
 *   POST /api/subscribe     — save push subscription from PWA
 *   POST /api/notify        — send push to all subscribers
 *   GET  /api/subscriptions — debug: count of stored subs
 *
 * curl example:
 *   curl -X POST https://push.ezhilisai.com/api/notify \
 *     -H "Content-Type: application/json" \
 *     -d '{"type":"birthday","name":"John"}'
 */

const express = require('express');
const cors    = require('cors');
const webPush = require('web-push');
const fs      = require('fs');
const path    = require('path');

// ── Load .env if running locally ──────────────────────────────────────────────
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
  });
}

// ── VAPID ─────────────────────────────────────────────────────────────────────
const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT     = process.env.VAPID_SUBJECT || 'mailto:ezhil.ab3@gmail.com';

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('❌ VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars are required');
  process.exit(1);
}

webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// ── Subscription store (in-memory) ────────────────────────────────────────────
// NOTE: Resets on server restart. Fine for POC.
// For production: replace with a DB (e.g. Supabase, PlanetScale, Redis).
let subscriptions = [];

// ── Express ───────────────────────────────────────────────────────────────────
const app = express();

app.use(cors({
  origin: [
    'https://pwa.ezhilisai.com',
    'http://localhost:4200',
    'https://localhost:4200'
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Admin UI — push from browser
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Push Admin</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, sans-serif; background: #f5f5f7; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { background: white; border-radius: 16px; padding: 32px; width: 100%; max-width: 400px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
    .sub-count { color: #666; font-size: 14px; margin-bottom: 24px; }
    label { font-size: 13px; font-weight: 600; color: #333; display: block; margin-bottom: 6px; }
    input { width: 100%; border: 1.5px solid #e0e0e0; border-radius: 8px; padding: 10px 12px; font-size: 15px; margin-bottom: 16px; outline: none; }
    input:focus { border-color: #6c63ff; }
    .buttons { display: flex; gap: 10px; }
    button { flex: 1; padding: 12px; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
    button:hover { opacity: 0.85; }
    .btn-birthday { background: #ff6b6b; color: white; }
    .btn-anniversary { background: #6c63ff; color: white; }
    .result { margin-top: 16px; padding: 12px; border-radius: 8px; font-size: 14px; display: none; }
    .result.success { background: #e8f5e9; color: #2e7d32; }
    .result.error { background: #fdecea; color: #c62828; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🔔 Push Admin</h1>
    <p class="sub-count" id="count">Loading subscribers...</p>
    <label>Name</label>
    <input id="name" type="text" placeholder="e.g. John" value="John" />
    <div class="buttons">
      <button class="btn-birthday" onclick="send('birthday')">🎂 Birthday</button>
      <button class="btn-anniversary" onclick="send('anniversary')">💍 Anniversary</button>
    </div>
    <div class="result" id="result"></div>
  </div>
  <script>
    fetch('/api/subscriptions').then(r => r.json()).then(d => {
      document.getElementById('count').textContent = d.count + ' subscriber(s)';
    });

    async function send(type) {
      const name = document.getElementById('name').value || 'Someone';
      const result = document.getElementById('result');
      result.style.display = 'none';
      try {
        const res = await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, name })
        });
        const data = await res.json();
        result.className = 'result success';
        result.textContent = '✅ Sent to ' + data.sent + ' device(s)!';
      } catch (e) {
        result.className = 'result error';
        result.textContent = '❌ Failed: ' + e.message;
      }
      result.style.display = 'block';
    }
  </script>
</body>
</html>`);
});

// VAPID public key (Angular fetches on init)
app.get('/api/vapid-public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Subscribe: iPhone registers its Web Push endpoint here
app.post('/api/subscribe', (req, res) => {
  const sub = req.body;
  if (!sub?.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription object' });
  }

  const exists = subscriptions.some(s => s.endpoint === sub.endpoint);
  if (!exists) {
    subscriptions.push(sub);
    console.log(`✅ Subscription saved. Total: ${subscriptions.length}`);
    console.log(`   Endpoint: ${sub.endpoint.slice(0, 60)}...`);
  } else {
    console.log(`ℹ️  Already subscribed. Total: ${subscriptions.length}`);
  }

  res.status(201).json({ success: true, total: subscriptions.length });
});

// Notify: push to all subscribers
app.post('/api/notify', async (req, res) => {
  const { type = 'general', name = '' } = req.body;

  if (subscriptions.length === 0) {
    return res.status(400).json({ error: 'No subscriptions. Subscribe from the PWA first.' });
  }

  const payload = buildPayload(type, name);
  console.log(`\n📤 Sending "${type}" to ${subscriptions.length} subscriber(s)...`);

  const results = await Promise.allSettled(
    subscriptions.map(sub =>
      webPush.sendNotification(sub, JSON.stringify(payload)).catch(err => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`🗑️  Removing expired subscription`);
          subscriptions = subscriptions.filter(s => s.endpoint !== sub.endpoint);
        }
        throw err;
      })
    )
  );

  const sent   = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  console.log(`   ✅ Sent: ${sent}, ❌ Failed: ${failed}`);

  res.json({ sent, failed, total: subscriptions.length });
});

// Debug: subscription count
app.get('/api/subscriptions', (req, res) => {
  res.json({ count: subscriptions.length });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Push server running on port ${PORT}`);
  console.log(`   VAPID key: ${VAPID_PUBLIC_KEY.slice(0, 20)}...`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /api/vapid-public-key`);
  console.log(`  POST /api/subscribe`);
  console.log(`  POST /api/notify   { type: 'birthday'|'anniversary'|'general', name: '...' }`);
  console.log(`  GET  /api/subscriptions\n`);
});

// ── Payload builder ───────────────────────────────────────────────────────────
function buildPayload(type, name) {
  if (type === 'birthday') return {
    notification: {
      title: '🎂 Birthday Alert!',
      body: `It's ${name}'s birthday! Don't forget to wish them!`,
      icon: '/assets/icons/icon-192x192.png',
      badge: '/assets/icons/icon-72x72.png',
      tag: 'birthday',
      data: { url: '/birthday' }
    }
  };

  if (type === 'anniversary') return {
    notification: {
      title: '💍 Anniversary Reminder!',
      body: `${name}'s anniversary is coming up!`,
      icon: '/assets/icons/icon-192x192.png',
      badge: '/assets/icons/icon-72x72.png',
      tag: 'anniversary',
      data: { url: '/anniversaries' }
    }
  };

  return {
    notification: {
      title: '🎉 Reminder',
      body: name || 'You have a new notification',
      icon: '/assets/icons/icon-192x192.png',
      data: { url: '/home' }
    }
  };
}
