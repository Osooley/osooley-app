# Osooley Cleveland — Beta

> AI-powered real estate investment platform for first-time and out-of-state investors. Built for the Cleveland, OH market.

**Stack:** Next.js 15 · Supabase · Vercel · TypeScript · Tailwind CSS · shadcn/ui · Claude API · RentCast API

---

## What This Is

Osooley helps people who have never invested in real estate — or who are unfamiliar with Cleveland — evaluate properties with confidence. Every deal is scored against a proprietary Cleveland Market Index (CMI), run through a comprehensive financial model, and compared honestly against alternatives (HYSA, S&P 500).

The platform never recommends what it wouldn't buy itself.

---

## Beta Scope (Partner Demo)

- [ ] Landing page with three investor paths
- [ ] Investor profile quiz (guided, flexible)
- [ ] ZIP explorer — 5 Cleveland ZIPs with CMI scores
- [ ] Deal analyzer — manual entry + RentCast auto-fill
- [ ] Full 3-layer analysis output (CMI + deal score + 5yr projection)
- [ ] Risk/reward scoring
- [ ] Two pilot deals pre-loaded (Pythias Ave + Roanoke Ave)
- [ ] Portfolio tracker with stage-based to-do lists

---

## Tech Stack Decisions

### Why These Tools

| Tool | Why |
|------|-----|
| **Next.js 15** | App Router, server components, API routes — full stack in one repo |
| **Supabase** | Auth + PostgreSQL + RLS in one platform. Free tier covers beta. |
| **Vercel** | One-click deploy from GitHub. Native Next.js support. |
| **RentCast API** | Best fit for rental data. Free 50 calls/mo for dev. Commercial use allowed. Covers all 5 target ZIPs. Provides: property records, rent estimates, vacancy rates, market stats by ZIP. |
| **Anthropic Claude API** | Powers the AI analysis narrative and deal assessment |
| **shadcn/ui** | Clean, accessible components. No opinionated styling lock-in. |
| **Recharts** | Charts for wealth projection and risk/reward visualization |

### APIs Evaluated

| API | Decision | Reason |
|-----|----------|--------|
| RentCast | ✅ PRIMARY | Best rental data, free tier, commercial ok, great ZIP-level data |
| ATTOM | 🟡 SECONDARY | Better for tax/ownership records. Use for property detail enrichment. Free trial. |
| Zillow | ❌ SKIP | No public API. Data behind partnership agreements. |
| Rentometer | 🟡 BACKUP | Good rent comps. Use if RentCast data is thin for a specific address. |

### Open Source Leveraged

- `vercel/next.js` — official `with-supabase` starter (auth, RLS, TypeScript pre-configured)
- `calculaterealestate.com` TypeScript repo — CoC, DSCR, GRM formulas (adapted)
- `shadcn/ui` — all UI components
- `recharts` — all charts

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/osooley.git
cd osooley
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the migrations in order:

```bash
npx supabase db push
```

Or manually run each file in `supabase/migrations/` in the Supabase SQL editor.

### 3. Set up environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_key

# RentCast
RENTCAST_API_KEY=your_rentcast_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

1. Push repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Add environment variables in Vercel dashboard
4. Deploy

Vercel auto-deploys on every push to `main`.

---

## Project Structure

```
osooley/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx       ← investor home
│   │   ├── analyze/page.tsx         ← deal analyzer
│   │   ├── markets/page.tsx         ← ZIP explorer
│   │   └── portfolio/page.tsx       ← deal tracker
│   ├── api/
│   │   ├── analyze/route.ts         ← Claude analysis
│   │   ├── property/route.ts        ← RentCast lookup
│   │   └── rentcast/route.ts        ← market data
│   ├── layout.tsx
│   └── page.tsx                     ← landing page
├── components/
│   ├── ui/                          ← shadcn components
│   ├── analysis/
│   │   ├── deal-score-card.tsx
│   │   ├── expense-breakdown.tsx
│   │   ├── wealth-projection-chart.tsx
│   │   └── risk-reward-bar.tsx
│   ├── markets/
│   │   └── zip-card.tsx
│   ├── profile/
│   │   └── investor-quiz.tsx
│   └── tracker/
│       └── deal-tracker.tsx
├── lib/
│   ├── calculations/
│   │   ├── coc.ts                   ← Cash-on-Cash engine
│   │   ├── dscr.ts                  ← DSCR engine
│   │   ├── capex.ts                 ← CapEx model
│   │   ├── wealth-projection.ts     ← 5-year model
│   │   └── deal-score.ts            ← CMI + scoring
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   └── rentcast/
│       └── client.ts
├── supabase/
│   └── migrations/
│       ├── 001_profiles.sql
│       ├── 002_zip_cmi.sql
│       ├── 003_properties.sql
│       ├── 004_analyses.sql
│       └── 005_deal_tracker.sql
└── types/
    └── index.ts
```

---

## CMI Scores — Cleveland Beta ZIPs

| ZIP | Neighborhood | CMI Score | Grade | Entry Opportunity |
|-----|-------------|-----------|-------|------------------|
| 44111 | Kamm's Corners | 80/100 | A− | 52/100 (Premium) |
| 44109 | Old Brooklyn | 71/100 | B+ | 68/100 (Moderate) |
| 44132 | Euclid/S. Euclid | 68/100 | B | 72/100 (Good) |
| 44123 | Euclid West | 63/100 | B | 76/100 (Good) |
| 44110 | Collinwood | 58/100 | B− | 84/100 (High) |

CMI is updated quarterly using data from the PM and agent network. See `supabase/migrations/002_zip_cmi.sql` for the full scoring breakdown.

---

## Pilot Deals

Two real properties pre-loaded for demo purposes:

**Pythias Ave (44110)** — Under contract, closing May 6
- SFR · 1916 build · $95k offer · $10k rehab
- Market rent: $1,300 · Section 8: $1,475
- CoC: 4.1% (market) → 12.1% (Section 8)

**Roanoke Ave (44109)** — Exploring
- Duplex · 1890 build · $135k ask
- Current rents: $800 + $950 · Stabilized: $2,000/mo
- Stabilized CoC: 7.6% (with home warranty)

---

## Roadmap

### Beta (now)
- Core deal analyzer
- CMI ZIP explorer
- Investor profile
- Two pilot deals

### V1 (post-partner feedback)
- Network portal (agent/PM deal submission)
- Automated property data pull (RentCast address lookup)
- Full portfolio tracker
- Notification system (deal matches profile)

### V2
- Section 8 voucher market data
- BRRRR refinance calculator
- Offer structuring engine
- Partner referral tracking

---

## License

Private. All rights reserved.
