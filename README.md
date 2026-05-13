# Campaign Attribution Server

A lightweight, self-hosted campaign attribution server inspired by AppsFlyer. It tracks which ad/campaign link a user clicked, redirects them to the appropriate app store, and later tells your app about it — enabling personalized first-launch experiences.

## How It Works

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         ATTRIBUTION FLOW                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  1. CLICK                    2. INSTALL               3. MATCH            │
│  ─────────                   ──────────               ────────            │
│                                                                           │
│  User clicks               User installs            App calls API         │
│  campaign link             from App Store           on first launch        │
│       │                         │                        │                │
│       ▼                         │                        ▼                │
│  ┌─────────┐                    │                 ┌─────────────┐        │
│  │ Server  │ Records:           │                 │   Server    │        │
│  │         │ • IP address       │                 │   matches   │        │
│  │         │ • User-Agent       │                 │   fingerprint│        │
│  │         │ • Timestamp        │                 │   to click  │        │
│  │         │ • Campaign ID      │                 │             │        │
│  └────┬────┘                    │                 └──────┬──────┘        │
│       │                         │                        │                │
│       ▼                         │                        ▼                │
│  302 Redirect                   │                 Returns campaign        │
│  → App Store (iOS)              │                 metadata to app         │
│  → Play Store (Android)         │                                        │
│  → Fallback URL (other)         │                                        │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### The Problem

When a user clicks an ad and gets redirected to the App Store, the connection between the ad and the user is **completely lost**. The App Store doesn't pass any parameters through to your app.

### The Solution

This server acts as a middleman that **remembers** who clicked what:

1. **Click Time:** Records a fingerprint (hash of IP + device info) along with campaign parameters
2. **Install Time:** The app asks "did this device click anything recently?"
3. **Match:** Server compares fingerprints and returns the campaign context

### Fingerprint Matching

Since we can't use cookies or URL parameters across the App Store boundary, we use **device fingerprinting**:

```
CLICK TIME:                          INSTALL TIME:
  IP: 203.0.113.42                     IP: 203.0.113.42
  UA: iPhone/iOS 18.7                  UA: iPhone/iOS 18.7
  Time: 10:30:00                       Time: 10:31:15

  fingerprint = SHA256("203.0.113.42|ios|18.7|iphone")

  Same fingerprint + within 24h window = MATCH ✓
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Docker Container                   │
│                                                       │
│  ┌───────────────────────────────────────────────┐   │
│  │           Express Server (port 3000)           │   │
│  │                                                 │   │
│  │  /api/v1/campaigns    → Campaign CRUD           │   │
│  │  /c/:slug             → Click & Redirect        │   │
│  │  /api/v1/attribution  → Match API               │   │
│  │  /api/v1/stats        → Analytics API           │   │
│  │  /health              → Health Check            │   │
│  │  /*                   → React Dashboard (prod)  │   │
│  └───────────────────────────────────────────────┘   │
│                                                       │
│  ┌──────────────┐  ┌────────────────────────────┐   │
│  │  web-dist/   │  │  In-Memory Storage (Maps)   │   │
│  │  (React SPA) │  │  • campaigns                │   │
│  │              │  │  • clicks                   │   │
│  │              │  │  • fingerprint index        │   │
│  └──────────────┘  └────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

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
│   │   ├── campaign.model.ts     # Campaign interface
│   │   ├── click.model.ts        # Click record interface
│   │   └── attribution.model.ts  # Attribution result interface
│   ├── storage/
│   │   ├── storage.interface.ts  # Abstract contract (swap to DB later)
│   │   ├── memory.storage.ts     # In-memory Map implementation
│   │   └── index.ts              # Storage factory
│   ├── services/
│   │   ├── fingerprint.service.ts # SHA-256 hashing + UA normalization
│   │   ├── redirect.service.ts    # Device detection + URL resolution
│   │   ├── campaign.service.ts    # Campaign CRUD logic
│   │   ├── click.service.ts       # Click recording
│   │   └── attribution.service.ts # Fingerprint matching + confidence scoring
│   ├── routes/
│   │   ├── health.routes.ts      # GET /health
│   │   ├── campaign.routes.ts    # CRUD /api/v1/campaigns
│   │   ├── click.routes.ts       # GET /c/:slug (redirect)
│   │   ├── attribution.routes.ts # POST /api/v1/attribution/match
│   │   └── stats.routes.ts       # GET /api/v1/stats/:campaignId
│   ├── middleware/
│   │   ├── error-handler.ts      # Global error handling
│   │   └── request-logger.ts     # Structured request logging
│   └── utils/
│       ├── logger.ts             # Pino logger
│       ├── ua-parser.ts          # User-Agent parsing
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
        ├── CampaignForm.tsx      # Create campaign form
        ├── CampaignList.tsx      # Campaign cards with tracking links
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
| Express over Fastify | Simpler, larger ecosystem, good enough for this scale |
| Zod validation | Runtime type safety on API boundaries |
| Pino logger | Structured JSON logs, low overhead |
| React + Vite + Tailwind | Fast builds, modern DX, utility-first CSS |
| Auto-detect base URL from request | No manual config needed — works on any domain |

---

## Dashboard UI

The React frontend provides an admin dashboard for managing campaigns:

- **Create campaigns** with App Store, Play Store, and fallback URLs
- **Auto-generates URL slugs** from campaign names
- **Fixed metadata fields** — Source and Topic inputs (keys are fixed, no raw JSON)
- **Copy tracking links** to clipboard with one click
- **View click & install counts** per campaign
- **Analytics charts** — Recharts line chart showing daily clicks/installs over time
- **Mobile integration guide** — per-campaign code snippets for iOS/Android (Swift, JS)
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
  "androidUrl": "https://play.google.com/store/apps/details?id=com.example.app",
  "fallbackUrl": "https://example.com/landing",
  "metadata": {
    "source": "facebook",
    "topic": "sleep"
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
  "androidUrl": "https://play.google.com/store/apps/details?id=com.example.app",
  "fallbackUrl": "https://example.com/landing",
  "metadata": { "source": "facebook", "topic": "sleep" },
  "clickCount": 0,
  "installCount": 0,
  "createdAt": "2026-05-13T10:00:00.000Z",
  "updatedAt": "2026-05-13T10:00:00.000Z"
}
```

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
  "metadata": { "source": "organic" }
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
2. Records a click fingerprint
3. Issues a `302 redirect` to the appropriate store

| Device | Redirect Target |
|--------|----------------|
| iOS (iPhone/iPad) | `campaign.iosUrl` |
| Android | `campaign.androidUrl` |
| Other | `campaign.fallbackUrl` |

---

### Attribution Match

```
POST /api/v1/attribution/match
Content-Type: application/json
```

Called by your app on first launch to retrieve campaign context.

The server automatically detects the device's IP and User-Agent from request headers — the request body can be empty or optionally include overrides:

Request (minimal):
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

Response (match found):
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

> **Note:** A successful match consumes the click — the same device will not match again for the same campaign. This prevents duplicate attributions and increments the campaign's `installCount`.

Response (no match):
```json
{
  "matched": false,
  "attribution": null
}
```

**Confidence Levels:**
- `high`: Click was less than 1 hour before install
- `medium`: Click was 1-6 hours before install
- `low`: Click was 6-24 hours before install

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

## End-to-End Test Flow

Here's how to test the full attribution flow locally:

```bash
# 1. Start the server
npm run dev

# 2. Create a campaign
curl -X POST http://localhost:3000/api/v1/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Campaign",
    "slug": "test-campaign",
    "iosUrl": "https://apps.apple.com/app/id123456",
    "androidUrl": "https://play.google.com/store/apps/details?id=com.example",
    "fallbackUrl": "https://example.com",
    "metadata": { "source": "test", "topic": "sleep" }
  }'

# 3. Simulate a click (with iPhone User-Agent)
curl -v -A "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15" \
  http://localhost:3000/c/test-campaign
# → Should return 302 redirect to the iOS URL

# 4. Query attribution (simulating app's first launch)
curl -X POST http://localhost:3000/api/v1/attribution/match \
  -H "Content-Type: application/json" \
  -d '{}'
# → Should return { "matched": true, "attribution": { ... } }
# → The click is consumed — calling again returns { "matched": false }

# 5. Check analytics
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
- [ ] Support for deep links (app already installed)
- [x] Click deduplication (same device, same campaign — click consumed on match)
- [ ] A/B testing support via campaign variants
- [x] Install tracking and mobile integration guide
- [ ] SDK packages for iOS/Android integration
