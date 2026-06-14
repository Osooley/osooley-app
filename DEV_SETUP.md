# DEV_SETUP.md — Local Development Guide

> **Audience:** Anyone setting up the Osooley app to run locally (currently Omar, for Phase 2). Follow top to bottom. Read the **Critical Warnings** box first — it covers mistakes that have already cost this project time.

---

## ⚠️ Critical warnings (read first)

1. **DO NOT put this project in OneDrive (or any cloud-sync folder).** OneDrive corrupts Next.js App Router folder names — it turns parentheses `()` into curly braces `{}`, which silently breaks routing. Clone the repo into a plain local folder, e.g. `C:\dev\osooley-app` (Windows) or `~/dev/osooley-app` (Mac/Linux). **Never** under `OneDrive\`, `Documents` (if Documents is synced), etc.

2. **Never commit `.env.local`.** It holds real API keys. It is already in `.gitignore` — keep it that way. Only `.env.local.example` (placeholders) belongs in the repo.

3. **Never use `sudo` with `npm install`.** If you hit permission errors, that is not the fix and it can break your Node setup. Use nvm or fix the npm prefix instead (notes below).

---

## Prerequisites

Install these once:

| Tool | Version | Where |
|---|---|---|
| **Node.js** | 18 or newer (LTS 22 recommended) | https://nodejs.org (download the LTS installer) |
| **Git** | any recent | https://git-scm.com |
| A code editor | — | Cursor (what Ahmed uses) or VS Code, or use Claude Code (see HANDOFF guide) |

Verify after installing (open a **new** terminal window first so PATH refreshes):
```bash
node --version    # should print v18.x or higher
git --version
```

---

## Step 1 — Clone the repo

In a plain (non-synced) folder:
```bash
cd ~/dev            # or C:\dev on Windows — anywhere NOT in OneDrive
git clone https://github.com/Osooley/osooley-app.git
cd osooley-app
```

## Step 2 — Install dependencies

```bash
npm install
```
You will see a lot of **deprecation warnings** (rimraf, glob, eslint, etc.). These are harmless — they come from sub-dependencies, not our code. The install still succeeds.

If you get an `EACCES`/permission error: do **not** rerun with sudo. Fix npm's global prefix instead:
```bash
npm config set prefix '~/.npm-global'
# then add ~/.npm-global/bin to your PATH in ~/.zshrc or ~/.bashrc
```

## Step 3 — Set up environment variables

Copy the template to a real local env file:
```bash
cp .env.local.example .env.local
```
Then open `.env.local` and fill in the **real values**. Get them from:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` key (keep secret) |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com → API Keys |
| `RENTCAST_API_KEY` | https://app.rentcast.io → API Dashboard |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local dev |
| `NEXT_PUBLIC_APP_NAME` | `Osooley` |

> The Supabase keys are on one page (Project Settings → API). Ask Ahmed for access to the Supabase project if you don't have it. **Never paste these keys into a chat, an AI tool, or any file other than `.env.local`.**

## Step 4 — Run the app locally

```bash
npm run dev
```
Open **http://localhost:3000** in your browser. The app should load. Changes you save to the code hot-reload automatically.

To stop the server: `Ctrl + C` in the terminal.

## Step 5 — Build check before pushing

Before you push changes, confirm the production build compiles (this catches TypeScript errors that `npm run dev` may not):
```bash
npm run build
```
If this fails with a **TypeScript type error**, the usual cause on this project is: you added a value to a typed object (a style/config map) without updating its type union. Update the type definition to match. (See `CLAUDE.md` → Gotchas.)

---

## Database / migrations

- The schema lives in `supabase/migrations/001_schema.sql`. It is applied automatically when changes merge to `main` (via the Supabase↔GitHub integration).
- **Do not put manual or one-off data scripts in `supabase/migrations/`.** They break automated runs. A prior file (`002_link_pilot_deals.sql`) did exactly this and had to be removed. Put manual/seed SQL in a separate folder (e.g. `scripts/`) and run it by hand in the Supabase SQL editor.
- If you need to apply schema by hand: open Supabase → SQL Editor → paste the contents of `001_schema.sql` → run.

---

## The deploy workflow

```
edit code  →  git push to main  →  Vercel auto-builds & deploys  →  Supabase applies new migrations
```
- Live URL: **https://osooley-app.vercel.app**
- Real secrets live in Vercel's env settings (and the Supabase integration), not in the repo. Pushing code never exposes keys.
- After a push, watch the Vercel deployment log. A green build = live. A red build usually names the failing env var or a TypeScript error — fix and push again.

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| Routing/pages broken after clone | Project is in OneDrive | Move it to a non-synced folder, re-clone |
| App loads but login fails / weird redirect | Supabase Auth URL not set | Supabase → Authentication → URL Configuration → set Site URL to your URL (`http://localhost:3000` locally) |
| Analysis shows default/placeholder price & rent | Address is outside the ~5 covered Cleveland ZIPs | Known RentCast limitation — test with an in-coverage ZIP |
| Build fails on a type error | Typed object changed without updating its type | Update the type union |
| `npm install` permission error | — | Do NOT use sudo; fix npm prefix or use nvm |
| Feature silently does nothing | Runtime error in browser | Open dev tools (F12) → Console → read the red error |

---

For deeper project context (architecture, all the gotchas, priorities), read **`CLAUDE.md`** in the repo root.
