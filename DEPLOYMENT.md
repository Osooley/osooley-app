# Deployment Guide
## From zip file to live URL in ~30 minutes

---

## Step 1 — GitHub (5 min)

1. Create a new repo at github.com → "New repository"
   - Name: `osooley`
   - Private ✓
   - No README (we have one)

2. Unzip the project and push:
```bash
cd osooley
git init
git add .
git commit -m "Osooley Cleveland beta — initial commit"
git remote add origin https://github.com/YOUR_USERNAME/osooley.git
git branch -M main
git push -u origin main
```

---

## Step 2 — Supabase (10 min)

1. Go to [supabase.com](https://supabase.com) → "New project"
   - Name: `osooley-cleveland`
   - Password: save this somewhere safe
   - Region: `East US (North Virginia)` — closest to Cleveland
   - Click "Create new project" and wait ~2 min

2. Go to **SQL Editor** (left sidebar)
   - Click "New query"
   - Open `supabase/migrations/001_schema.sql` from the project
   - Paste the entire contents
   - Click "Run"
   - You should see: "Success. No rows returned"
   - This creates all tables, seeds the 5 Cleveland ZIPs with CMI scores, and loads your 2 pilot deals

3. Go to **Project Settings → API**
   - Copy these three values for Step 4:
     - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
     - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

4. Go to **Authentication → URL Configuration**
   - Add your Vercel URL to "Redirect URLs" after deployment (come back to this)
   - For now add: `http://localhost:3000/**`

---

## Step 3 — Get API Keys (5 min)

**Anthropic (Claude AI)**
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. API Keys → Create Key
3. Copy the `sk-ant-...` key → `ANTHROPIC_API_KEY`

**RentCast (Property data)**
1. Go to [app.rentcast.io](https://app.rentcast.io)
2. Sign up free → API Dashboard → Generate API key
3. Free tier: 50 calls/month (enough for beta demos)
4. Copy key → `RENTCAST_API_KEY`

---

## Step 4 — Vercel Deployment (5 min)

1. Go to [vercel.com](https://vercel.com) → "Add New Project"
2. Click "Import" next to your `osooley` GitHub repo
3. Framework: **Next.js** (auto-detected)
4. Click "Environment Variables" and add all 5:

```
NEXT_PUBLIC_SUPABASE_URL        = https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY   = eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY       = eyJhbGc...
ANTHROPIC_API_KEY               = sk-ant-...
RENTCAST_API_KEY                = your_rentcast_key
```

5. Click "Deploy"
6. Wait ~2 min → your live URL appears: `osooley-xxx.vercel.app`

---

## Step 5 — Connect Auth to Your Domain (2 min)

1. Copy your Vercel URL (e.g. `https://osooley-xxx.vercel.app`)
2. Go back to Supabase → **Authentication → URL Configuration**
3. Set "Site URL" to your Vercel URL
4. Add to "Redirect URLs": `https://osooley-xxx.vercel.app/**`
5. Save

---

## Step 6 — Test the live app

1. Open your Vercel URL
2. Click "Get started" → sign up with your email
3. Complete the profile quiz
4. Go to Dashboard — you should see Pythias Ave and Roanoke Ave pre-loaded
5. Click "Analyze a deal" → enter any address → click "Auto-fill"
6. Run the analysis
7. Check Portfolio tracker → Pythias tracker should show 14 tasks

**If something's broken:**
- Vercel dashboard → your project → "Functions" tab → check for errors
- Supabase dashboard → "Logs" → check for auth or DB errors
- Make sure all 5 env variables are set in Vercel

---

## Custom Domain (optional, ~10 min)

1. Buy a domain (suggested: `osooleycle.com` or `osooley.io`)
2. Vercel → Project → Settings → Domains → Add domain
3. Follow DNS instructions (usually add a CNAME record at your registrar)
4. Update Supabase redirect URL to match new domain

---

## Sharing with Cleveland Partners

Once deployed, share:
- **The live URL** for them to explore
- **PARTNER_DEMO.md** as your talking points
- Ask them to sign up and look at the ZIP explorer

For the demo meeting, walk through `PARTNER_DEMO.md` in order.
The two pilot deals (Pythias + Roanoke) are pre-loaded and ready to show.

---

## Auto-deploy on updates

Every `git push` to `main` automatically redeploys on Vercel. Workflow:
```bash
# Make a change
git add .
git commit -m "Update CMI scores for 44110"
git push
# Vercel deploys in ~90 seconds
```

---

## What's seeded and ready

- ✅ 5 Cleveland ZIPs with full CMI scores
- ✅ Pythias Ave (44110) — under contract tracker with 14 tasks
- ✅ Roanoke Ave (44109) — exploring tracker with 9 tasks
- ✅ Auth system (sign up, sign in, sign out)
- ✅ Investor profile quiz
- ✅ Deal analyzer with RentCast auto-fill
- ✅ Full financial engine (CoC, DSCR, CapEx, 5yr projection)
- ✅ AI narrative via Claude API
- ✅ Risk/reward scoring
- ✅ Section 8 scenario comparison
- ✅ Home warranty threshold flag
- ✅ Deal structuring suggestions
