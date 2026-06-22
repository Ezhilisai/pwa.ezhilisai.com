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

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', subscriptions: subscriptions.length });
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
