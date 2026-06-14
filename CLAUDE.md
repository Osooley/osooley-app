# CLAUDE.md — Osooley Project Context

> **Purpose:** This file orients an AI coding assistant (Claude, Claude Code, etc.) working on the Osooley codebase. It captures the stack, architecture, environment setup, hard-won gotchas, and current priorities so a fresh session reasons *with* context instead of from scratch. Read this first.
>
> **Note:** This file is committed to the repo, which is currently **public**. It contains **no secrets and no business strategy** — technical context only. Never add API keys, passwords, or confidential business information to this file.

---

## What Osooley is

Osooley is an AI-powered real estate investment analysis web app for individual investors, currently focused on the **Cleveland, Ohio** market. The core user flow: an investor pastes a property listing URL, and the app reads the listing, pulls rental/market data, runs an AI deal analysis, and returns a structured report with a **confidence score** (a signal of how trustworthy the analysis is given available data).

It is a pre-revenue MVP. The current priority is **stabilizing the core flow so it runs end-to-end with no dead links or visible bugs** — not adding new scope.

---

## Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | **Next.js** (currently `15.3.6`) | ⚠️ This version has a known security vulnerability — see To-Dos. |
| Language | **TypeScript** (~87% of codebase) | Strict type discipline required — see Gotchas. |
| Styling | **Tailwind CSS** | Config in `tailwind.config.js`. |
| Backend / DB | **Supabase** | Postgres + Auth + Storage. |
| Hosting | **Vercel** | Auto-deploys from the `main` branch. |
| AI analysis | **Anthropic Claude API** | Powers deal analysis. Metered/paid — every call costs money. |
| Market data | **RentCast API** | Rent estimates and comps. Metered/paid. Coverage limits — see Gotchas. |
| Charts | **Recharts** (`2.15.4`) | v3 exists but is a breaking change; do not upgrade casually. |

---

## Repository structure

```
osooley-app/
├── Public/                  # Static assets
├── app/                     # Next.js App Router pages & routes
├── components/              # React components
├── lib/                     # Client initialization, helpers (Supabase/Anthropic/RentCast clients live here)
├── supabase/
│   └── migrations/
│       └── 001_schema.sql   # The real schema (tables + RLS policies). KEEP.
├── types/                   # TypeScript types
├── .env.local.example       # Template of required env vars (placeholders only, no real keys)
├── middleware.ts            # Next.js middleware (auth/session handling)
├── next.config.js
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── DEPLOYMENT.md            # Deployment notes
└── PARTNER_DEMO.md          # Demo notes
```

---

## Environment variables

Required variables (names only — real values live in Vercel, never in the repo). See `.env.local.example` for the canonical list.

| Variable | Purpose | Managed by |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | **Supabase↔Vercel integration** (do not also set manually) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public key | **Supabase↔Vercel integration** |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key (server-only, sensitive) | **Supabase↔Vercel integration** |
| `ANTHROPIC_API_KEY` | Claude API access | Set manually in Vercel |
| `RENTCAST_API_KEY` | RentCast API access | Set manually in Vercel |
| `NEXT_PUBLIC_APP_URL` | App's own base URL (used for redirects/share links) | Set manually — must equal the live Vercel URL |
| `NEXT_PUBLIC_APP_NAME` | Display name | Set manually — value is `Osooley` |

**Important:** The Supabase variables are managed by the Supabase↔Vercel integration. Do **not** add manual copies of them in Vercel — doing so causes a sync conflict ("variable already exists"). Anthropic and RentCast keys are set manually and are not touched by the integration.

---

## Deployment

- **Repo:** `github.com/Osooley/osooley-app` (currently public for Hobby-tier deploys; will be privatized before external sharing).
- **Vercel project:** `osooley-app` — auto-deploys on every push/merge to `main`.
- **Live URL:** `https://osooley-app.vercel.app`
- **Workflow:** edit code → push to `main` → Vercel auto-builds and deploys → Supabase applies any new migrations on merge.
- Secrets are injected at build/runtime from Vercel env vars. Editing code and pushing to GitHub never touches real keys (the repo only holds the placeholder `.env.local.example`).

---

## Supabase configuration (important behaviors)

- **Row Level Security (RLS) is enabled** and auto-applied to new tables. This enforces per-user data isolation (one user cannot read another's data). When adding new tables, you must define RLS policies or the app won't be able to read them.
- **Auto-expose new tables is OFF** — access is granted manually per table. Intentional.
- **Auth URL configuration:** Supabase Auth → URL Configuration must have **Site URL** and redirect URLs set to the live Vercel URL (`https://osooley-app.vercel.app`). If this is missing, login/signup redirects fail — and it looks like a code bug when it's actually config.
- **Migrations** in `supabase/migrations/` are auto-applied on merge to `main` via the GitHub integration. They must run cleanly and identically every time.

---

## Gotchas & hard-won lessons (READ BEFORE DEBUGGING)

These are real issues already encountered on this project. Don't relearn them the hard way.

1. **Never store the codebase in OneDrive.** OneDrive corrupts Next.js folder names (parentheses `()` get turned into curly braces `{}`), which breaks the App Router. Keep the local working copy in a dedicated folder *outside* OneDrive.

2. **TypeScript type-union discipline.** Adding a value to a style/config object without updating its corresponding type union causes build failures. When you add a value to a typed object, update the type too. This has broken the build repeatedly.

3. **Migrations must contain schema only — never manual data scripts.** A file (`002_link_pilot_deals.sql`) was previously committed to `migrations/` containing a one-off manual data step with a `'YOUR_USER_ID_HERE'` placeholder. It broke every automated migration run (`invalid input syntax for type uuid`). It was deleted. **Lesson:** anything that says "run this manually after signup" or contains a placeholder to fill in does NOT belong in `supabase/migrations/`. Put manual/seed scripts in a separate `scripts/` or `supabase/manual/` directory.

4. **RentCast coverage is limited to ~5 core Cleveland ZIP codes.** Outside those ZIPs, list price and rent frequently fall back to default values. **This is a known data limitation, not a code bug** — don't burn debugging time on it. When testing, use addresses *inside* the covered ZIPs to see correct behavior. A fallback chain (e.g., a secondary data API, or county records for price) is planned but not yet built.

5. **Every AI analysis and RentCast lookup costs real money** (metered APIs). Be mindful when writing code that calls them in loops or on every render. Caching and rate-limiting matter for unit economics.

6. **Debugging tip:** when a feature silently fails in the browser, the real error is almost always in the browser console (F12 → Console). The visible symptom is often misleading; the console error points at the cause.

---

## The core flow (the path that must work flawlessly)

This is the demo path. Prioritize bugs that block any of these steps over cosmetic issues.

1. **Landing page** loads fully with correct **Osooley** branding (the former "PropWise" name has been fully removed from the codebase).
2. **Sign up / log in** (Supabase Auth) — requires the auth URL config above.
3. **Paste a Cleveland listing URL** → the listing reader extracts property data.
4. **AI analysis runs** (Claude API) → returns a structured deal analysis.
5. **Confidence score** renders.
6. **Market data** shows real numbers (RentCast) — verify with an in-coverage ZIP.
7. **Save to portfolio / share** the result.

---

## Current priorities & to-dos

**Stabilize (do first):**
- Walk the core flow end-to-end; fix anything that blocks it (dead links, errors, broken auth).
- Set `NEXT_PUBLIC_APP_URL` to the live Vercel URL and redeploy.
- Confirm Supabase Auth Site/redirect URLs are set to the live URL.

**Before any external/investor demo:**
- **Patch Next.js.** `15.3.6` has a published security vulnerability — upgrade to the patched version (`package.json` change + redeploy). Do this when not mid-debugging.
- ✅ **Naming cleanup (done):** the app was previously called "PropWise"; all leftover `PropWise`/`propwise` references have been replaced with `Osooley`/`osooley` (brand prose → `Osooley`, identifiers/URLs → `osooley`). (`NEXT_PUBLIC_APP_NAME` is `Osooley`.)
- Ensure no dead links or default/placeholder values are visible in the demo path.

**Build-out (after stabilization):**
- RentCast fallback chain for out-of-coverage addresses.
- Instrument API cost per analysis (log Claude + RentCast cost) — needed for pricing decisions.
- Onboarding survey (short, a few questions at signup) for user segmentation.

**Dependency hygiene (low priority):**
- Numerous transitive dependencies are flagged deprecated in build logs (`rimraf`, `inflight`, `glob`, `eslint@8`, etc.). These are warnings, not errors, and clean up naturally when main deps are updated. Don't chase them individually.

---

## How to work in this codebase

- **Don't break working deploys.** Test changes; the app is currently live and building cleanly.
- **Prioritize the core demo flow** over polish and refactors.
- **Keep secrets out of code** — always read from `process.env.X`, never hardcode a key.
- **Respect the TypeScript types** — update type definitions when changing typed objects.
- **Don't reintroduce manual scripts into `migrations/`.**
- **Flag risks before acting.** When a step has a known gotcha or a hard-to-reverse consequence, surface it and the decision *before* making the change, not after.
