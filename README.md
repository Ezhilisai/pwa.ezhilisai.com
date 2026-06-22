# Angular PWA — Push Notifications + Deep Links

Angular 20 PWA with Web Push notifications that deep-link into Birthday and Anniversary routes. Tested with iPhone over LAN.

---

## Quick Start

### 1. Install dependencies

```bash
# Angular app
npm install

# Push server
cd push-server && npm install && cd ..
```

### 2. Generate VAPID keys

```bash
cd push-server
node generate-vapid.js
```

Copy the output:
- **Public key** → `src/app/services/push-notification.service.ts` → `VAPID_PUBLIC_KEY`
- Both keys → `push-server/.env`

```env
# push-server/.env
VAPID_PUBLIC_KEY=<your-public-key>
VAPID_PRIVATE_KEY=<your-private-key>
VAPID_SUBJECT=mailto:ezhil.ab3@gmail.com
```

### 3. Generate SSL certificate (required for iPhone)

```bash
chmod +x setup-ssl.sh && ./setup-ssl.sh
```

Note your LAN IP (e.g. `192.168.1.42`) — the script will print it.

Update `PUSH_SERVER_URL` in `src/app/services/push-notification.service.ts`:
```ts
export const PUSH_SERVER_URL = 'http://192.168.1.42:3000';
```

### 4. Build the Angular app (production — required for service worker)

```bash
npm run build:prod
```

### 5. Start everything

**Terminal 1 — Push server:**
```bash
cd push-server && node server.js
```

**Terminal 2 — Angular app (HTTPS, accessible on LAN):**
```bash
npm run start:ssl
```

> The app is now at `https://<your-LAN-IP>:4200`

---

## iPhone Setup

1. Connect iPhone to the same Wi-Fi network as your Mac.
2. Open Safari on iPhone → `https://<LAN-IP>:4200`
3. Trust the self-signed cert (tap Advanced → Proceed, or install the cert profile).
4. Tap the **Share** icon → **Add to Home Screen** (this installs the PWA).
5. Open the app from the home screen icon.
6. Tap **Enable Push Notifications** on the Home page.
7. Allow notifications when iOS prompts.

---

## Sending Test Notifications

### From the app (Home page)
Tap the 🎂 or 💍 test buttons — they call the push server which sends a notification.

### From the terminal (curl)
```bash
# Birthday notification → deep links to /birthday
curl -X POST http://localhost:3000/api/notify \
  -H "Content-Type: application/json" \
  -d '{"type":"birthday","name":"Alice"}'

# Anniversary notification → deep links to /anniversaries
curl -X POST http://localhost:3000/api/notify \
  -H "Content-Type: application/json" \
  -d '{"type":"anniversary","name":"Bob & Carol"}'
```

Tapping the notification on your iPhone opens the app at the correct route.

---

## Project Structure

```
.
├── src/
│   ├── app/
│   │   ├── app.component.ts       # Shell + nav tabs
│   │   ├── app.config.ts          # Angular providers + SW config
│   │   ├── app.routes.ts          # /home, /birthday, /anniversaries
│   │   ├── home/                  # Subscribe + test notification UI
│   │   ├── birthday/              # Birthday list (deep link target)
│   │   ├── anniversaries/         # Anniversary list (deep link target)
│   │   └── services/
│   │       ├── push-notification.service.ts   # SwPush wrapper
│   │       └── sw-navigator.service.ts        # Handles SW→app navigation
│   ├── sw-push.js                 # Custom SW: push handler + deep link
│   ├── manifest.webmanifest       # PWA manifest
│   └── styles.css
├── push-server/
│   ├── server.js                  # Express + web-push server
│   ├── generate-vapid.js          # VAPID key generator
│   └── package.json
├── ngsw-config.json               # Angular service worker cache config
├── setup-ssl.sh                   # Self-signed cert generator
└── angular.json
```

---

## How Push + Deep Links Work

```
iPhone (PWA installed)
  │
  │  user taps "Enable Push"
  ▼
Angular app subscribes via SwPush.requestSubscription()
  │
  │  POST /api/subscribe  ──→  push-server stores the subscription
  │
  ▼
push-server (Node.js)
  │
  │  POST /api/notify { type: "birthday" }
  │  → webPush.sendNotification(sub, { url: "/birthday", ... })
  ▼
iOS shows notification with title + body
  │
  │  user taps notification
  ▼
sw-push.js notificationclick handler
  │
  │  if app window open: postMessage({ type: "NAVIGATE", url: "/birthday" })
  │  if app closed:     clients.openWindow("/birthday")
  ▼
SwNavigatorService (Angular) router.navigateByUrl("/birthday")
  ▼
BirthdayComponent renders ✅
```

---

## Notes

- **iOS Push Support**: Available since iOS 16.4 for PWAs installed to home screen.
- **HTTPS is mandatory**: Web Push and service workers require a secure context. `localhost` is exempt but LAN IP is not, hence the SSL cert.
- **Angular SW in dev mode**: `ngsw-worker.js` is disabled in dev mode (`isDevMode()` check). Always test push with a production build (`npm run build:prod`).
- **Subscriptions**: Stored in `push-server/subscriptions.json`. Delete this file to clear all subscriptions.
