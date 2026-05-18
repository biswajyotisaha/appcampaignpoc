# Campaign Attribution Server

A lightweight, self-hosted campaign attribution server inspired by AppsFlyer. It tracks which ad/campaign link a user clicked, redirects them to the appropriate app store (or opens the app directly via deep linking), and later tells your app about it — enabling personalized first-launch experiences.

## How It Works

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                              ATTRIBUTION FLOW                                       │
├────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  1. CLICK                     2. OPEN / INSTALL             3. MATCH               │
│  ─────────                    ─────────────────             ────────               │
│                                                                                     │
│  User clicks                 Deep link tries app first,    App calls API            │
│  campaign link               falls back to store           on launch                │
│       │                              │                          │                   │
│       ▼                              │                          ▼                   │
│  ┌──────────┐                        │                   ┌─────────────┐           │
│  │  Server  │ Records:               │                   │   Server    │           │
│  │          │ • Fingerprint           │                   │   matches   │           │
│  │          │   (IP + UA hash)        │                   │   fingerprint│          │
│  │          │ • Timestamp             │                   │   to click  │           │
│  │          │ • Campaign ID           │                   │             │           │
│  └────┬─────┘                        │                   └──────┬──────┘           │
│       │                              │                          │                   │
│       ▼                              │                          ▼                   │
│  Deep Link configured?               │                   Returns campaign           │
│  ├─ YES → Interstitial page          │                   metadata + marks           │
│  │         tries app:// scheme        │                   click consumed             │
│  │         (falls back to store)      │                   (one-shot)                │
│  └─ NO  → 302 redirect to store      │                                             │
│                                                                                     │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### The Problem

When a user clicks an ad and gets redirected to the App Store, the connection between the ad and the user is **completely lost**. The App Store doesn't pass any parameters through to your app.

### The Solution

This server acts as a middleman that **remembers** who clicked what:

1. **Click Time:** Records a fingerprint (hash of IP + device info) along with campaign parameters
2. **Open/Install Time:** If deep linking is configured, tries to open the app directly — otherwise redirects to the store
3. **Attribution Match:** The app calls the match API on launch — server compares fingerprints and returns campaign context (one-shot, consumed after first match)

### Fingerprint Matching

Since we can't use cookies or URL parameters across the App Store boundary, we use **device fingerprinting**:

```
CLICK TIME:                          APP LAUNCH TIME:
  IP: 203.0.113.42                     IP: 203.0.113.42
  UA: iPhone/iOS 18.7                  UA: iPhone/iOS 18.7
  Time: 10:30:00                       Time: 10:31:15

  fingerprint = SHA256("203.0.113.42|ios|18.7|iphone")

  Same fingerprint + within 24h window = MATCH
  Click is then CONSUMED (won't match again)
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Docker Container                                     │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐     │
│  │                    Express Server (port 3000)                             │     │
│  │                                                                           │     │
│  │  /c/:slug                → Click Handler (deep link or redirect)         │     │
│  │  /api/v1/campaigns       → Campaign CRUD (with deep link config)         │     │
│  │  /api/v1/attribution     → Attribution Match API                         │     │
│  │  /api/v1/stats           → Analytics API (daily aggregates)              │     │
│  │  /health                 → Health Check                                  │     │
│  │  /*                      → React Dashboard (production)                  │     │
│  └─────────────────────────────────────────────────────────────────────────┘     │
│                                                                                   │
│  ┌────────────────────┐  ┌──────────────────────────────────────────────┐       │
│  │  web-dist/          │  │  In-Memory Storage (Maps)                     │       │
│  │  (React SPA)        │  │  • campaigns (by id, by slug)                 │       │
│  │                     │  │  • clicks (by id, by fingerprint)             │       │
│  │                     │  │  • daily stats (click/install events)          │       │
│  └────────────────────┘  └──────────────────────────────────────────────┘       │
│                                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────────┐    │
│  │  Middleware: CORS │ Rate Limiter (100/15min) │ Request Logger │ Errors    │    │
│  └──────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Deep Linking Flow (when configured)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          DEEP LINK REDIRECT LOGIC                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│                         GET /c/:slug                                              │
│                              │                                                    │
│                              ▼                                                    │
│                   Campaign has deepLink config?                                   │
│                     /              \                                              │
│                   YES               NO                                            │
│                   /                   \                                           │
│                  ▼                     ▼                                          │
│         Detect device             302 Redirect                                   │
│         /     |     \             to store URL                                   │
│        /      |      \                                                           │
│      iOS   Android   Other                                                       │
│       │       │        │                                                         │
│       ▼       ▼        ▼                                                         │
│  ┌────────┐ ┌─────────┐ ┌──────────┐                                           │
│  │  HTML  │ │  HTML    │ │ 302 to   │                                           │
│  │  Page  │ │  Page    │ │ fallback │                                           │
│  │        │ │          │ └──────────┘                                           │
│  │ Tries: │ │ Tries:   │                                                        │
│  │ myapp://│ │ intent://│                                                        │
│  │ scheme │ │ URI      │                                                        │
│  │        │ │          │                                                        │
│  │ After  │ │ After    │                                                        │
│  │ 1.5s:  │ │ 2s:      │                                                        │
│  │ → App  │ │ → Play   │                                                        │
│  │  Store │ │  Store   │                                                        │
│  └────────┘ └─────────┘                                                         │
│                                                                                   │
│  The interstitial page:                                                          │
│  • Shows a spinner with "Opening app..."                                         │
│  • Attempts to open the app via scheme/intent URI                                │
│  • Falls back to the store after a timeout                                       │
│  • Shows a manual "Open Store" link as final fallback                            │
│                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Attribution Match Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        ATTRIBUTION MATCH LOGIC                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│   POST /api/v1/attribution/match                                                 │
│   (called by app on every launch)                                                │
│         │                                                                         │
│         ▼                                                                         │
│   Generate fingerprint from                                                      │
│   request IP + User-Agent                                                        │
│         │                                                                         │
│         ▼                                                                         │
│   Find clicks with same fingerprint                                              │
│         │                                                                         │
│         ▼                                                                         │
│   Filter: unconsumed + not expired + clicked before now                          │
│         │                                                                         │
│     ┌───┴───┐                                                                    │
│     │       │                                                                    │
│  No valid  Valid clicks found                                                    │
│  clicks    │                                                                     │
│     │      ▼                                                                     │
│     │   Pick most recent valid click                                             │
│     │      │                                                                     │
│     │      ▼                                                                     │
│     │   Calculate confidence:                                                    │
│     │   • < 1h  = "high"                                                         │
│     │   • 1-6h  = "medium"                                                       │
│     │   • 6-24h = "low"                                                          │
│     │      │                                                                     │
│     │      ▼                                                                     │
│     │   Mark click as CONSUMED                                                   │
│     │   Increment install count                                                  │
│     │   Record install event                                                     │
│     │      │                                                                     │
│     ▼      ▼                                                                     │
│  { matched: false }    { matched: true, attribution: { ... } }                   │
│                                                                                   │
│  IMPORTANT: Attribution is ONE-SHOT.                                             │
│  Once consumed, same fingerprint won't match again.                              │
│  User must click the link again for a new attribution.                           │
│                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Request Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        SERVICE LAYER ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  Routes Layer            Services Layer              Storage Layer                │
│  ────────────            ──────────────              ─────────────                │
│                                                                                   │
│  campaign.routes ──────► campaign.service ──────────► IStorage                   │
│  (Zod validation)        (CRUD + slug uniqueness)     interface                  │
│                                                        │                          │
│  click.routes ─────────► redirect.service             MemoryStorage              │
│  (UA extraction)         (device detect + action)     (Maps + indexes)           │
│                     ├──► click.service                                            │
│                     │    (record + fingerprint)                                   │
│                     └──► deeplink-page.service                                   │
│                          (HTML renderer)                                          │
│                                                                                   │
│  attribution.routes ───► attribution.service                                     │
│  (header extraction)     (match + consume + score)                               │
│                     ├──► fingerprint.service                                     │
│                     │    (SHA-256 hash generation)                                │
│                     └──► click.service                                            │
│                          (lookup by fingerprint)                                  │
│                                                                                   │
│  stats.routes ─────────► storage.getDailyStats()                                 │
│                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### Project Structure

```
appcampaignpoc/
├── Dockerfile                    # Multi-stage build (backend + frontend)
├── docker-compose.yml            # Local Docker dev
├── render.yaml                   # Render deployment config
├── package.json                  # Backend dependencies
├── tsconfig.json                 # Backend TypeScript config
├── src/                          # --- BACKEND ---
│   ├── index.ts                  # Server bootstrap
│   ├── app.ts                    # Express app factory
│   ├── config/
│   │   └── index.ts              # Environment configuration
│   ├── models/
│   │   ├── campaign.model.ts     # Campaign + DeepLinkConfig interfaces
│   │   ├── click.model.ts        # Click record interface
│   │   └── attribution.model.ts  # Attribution result interface
│   ├── storage/
│   │   ├── storage.interface.ts  # Abstract contract (swap to DB later)
│   │   ├── memory.storage.ts     # In-memory Map implementation
│   │   └── index.ts              # Storage factory
│   ├── services/
│   │   ├── fingerprint.service.ts  # SHA-256 hashing + UA normalization
│   │   ├── redirect.service.ts     # Device detection + deep link resolution
│   │   ├── deeplink-page.service.ts # HTML interstitial page renderer
│   │   ├── campaign.service.ts     # Campaign CRUD logic
│   │   ├── click.service.ts        # Click recording + lookup
│   │   └── attribution.service.ts  # Fingerprint matching + confidence scoring
│   ├── routes/
│   │   ├── health.routes.ts      # GET /health
│   │   ├── campaign.routes.ts    # CRUD /api/v1/campaigns (Zod validated)
│   │   ├── click.routes.ts       # GET /c/:slug (deep link or redirect)
│   │   ├── attribution.routes.ts # POST /api/v1/attribution/match
│   │   └── stats.routes.ts       # GET /api/v1/stats/:campaignId
│   ├── middleware/
│   │   ├── error-handler.ts      # Global error handling
│   │   └── request-logger.ts     # Structured request logging
│   └── utils/
│       ├── logger.ts             # Pino logger
│       ├── ua-parser.ts          # User-Agent parsing + device detection
│       └── id-generator.ts       # UUID generation
└── web/                          # --- FRONTEND (React + Vite + Tailwind) ---
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts            # Vite config (proxies /api to backend in dev)
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.tsx              # React entry point
        ├── App.tsx               # Main app shell
        ├── CampaignForm.tsx      # Create campaign form (with deep link config)
        ├── CampaignList.tsx      # Campaign cards + integration guide
        ├── CampaignChart.tsx     # Analytics chart (Recharts line chart)
        ├── api.ts                # API client (fetch wrapper)
        ├── index.css             # Tailwind base styles
        └── vite-env.d.ts         # Vite type declarations
```

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| Interface-based storage | Swap in PostgreSQL/Redis later without touching business logic |
| SHA-256 fingerprint hash | Privacy (no raw IP+UA stored together), fast O(1) lookups |
| 24-hour attribution window | Industry standard, configurable via env var |
| One-shot attribution (click consumed) | Prevents duplicate install counts; user must click again for new attribution |
| Interstitial page for deep links | Can't 302 to custom schemes; HTML page handles app-open attempt + fallback |
| Intent URI for Android | Native browser handling: opens app if installed, falls back to Play Store |
| Express over Fastify | Simpler, larger ecosystem, good enough for this scale |
| Zod validation | Runtime type safety on API boundaries |
| Pino logger | Structured JSON logs, low overhead |
| React + Vite + Tailwind | Fast builds, modern DX, utility-first CSS |
| Auto-detect base URL from request | No manual config needed — works on any domain |
| Async click recording | Non-blocking — doesn't delay the redirect/page response |

---

## Dashboard UI

The React frontend provides an admin dashboard for managing campaigns:

- **Create campaigns** with App Store, Play Store, and fallback URLs
- **Configure deep linking** — expandable section with iOS scheme and Android package inputs, plus setup instructions (Info.plist / AndroidManifest.xml code)
- **Auto-generates URL slugs** from campaign names
- **Fixed metadata fields** — Source and Topic inputs (keys are fixed, no raw JSON)
- **Copy tracking links** to clipboard with one click
- **View click & install counts** per campaign
- **Analytics charts** — Recharts line chart showing daily clicks/installs over time
- **Mobile integration guide** — per-campaign code snippets (JavaScript fetch + Swift) showing how to call the attribution match API
- **Delete campaigns** with confirmation

In production, the dashboard is served by the same Express server at the root URL (`/`).
In development, run the Vite dev server separately on port 5173 (it proxies API calls to port 3000).

---

## Quick Start

### Prerequisites

- Node.js 20+
- npm

### Local Development

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd web && npm install && cd ..

# Start backend (port 3000)
npm run dev

# In another terminal — start frontend (port 5173)
cd web && npm run dev
```

Open `http://localhost:5173` for the dashboard.

### Docker (production-like)

```bash
# Build and run everything as one container
docker compose up --build
```

Open `http://localhost:3000` — serves both API and dashboard.

---

## API Reference

### Health Check

```
GET /health
```

Response:
```json
{
  "status": "ok",
  "uptime": 1234,
  "timestamp": "2026-05-13T10:00:00.000Z"
}
```

---

### Create Campaign

```
POST /api/v1/campaigns
Content-Type: application/json
```

Request:
```json
{
  "name": "Sleep Wellness Q3",
  "slug": "sleep-q3",
  "iosUrl": "https://apps.apple.com/app/id123456",
  "androidUrl": "https://play.google.com/store/apps/details?id=com.lilly.myapp",
  "fallbackUrl": "https://example.com/landing",
  "metadata": {
    "source": "facebook",
    "topic": "sleep"
  },
  "deepLink": {
    "iosScheme": "lillymobileapp",
    "androidPackage": "com.lilly.myapp",
    "deepLinkPath": "/campaign/{slug}"
  }
}
```

Response (201):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Sleep Wellness Q3",
  "slug": "sleep-q3",
  "trackingLink": "https://your-server.onrender.com/c/sleep-q3",
  "iosUrl": "https://apps.apple.com/app/id123456",
  "androidUrl": "https://play.google.com/store/apps/details?id=com.lilly.myapp",
  "fallbackUrl": "https://example.com/landing",
  "metadata": { "source": "facebook", "topic": "sleep" },
  "deepLink": {
    "iosScheme": "lillymobileapp",
    "androidPackage": "com.lilly.myapp",
    "deepLinkPath": "/campaign/{slug}"
  },
  "clickCount": 0,
  "installCount": 0,
  "createdAt": "2026-05-13T10:00:00.000Z",
  "updatedAt": "2026-05-13T10:00:00.000Z"
}
```

**Deep Link Config (optional):**

| Field | Format | Example |
|-------|--------|---------|
| `iosScheme` | URL scheme (letters, digits, `+.-`) | `lillymobileapp` |
| `androidPackage` | Reverse domain (must contain dots) | `com.lilly.myapp` |
| `deepLinkPath` | Path with `{slug}` placeholder | `/campaign/{slug}` |

The `trackingLink` is auto-generated from the request's host — no manual URL config needed.

---

### List Campaigns

```
GET /api/v1/campaigns
```

Response:
```json
{
  "campaigns": [ ... ],
  "total": 5
}
```

---

### Get Campaign

```
GET /api/v1/campaigns/:id
```

---

### Update Campaign

```
PUT /api/v1/campaigns/:id
Content-Type: application/json
```

All fields are optional (partial update):
```json
{
  "name": "Updated Name",
  "metadata": { "source": "organic", "topic": "wellness" },
  "deepLink": {
    "iosScheme": "lillymobileapp",
    "androidPackage": "com.lilly.myapp",
    "deepLinkPath": "/welcome"
  }
}
```

---

### Delete Campaign

```
DELETE /api/v1/campaigns/:id
```

Response: `204 No Content`

---

### Click / Redirect (Campaign Link)

```
GET /c/:slug
```

This is the link you distribute in ads. When opened:
1. Server detects device type from User-Agent
2. Records a click fingerprint (async, non-blocking)
3. Determines action based on deep link config:

**Without deep link config** — standard redirect:

| Device | Redirect Target |
|--------|----------------|
| iOS (iPhone/iPad) | `campaign.iosUrl` (302) |
| Android | `campaign.androidUrl` (302) |
| Other | `campaign.fallbackUrl` (302) |

**With deep link config** — interstitial page (iOS/Android):

| Device | Behavior |
|--------|----------|
| iOS | Serves HTML page that tries `{iosScheme}://{deepLinkPath}`. If app isn't installed, falls back to App Store after 1.5s |
| Android | Serves HTML page with Intent URI: `intent://{deepLinkPath}#Intent;package={androidPackage};S.browser_fallback_url={androidUrl};end`. Falls back to Play Store after 2s |
| Other | 302 redirect to `campaign.fallbackUrl` |

---

### Attribution Match

```
POST /api/v1/attribution/match
Content-Type: application/json
```

Called by your app on launch to retrieve campaign context.

The server automatically detects the device's IP and User-Agent from request headers — the request body can be empty or optionally include overrides:

Request (minimal — recommended):
```json
{}
```

Request (with explicit overrides):
```json
{
  "ip": "203.0.113.42",
  "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X)...",
  "installedAt": "2026-05-13T10:31:15Z"
}
```

Response (match found — first call):
```json
{
  "matched": true,
  "attribution": {
    "campaignId": "550e8400-e29b-41d4-a716-446655440000",
    "campaignName": "Sleep Wellness Q3",
    "campaignSlug": "sleep-q3",
    "metadata": {
      "source": "facebook",
      "topic": "sleep"
    },
    "clickedAt": "2026-05-13T10:30:00.000Z",
    "matchConfidence": "high",
    "matchMethod": "fingerprint"
  }
}
```

Response (no match — or already consumed):
```json
{
  "matched": false,
  "attribution": null
}
```

**One-shot behavior:** A successful match **consumes** the click. Subsequent calls from the same device return `{ "matched": false }` until the user clicks a campaign link again. This prevents duplicate attributions.

**Confidence Levels:**

| Level | Time since click |
|-------|-----------------|
| `high` | Less than 1 hour |
| `medium` | 1–6 hours |
| `low` | 6–24 hours |

---

### Campaign Stats (Analytics)

```
GET /api/v1/stats/:campaignId
```

Returns daily aggregated click and install counts for a campaign, used by the dashboard chart.

Response:
```json
{
  "campaignId": "550e8400-e29b-41d4-a716-446655440000",
  "campaignName": "Sleep Wellness Q3",
  "totalClicks": 142,
  "totalInstalls": 38,
  "daily": [
    { "date": "2026-05-10", "clicks": 45, "installs": 12 },
    { "date": "2026-05-11", "clicks": 52, "installs": 14 },
    { "date": "2026-05-12", "clicks": 45, "installs": 12 }
  ]
}
```

---

## Deep Linking Setup

To enable deep linking for a campaign, provide the `deepLink` config when creating/updating the campaign.

### iOS Setup

Add to your app's `Info.plist`:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>lillymobileapp</string>
    </array>
  </dict>
</array>
```

Your app will receive the URL `lillymobileapp:///campaign/sleep-q3` (scheme + deepLinkPath with `{slug}` replaced).

### Android Setup

Add to your `AndroidManifest.xml`:
```xml
<activity android:name=".MainActivity">
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="intent"
          android:host="campaign"
          android:pathPrefix="/sleep-q3" />
  </intent-filter>
</activity>
```

The server constructs an Intent URI that the browser handles natively — opens the app if installed, falls back to the Play Store URL otherwise.

**Validation rules:**
- `iosScheme`: Must match `^[a-zA-Z][a-zA-Z0-9+.-]*$` (standard URL scheme format)
- `androidPackage`: Must match `^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$` (reverse-domain format, must contain at least one dot — e.g., `com.lilly.myapp`, not `lillymobileapp`)

---

## Mobile App Integration

Call the attribution match API on every app launch:

### JavaScript / React Native

```javascript
const response = await fetch('https://appcampaignpoc.onrender.com/api/v1/attribution/match', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
});
const result = await response.json();

if (result.matched) {
  // Personalize first-launch experience
  console.log('Campaign:', result.attribution.campaignName);
  console.log('Source:', result.attribution.metadata.source);
  console.log('Topic:', result.attribution.metadata.topic);
}
```

### Swift (iOS)

```swift
func checkAttribution() async {
    guard let url = URL(string: "https://appcampaignpoc.onrender.com/api/v1/attribution/match") else { return }
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = "{}".data(using: .utf8)

    do {
        let (data, _) = try await URLSession.shared.data(for: request)
        let result = try JSONDecoder().decode(AttributionResult.self, from: data)
        if result.matched, let attribution = result.attribution {
            // Personalize experience based on attribution.metadata
        }
    } catch {
        print("Attribution check failed: \(error)")
    }
}
```

---

## End-to-End Test Flow

```bash
# 1. Start the server
npm run dev

# 2. Create a campaign (with deep linking)
curl -X POST http://localhost:3000/api/v1/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Campaign",
    "slug": "test-campaign",
    "iosUrl": "https://apps.apple.com/app/id123456",
    "androidUrl": "https://play.google.com/store/apps/details?id=com.lilly.test",
    "fallbackUrl": "https://example.com",
    "metadata": { "source": "test", "topic": "sleep" },
    "deepLink": {
      "iosScheme": "lillytest",
      "androidPackage": "com.lilly.test",
      "deepLinkPath": "/campaign/{slug}"
    }
  }'

# 3. Simulate a click (with iPhone User-Agent)
#    With deep link config, this returns an HTML page (not a 302)
curl -A "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15" \
  http://localhost:3000/c/test-campaign
# → Returns HTML interstitial page that tries lillytest:// scheme

# 4. Query attribution (simulating app's first launch)
curl -X POST http://localhost:3000/api/v1/attribution/match \
  -H "Content-Type: application/json" \
  -d '{}'
# → Returns { "matched": true, "attribution": { ... } }

# 5. Query attribution again (second launch)
curl -X POST http://localhost:3000/api/v1/attribution/match \
  -H "Content-Type: application/json" \
  -d '{}'
# → Returns { "matched": false, "attribution": null }
#   (click was consumed on first match)

# 6. Check analytics
curl http://localhost:3000/api/v1/stats/<campaign-id-from-step-2>
```

---

## Deployment (Render)

1. Push code to GitHub
2. Connect repo to Render
3. Render auto-detects `render.yaml` and deploys using the Dockerfile

No manual URL configuration needed — the server auto-detects its own host from incoming requests.

The `render.yaml` configures:
- Docker-based web service (multi-stage build: backend + frontend)
- Health check at `/health`
- Auto-deploy on push to main

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment (production serves React dashboard) |
| `ATTRIBUTION_WINDOW_HOURS` | `24` | How long a click is valid for matching |

**Rate limiting:** 100 requests per 15-minute window (per IP).

**Confidence thresholds:**
| Threshold | Hours |
|-----------|-------|
| High | 0–1 |
| Medium | 1–6 |
| Low | 6–24 |

---

## Tech Stack

**Backend:**
- TypeScript + Node.js 20
- Express 4.x
- Zod (request validation)
- Pino (structured logging)
- ua-parser-js (device detection)
- express-rate-limit

**Frontend:**
- React 18
- Vite
- Tailwind CSS
- Recharts (analytics charts)
- TypeScript

**Infrastructure:**
- Docker (multi-stage Alpine build)
- Render (render.yaml)

---

## Future Improvements

- [ ] PostgreSQL/Redis storage backend
- [ ] Authentication for campaign management APIs
- [x] Campaign analytics (charts, conversion rates)
- [ ] Webhook notifications on attribution match
- [x] Deep linking support (open app if installed, fallback to store)
- [x] Click consumption (one-shot attribution — prevents duplicates)
- [x] Install tracking and mobile integration guide
- [ ] SDK packages for iOS/Android integration
- [ ] A/B testing support via campaign variants
- [ ] Universal Links (iOS) / App Links (Android) support
