#!/bin/bash
# PropWise — Full Setup Script
# Run this once to get from zero to deployed beta
# ---------------------------------------------------

echo "🏠 PropWise Setup Script"
echo "========================"

# ─── Step 1: Initialize Git ───────────────────────────────────────────────────
echo ""
echo "Step 1: Initializing Git repository..."
git init
git add .
git commit -m "Initial commit — PropWise Cleveland beta"

echo ""
echo "→ Next: Create a new GitHub repository named 'propwise'"
echo "  Then run:"
echo ""
echo "  git remote add origin https://github.com/YOUR_USERNAME/propwise.git"
echo "  git branch -M main"
echo "  git push -u origin main"
echo ""

# ─── Step 2: Install dependencies ────────────────────────────────────────────
echo "Step 2: Installing dependencies..."
npm install

# ─── Step 3: Supabase setup instructions ─────────────────────────────────────
echo ""
echo "Step 3: Supabase setup"
echo "----------------------"
echo "1. Go to https://supabase.com → New Project"
echo "   Name: propwise-cleveland"
echo "   Password: (save this)"
echo "   Region: US East (closest to Cleveland)"
echo ""
echo "2. Once created, go to Project Settings → API and copy:"
echo "   - Project URL  →  NEXT_PUBLIC_SUPABASE_URL"
echo "   - anon/public key  →  NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "   - service_role key  →  SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "3. Go to SQL Editor → paste contents of supabase/migrations/001_schema.sql → Run"
echo "   This creates all tables, RLS policies, and seeds the 5 Cleveland ZIPs + pilot deals."
echo ""

# ─── Step 4: Environment variables ───────────────────────────────────────────
echo "Step 4: Set up environment variables"
echo "-------------------------------------"
echo "Copy .env.local.example to .env.local and fill in:"
echo ""
echo "  NEXT_PUBLIC_SUPABASE_URL"
echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "  SUPABASE_SERVICE_ROLE_KEY"
echo "  ANTHROPIC_API_KEY  (from console.anthropic.com)"
echo "  RENTCAST_API_KEY   (from app.rentcast.io — free tier ok for beta)"
echo ""

# ─── Step 5: Local dev ───────────────────────────────────────────────────────
echo "Step 5: Run locally"
echo "-------------------"
echo "  npm run dev"
echo ""
echo "  Open http://localhost:3000"
echo ""

# ─── Step 6: Deploy to Vercel ────────────────────────────────────────────────
echo "Step 6: Deploy to Vercel"
echo "------------------------"
echo "1. Push code to GitHub (from Step 1)"
echo "2. Go to https://vercel.com → Add New Project"
echo "3. Import your 'propwise' GitHub repo"
echo "4. Add environment variables (same as .env.local)"
echo "5. Deploy"
echo ""
echo "  Vercel auto-deploys on every push to main."
echo "  Your beta URL will be: https://propwise.vercel.app"
echo ""
echo "  Custom domain: add in Vercel → Project → Domains"
echo "  Suggested: propwise.io or propwisecle.com"
echo ""
echo "✅ Setup complete. You're ready to show Cleveland partners a live product."
