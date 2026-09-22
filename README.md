<div align="center">

# 🔗 Shortly

### *Production-Grade URL Shortener with Real-Time Analytics*

[![Made with React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![Made with Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Redis](https://img.shields.io/badge/Redis-Real--time-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)
[![License](https://img.shields.io/badge/License-MIT-8b5cf6?style=for-the-badge)](LICENSE)

**Short links. Big insights.** ⚡

Transform long URLs into powerful, trackable short links with beautiful analytics, custom aliases, and QR codes.

[🚀 Live Demo](https://shortly-mohitt.vercel.app) · [📖 API Docs](#-api-reference) · [🐛 Report Bug](https://github.com/Mohitt029/Shortly/issues) · [✨ Request Feature](https://github.com/Mohitt029/Shortly/issues)

</div>

---


---

## ✨ Features

### 🎯 Core Capabilities
| Feature | Description |
|---------|-------------|
| 🔗 **URL Shortening** | Convert any long URL into a 7-character short link |
| 🎨 **Custom Aliases** | Create branded links like `/my-brand` (3-16 chars) |
| ⏰ **Link Expiration** | Set TTL with automatic `410 Gone` after expiry |
| 🔐 **Auto Reserved Words** | Protects `/api`, `/admin`, `/login` from being claimed |
| 📱 **QR Code Generation** | Every short link comes with a downloadable QR code |
| 🌐 **Canonical URLs** | Auto-normalize trailing slashes, ports, query order |

### 📊 Real-Time Analytics
| Feature | Description |
|---------|-------------|
| ⚡ **Live Click Counts** | Merge persisted + pending (Redis buffer) for accurate real-time display |
| 🖥️ **Device Detection** | Desktop, mobile, tablet, bot classification |
| 🌍 **Geographic Tracking** | Country/city lookup via GeoIP |
| 🌐 **Referrer Analysis** | Top 5 sources driving clicks |
| 📈 **Time-Series Data** | Daily, 7-day, 30-day, 90-day views |
| 🎯 **User-Agent Parsing** | Browser + OS + version detection |

### 🔐 Authentication & Security
| Feature | Description |
|---------|-------------|
| 🪪 **JWT Auth** | Access + refresh tokens with rotation |
| 🔑 **API Keys** | Programmatic access via `sk_...` keys |
| 🛡️ **Rate Limiting** | Per-IP + per-endpoint throttling |
| 🔒 **bcrypt Hashing** | 12-round password hashing |
| 🚫 **SSRF Protection** | Blocks private IPs, localhost, internal networks |
| 🌐 **CORS** | Configured allowed origins |

### ⚙️ System Design
| Feature | Description |
|---------|-------------|
| ❄️ **Snowflake IDs** | 64-bit distributed IDs — 4M/sec per worker |
| 🔢 **Base62 Encoding** | 3.5 trillion combinations with 7 chars |
| 💾 **Redis Cache-Aside** | ~1.5ms warm-hit redirects |
| 📦 **Buffered Writes** | Click events batched to avoid DB hammering |
| ⏱️ **Background Jobs** | Analytics flush (60s) + expired cleanup (daily) |
| 🎯 **Atomic Operations** | `GETDEL`, `findOneAndUpdate` for consistency |

### 🎨 User Experience
| Feature | Description |
|---------|-------------|
| 🌑 **Dark Glassmorphic UI** | Modern design with gradient accents |
| ✨ **Framer Motion** | Smooth page transitions and micro-animations |
| 🔔 **Toast Notifications** | Instant feedback on all actions |
| 📱 **Fully Responsive** | Mobile-first layout works everywhere |
| ⌨️ **Keyboard Shortcuts** | Enter to submit, Esc to close modals |
| 🎯 **Auto-Refresh** | Live analytics update every 15s |

---

## 🏗️ Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│                    🌐 FRONTEND (Vercel)                       │
│         React 18 · Vite · Tailwind · Framer Motion            │
│                                                               │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            │ HTTPS · JSON API
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│                    🚀 BACKEND (Render)                        │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Auth Routes  │  │  URL Routes  │  │  Analytics   │       │
│  │ JWT + bcrypt │  │  CRUD + Own  │  │  Aggregation │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │      Background Jobs (node-cron)                 │       │
│  │  • Flush analytics every 60s                     │       │
│  │  • Cleanup expired URLs daily at 3 AM            │       │
│  └──────────────────────────────────────────────────┘       │
│                                                               │
└──────────┬─────────────────┬─────────────────┬───────────────┘
           │                 │                 │
           ▼                 ▼                 ▼
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │  🍃 MongoDB  │  │  ⚡ Redis    │  │  ❄️ Snowflake│
   │    Atlas     │  │   Upstash    │  │  ID Generator│
   │              │  │              │  │              │
   │  • users     │  │  • URL cache │  │  • 41-bit TS │
   │  • urls      │  │  • click buf │  │  • 10-bit W  │
   │  • clicks    │  │  • session   │  │  • 12-bit SQ │
   └──────────────┘  └──────────────┘  └──────────────┘
```

### 🔄 Request Flow

#### Creating a Short URL
```
1. Client → POST /api/v1/urls
2. Validate URL → canonicalize
3. Generate Snowflake ID (decentralized)
4. Encode to Base62 (7 chars)
5. Save to MongoDB
6. Warm Redis cache with TTL
7. Return short_url
```

#### Redirecting (100:1 read:write ratio)
```
1. Client → GET /:shortCode
2. Check Redis cache ──── HIT ────► Return 302 (< 5ms)
                          │
                         MISS
                          │
                          ▼
3. Query MongoDB
4. Populate Redis cache
5. Fire-and-forget click event
6. Return 302
```

#### Click Tracking (real-time)
```
1. Redirect fires → analyticsService.recordClick()
2. INCR Redis buffer: shortly:clicks:buffer:xxx
3. INSERT ClickEvent document (with UA/Geo parsing)
4. (Non-blocking) User gets redirected
5. Every 60s: Background job flushes buffer → MongoDB
6. Analytics API merges: persisted + pending = real-time total
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| ![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white) | UI framework |
| ![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white) | Build tool + dev server |
| ![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white) | Utility-first CSS |
| ![Framer](https://img.shields.io/badge/Framer_Motion-11-0055FF?logo=framer&logoColor=white) | Animations |
| ![Recharts](https://img.shields.io/badge/Recharts-2-22B5BF?logo=chartdotjs&logoColor=white) | Data visualizations |
| ![React Router](https://img.shields.io/badge/React_Router-6-CA4245?logo=reactrouter&logoColor=white) | Client-side routing |
| ![Axios](https://img.shields.io/badge/Axios-1-5A29E4?logo=axios&logoColor=white) | HTTP client with interceptors |

### Backend
| Technology | Purpose |
|-----------|---------|
| ![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white) | Runtime |
| ![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white) | Web framework |
| ![Mongoose](https://img.shields.io/badge/Mongoose-9-880000?logo=mongoose&logoColor=white) | MongoDB ODM |
| ![JWT](https://img.shields.io/badge/JWT-Auth-000000?logo=jsonwebtokens&logoColor=white) | Authentication |
| ![Winston](https://img.shields.io/badge/Winston-Logs-000000) | Structured logging |
| ![node-cron](https://img.shields.io/badge/node--cron-Jobs-8b5cf6) | Background scheduling |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| ![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-Cloud-47A248?logo=mongodb&logoColor=white) | Primary database |
| ![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?logo=redis&logoColor=white) | Cache + buffer |
| ![Vercel](https://img.shields.io/badge/Vercel-Frontend-000000?logo=vercel&logoColor=white) | Frontend hosting |
| ![Render](https://img.shields.io/badge/Render-Backend-46E3B7?logo=render&logoColor=white) | Backend hosting |

---

## 🚀 Quick Start

### Prerequisites

```
Node.js >= 18.0.0
npm >= 9.0.0
MongoDB Atlas account (free)
Redis OR Memurai (for Windows) OR Upstash (cloud)
```

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/Mohitt029/Shortly.git
cd Shortly
```

### 2️⃣ Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `.env` with your credentials:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/shortly
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
JWT_REFRESH_SECRET=<another random hex>
```

Start the backend:

```bash
npm run dev
```

✅ Server: `http://localhost:5000`  
✅ Health: `http://localhost:5000/health`

### 3️⃣ Frontend Setup

**New terminal:**

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

✅ App: `http://localhost:5173`

### 4️⃣ Windows Users: Install Memurai

Redis doesn't natively support Windows. Install **Memurai**:

1. Download: https://www.memurai.com/get-memurai
2. Install as a Windows Service
3. Verify:

```powershell
memurai-cli ping
# Should return: PONG
```

---

## 📖 API Reference

### Authentication

#### Register

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response `201`:**

```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": { "id": "...", "name": "John Doe", "email": "john@example.com" },
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "api_key": "sk_..."
  }
}
```

#### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "john@example.com", "password": "SecurePass123!" }
```

#### Get Profile

```http
GET /api/v1/auth/me
Authorization: Bearer <access_token>
```

#### Refresh Token

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{ "refresh_token": "<refresh_token>" }
```

---

### URLs

#### Create Short URL

```http
POST /api/v1/urls
Authorization: Bearer <token>
Content-Type: application/json

{
  "long_url": "https://example.com/very/long/path",
  "custom_alias": "my-link",
  "expires_at": "2027-12-31T23:59:59Z"
}
```

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "short_url": "http://localhost:5000/my-link",
    "short_code": "my-link",
    "long_url": "https://example.com/very/long/path",
    "expires_at": "2027-12-31T23:59:59.000Z",
    "created_at": "2026-09-23T10:30:00.000Z",
    "is_custom": true
  }
}
```

#### List My URLs

```http
GET /api/v1/urls?page=1&limit=20
Authorization: Bearer <token>
```

#### Get URL Details

```http
GET /api/v1/urls/:shortCode
Authorization: Bearer <token>
```

#### Update Expiration (Owner Only)

```http
PATCH /api/v1/urls/:shortCode
Authorization: Bearer <token>
Content-Type: application/json

{ "expires_at": "2027-06-30T23:59:59Z" }
```

#### Delete URL (Owner Only)

```http
DELETE /api/v1/urls/:shortCode
Authorization: Bearer <token>
```

---

### Analytics

#### Get Stats

```http
GET /api/v1/analytics/:shortCode?days=30
```

**Response:**

```json
{
  "success": true,
  "data": {
    "shortCode": "my-link",
    "totalClicks": 42,
    "persistedClicks": 40,
    "pendingClicks": 2,
    "clicksInPeriod": 42,
    "periodDays": 30,
    "lastAccessedAt": "2026-09-23T10:35:00.000Z",
    "byDevice": [
      { "device": "desktop", "count": 30 },
      { "device": "mobile", "count": 12 }
    ],
    "byCountry": [
      { "country": "IN", "count": 25 },
      { "country": "US", "count": 17 }
    ],
    "byDay": [
      { "date": "2026-09-22", "count": 20 },
      { "date": "2026-09-23", "count": 22 }
    ],
    "topReferers": [
      { "referer": "https://twitter.com", "count": 15 }
    ]
  }
}
```

---

### Redirect

#### Access Short URL

```http
GET /:shortCode
```

**Success:** `302 Found` → `Location: <long_url>`  
**Not Found:** `404 Not Found`  
**Expired:** `410 Gone`

---

## 🗂️ Project Structure

```
Shortly/
│
├── 📁 backend/
│   ├── 📁 src/
│   │   ├── 📁 config/          # DB, Redis, env, constants
│   │   ├── 📁 models/          # User, Url, ClickEvent
│   │   ├── 📁 services/        # Business logic
│   │   ├── 📁 controllers/     # HTTP handlers
│   │   ├── 📁 routes/          # Express routes
│   │   ├── 📁 middleware/      # Auth, rate limit, errors
│   │   ├── 📁 utils/           # Snowflake, Base62, logger
│   │   ├── 📁 jobs/            # Background cron tasks
│   │   ├── app.js              # Express app
│   │   └── server.js           # Entry point
│   ├── 📁 tests/               # Test suites
│   ├── dns-config.js           # DNS preload (Windows)
│   ├── cleanup.js              # DB reset utility
│   ├── .env.example
│   └── package.json
│
├── 📁 frontend/
│   ├── 📁 src/
│   │   ├── 📁 components/      # Reusable UI
│   │   ├── 📁 pages/           # Route views
│   │   ├── 📁 context/         # Auth provider
│   │   ├── 📁 hooks/           # Custom hooks
│   │   ├── 📁 services/        # API clients
│   │   ├── 📁 utils/           # Formatters
│   │   └── 📁 styles/          # Tailwind
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── .env.example
│   └── package.json
│
├── 📁 docs/
│   └── API.md
│
├── .gitignore
└── README.md
```

---

## 🎓 Key Design Decisions

### Why Snowflake IDs over Auto-Increment?

| Auto-Increment | Snowflake |
|----------------|-----------|
| ❌ Requires centralized DB coordination | ✅ Decentralized |
| ❌ Single point of failure | ✅ Any worker can generate |
| ❌ Slow at scale | ✅ 4M IDs/sec per worker |
| ❌ Predictable (security risk) | ✅ K-sortable (efficient indexes) |

### Why 302 Instead of 301 for Redirects?

| 301 Permanent | 302 Temporary |
|---------------|---------------|
| ❌ Browser caches forever | ✅ Every click hits server |
| ❌ No analytics possible | ✅ Full click tracking |
| ❌ Can't update destination | ✅ Can modify anytime |
| ❌ Can't expire links | ✅ Expiration works |

### Why Redis Buffer for Clicks?

| Direct DB Writes | Redis Buffer |
|------------------|--------------|
| ❌ 10K clicks/sec = 10K writes/sec | ✅ Batch 10K into 1 write |
| ❌ Contention on hot URLs | ✅ Single atomic INCR |
| ❌ High MongoDB cost | ✅ Reduces load 60x |
| ❌ Latency on redirect | ✅ Non-blocking |

### Why Real-Time Merge (Persisted + Pending)?

```
Without merge:
  Total Clicks: 8 (DB, stale by up to 60s)
  Clicks (30d): 10 (ClickEvents, real-time)
  ❌ Mismatch confuses users

With merge:
  Total Clicks: 8 + 2 (pending) = 10
  Clicks (30d): 10
  ✅ Always consistent
```

---

## 🧪 Testing

### Backend Tests

```bash
cd backend
npm test                    # All tests
npm run test:unit           # Unit tests
npm run test:integration    # Integration tests
```

### Manual Testing (PowerShell)

```powershell
# Health check
curl.exe http://localhost:5000/health

# Register
curl.exe -X POST http://localhost:5000/api/v1/auth/register `
  -H "Content-Type: application/json" `
  -d '{\"name\":\"Test\",\"email\":\"test@example.com\",\"password\":\"Test1234!\"}'

# Create short URL
curl.exe -X POST http://localhost:5000/api/v1/urls `
  -H "Content-Type: application/json" `
  -d '{\"long_url\":\"https://github.com\"}'
```

### VS Code REST Client

Open `backend/tests/api.http` → install [REST Client extension](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) → click **Send Request** above each request.

---

## 🌐 Deployment

### Backend → Render

1. **Push to GitHub** (see below)
2. Render → New Web Service → Connect repo
3. Root Directory: `backend`
4. Build: `npm install`
5. Start: `node --require ./dns-config.js src/server.js`
6. Add env vars (MONGODB_URI, REDIS_URL, JWT secrets, `CORS_ORIGIN`, `SHORT_URL_DOMAIN`)

### Frontend → Vercel

1. Vercel → New Project → Import repo
2. Root Directory: `frontend`
3. Framework: `Vite`
4. Env: `VITE_API_URL=https://your-backend.onrender.com/api/v1`

### Production Redis → Upstash

1. https://upstash.com → New Database
2. Copy `rediss://default:xxxx@xxxxx.upstash.io:6379`
3. Add to Render as `REDIS_URL`

### MongoDB Atlas

1. Network Access → Allow `0.0.0.0/0` (or Render IPs)
2. Database Access → Create user with read/write access

---

## 🚀 Push to GitHub (First Time)

```bash
cd D:\shortly

# Initialize git
git init
git branch -M main

# Add remote
git remote add origin https://github.com/Mohitt029/Shortly.git

# Verify .env is ignored
git check-ignore backend/.env frontend/.env
# Should output both paths

# Stage + commit + push
git add .
git commit -m "feat: Shortly — production-grade URL shortener with real-time analytics"
git push -u origin main
```

**If GitHub asks for password** → use a [Personal Access Token](https://github.com/settings/tokens) with `repo` scope.

---

## 🎯 Roadmap

- [x] **Phase 1** — Foundation (Express, MongoDB, Redis, logging)
- [x] **Phase 2** — Core URL shortening (Snowflake + Base62)
- [x] **Phase 3** — Redirect engine (cache-aside, 302/410/404)
- [x] **Phase 4** — Auth + ownership + analytics + jobs
- [x] **Phase 5** — Frontend foundation (Vite, React, Tailwind)
- [x] **Phase 6** — Full UI (Dashboard, Analytics, Profile)
- [x] **Phase 7** — Real-time analytics (merge persisted + pending)
- [ ] **Phase 8** — Production deployment (Render + Vercel)
- [ ] **Phase 9** — Advanced features:
  - [ ] Bulk URL shortening (CSV upload)
  - [ ] Custom domains per user
  - [ ] Password-protected links
  - [ ] Team workspaces
  - [ ] Webhooks on click
  - [ ] Email notifications for high-traffic links
  - [ ] A/B testing for redirect targets

---

## 🐛 Troubleshooting

### ❌ MongoDB SRV lookup fails (Windows)

**Symptom:** `querySrv ECONNREFUSED`

**Fix:** We use `dns-config.js` preloaded via `--require` flag:

```bash
node --require ./dns-config.js src/server.js
```

Already configured in `package.json` scripts.

### ❌ Redis connection refused

**On Windows:** Install [Memurai](https://www.memurai.com/get-memurai) → start service.

```powershell
Get-Service Memurai
# Should show: Running
memurai-cli ping
# Should return: PONG
```

### ❌ Frontend can't reach backend

**Check:**
1. Backend running on port 5000? `curl http://localhost:5000/health`
2. Vite proxy configured? See `frontend/vite.config.js`
3. CORS includes frontend origin? See `backend/.env` → `CORS_ORIGIN`

### ❌ Render cold starts (free tier)

Free tier sleeps after 15 min. Use [UptimeRobot](https://uptimerobot.com) to ping `/health` every 5 min.

### ❌ Total Clicks ≠ Clicks (30d)

Fixed in Phase 7. Both now merge persisted + pending Redis buffer. Verify:

```bash
curl http://localhost:5000/api/v1/analytics/my-link
```

Should return `persistedClicks` + `pendingClicks` = `totalClicks`.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repo
2. Create your branch: `git checkout -b feature/amazing-feature`
3. Commit: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

---

## 👨‍💻 Author

<div align="center">

**Mohitt**

[![GitHub](https://img.shields.io/badge/GitHub-Mohitt029-181717?style=for-the-badge&logo=github)](https://github.com/Mohitt029)

*Striving to make the complex simple.*

</div>

---

## 🙏 Acknowledgments

- [System Design Primer](https://github.com/donnemartin/system-design-primer) for architecture inspiration
- [Snowflake ID](https://en.wikipedia.org/wiki/Snowflake_ID) design from Twitter
- [Base62 Encoding](https://en.wikipedia.org/wiki/Base62) concept from bit.ly
- All open-source contributors whose libraries made this possible

---

## ⭐ Show Your Support

If this project helped you, please give it a **⭐ star**!

<div align="center">

**Built with ❤️ by [Mohitt](https://github.com/Mohitt029)**

[⬆ Back to Top](#-shortly)

</div>
