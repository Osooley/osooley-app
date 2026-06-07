-- ============================================================
-- 001 — PROFILES
-- Extends Supabase auth.users with investor profile data
-- ============================================================

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  email text,
  -- Investor profile
  goal text check (goal in ('cashflow', 'wealth', 'hybrid')),
  risk_tolerance text check (risk_tolerance in ('conservative', 'moderate', 'aggressive')),
  investment_tier text check (investment_tier in ('turnkey', 'rehab', 'brrrr')),
  management_style text check (management_style in ('passive', 'semi', 'active')),
  horizon text check (horizon in ('3-5', '5-10', '10+')),
  capital_available numeric,
  profile_complete boolean default false,
  role text default 'investor' check (role in ('investor', 'agent', 'pm', 'lender', 'contractor', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: users can only see and edit their own profile
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 002 — ZIP CMI SCORES
-- Proprietary Cleveland Market Index — admin managed
-- ============================================================

create table public.zip_cmi (
  zip text primary key,
  neighborhood text not null,
  -- Pillar 1: Rental Demand (0-25)
  rental_demand_score numeric not null default 0,
  -- Pillar 2: Appreciation Potential (0-25)
  appreciation_score numeric not null default 0,
  -- Pillar 3: Risk Environment (0-25)
  risk_env_score numeric not null default 0,
  -- Pillar 4: Deal Quality & Liquidity (0-25)
  deal_quality_score numeric not null default 0,
  -- Derived totals
  total_score numeric generated always as
    (rental_demand_score + appreciation_score + risk_env_score + deal_quality_score) stored,
  grade text,
  -- Entry opportunity (separate axis, 0-100)
  entry_opportunity_score numeric not null default 0,
  -- Display data (human-curated)
  avg_yield_low numeric,          -- e.g. 7.5
  avg_yield_high numeric,         -- e.g. 9.0
  appreciation_3yr numeric,       -- e.g. 14.0 = 14%
  avg_vacancy numeric,            -- e.g. 4.2 = 4.2%
  median_entry_price numeric,     -- typical purchase price
  recommended_tiers text[],       -- ['turnkey', 'rehab']
  -- Human network notes (rich text, markdown ok)
  network_notes text,
  financing_notes text,
  insights jsonb,                 -- array of insight strings
  -- Metadata
  updated_at timestamptz default now(),
  updated_by uuid references public.profiles(id)
);

-- RLS: anyone can read CMI, only admins can write
alter table public.zip_cmi enable row level security;

create policy "Anyone can view CMI scores"
  on public.zip_cmi for select
  to authenticated
  using (true);

create policy "Only admins can update CMI"
  on public.zip_cmi for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Seed the 5 Cleveland ZIPs
insert into public.zip_cmi (
  zip, neighborhood,
  rental_demand_score, appreciation_score, risk_env_score, deal_quality_score,
  grade, entry_opportunity_score,
  avg_yield_low, avg_yield_high, appreciation_3yr, avg_vacancy, median_entry_price,
  recommended_tiers, network_notes, financing_notes,
  insights
) values
(
  '44111', 'Kamm''s Corners',
  22, 18, 20, 20,
  'A-', 52,
  8.0, 9.0, 18.0, 3.8, 145000,
  ARRAY['turnkey'],
  'One of Cleveland''s most stable rental markets. Low turnover, long-term tenants, consistent appreciation. Our agent has closed 4 deals here in 18 months. PM reports zero evictions in 44111 portfolio in 2 years.',
  'Strong comps support appraisals. Conventional and portfolio lenders both active here. Standard financing available.',
  '[
    "One of Cleveland''s most stable rental markets — low turnover, long-term tenants.",
    "Gross yields average 8-9%. Vacancy rate of 3.8% is exceptional for the Cleveland metro.",
    "Development activity increasing along Lorain Ave. Commercial anchor investment signals confidence."
  ]'::jsonb
),
(
  '44109', 'Old Brooklyn / Brooklyn Centre',
  19, 16, 18, 18,
  'B+', 68,
  7.5, 8.5, 14.0, 4.2, 120000,
  ARRAY['turnkey', 'rehab'],
  'Strong rental demand from young professionals and families. Properties typically lease in under 3 weeks. Eviction rate is low. Good tenant quality overall.',
  'Standard conventional financing. Most properties qualify with 20% down. Lead paint inspection recommended on pre-1978 stock.',
  '[
    "Strong rental demand from young professionals and families. Avg vacancy 4.2%.",
    "Price-to-rent ratio is favorable. Properties here typically hit 7-9% gross yield.",
    "Appreciation trending up — proximity to downtown and neighborhood reinvestment driving it."
  ]'::jsonb
),
(
  '44132', 'Euclid / South Euclid Border',
  18, 15, 17, 18,
  'B', 72,
  8.0, 8.5, 12.0, 4.5, 110000,
  ARRAY['turnkey', 'rehab'],
  'Our agent covers both municipalities and knows the point-of-sale inspection requirements in each. Quiet residential market with good school district access.',
  'Straightforward financing. Good comps available throughout the ZIP. South Euclid side has stronger appreciation history.',
  '[
    "Quiet residential market — attracts stable, long-term tenants.",
    "Yields average 8-8.5%. Less volatility than Collinwood, more yield than Kamm''s.",
    "South Euclid side has stronger appreciation history. Know which side of the border you''re on."
  ]'::jsonb
),
(
  '44123', 'Euclid (West)',
  17, 13, 15, 18,
  'B', 76,
  8.5, 9.5, 9.0, 5.0, 95000,
  ARRAY['turnkey', 'brrrr'],
  'We have a vetted PM in 44123 with 40+ doors under management. They know the city requirements inside out. City of Euclid has an active rental registration program.',
  'Standard financing available. Watch for lead paint on pre-1978 stock — very common in this ZIP. Annual rental registration fee required.',
  '[
    "Solid cash flow market. Yields of 8-10% achievable on turnkey properties. Entry prices are low.",
    "Appreciation has been steady but modest — better suited for cash flow investors.",
    "City of Euclid requires annual rental registration and inspection. Our team handles this."
  ]'::jsonb
),
(
  '44110', 'Collinwood',
  16, 14, 13, 15,
  'B-', 84,
  9.0, 10.5, 11.0, 5.8, 85000,
  ARRAY['rehab', 'brrrr'],
  'Street-by-street knowledge is critical here. We will not submit a deal in 44110 without agent verification of the specific block. BRRRR investors have found strong ARV uplift — $40-60k purchase with $80-100k ARV post-rehab on solid blocks.',
  'Some lenders require portfolio products here. We have a vetted lender who actively finances 44110 BRRRR deals. Watch for lead paint — virtually all stock is pre-1978.',
  '[
    "Higher yields but more variance. Best for investors comfortable with light rehab and 5+ year hold.",
    "BRRRR investors have found strong ARV uplift — $40-60k purchase prices with $80-100k post-rehab ARV.",
    "Neighborhood is transitioning. CMI scores B- with improving trend. Block-level diligence required."
  ]'::jsonb
);

-- Function to auto-compute grade from total score
create or replace function compute_cmi_grade(score numeric)
returns text language plpgsql as $$
begin
  return case
    when score >= 90 then 'A+'
    when score >= 80 then 'A-'
    when score >= 70 then 'B+'
    when score >= 60 then 'B'
    when score >= 50 then 'B-'
    when score >= 40 then 'C'
    else 'D'
  end;
end;
$$;

-- ============================================================
-- 003 — PROPERTIES
-- ============================================================

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  -- Location
  address text not null,
  zip text references public.zip_cmi(zip),
  zip_freeform text,              -- for out-of-network ZIPs
  city text,
  state text default 'OH',
  -- Property details
  property_type text check (property_type in ('sfr','duplex','triplex','fourplex','condo','townhouse','commercial')),
  bedrooms integer,
  bathrooms numeric,
  sqft integer,
  year_built integer,
  units integer default 1,
  -- Pricing
  list_price numeric,
  offer_price numeric,
  -- Source
  source text check (source in ('network','self','redfin','zillow','mls','other')) default 'self',
  source_url text,
  network_verified boolean default false,
  submitted_by uuid references public.profiles(id),  -- agent/PM who submitted
  -- Status
  status text check (status in (
    'exploring','interested','offer_submitted','under_contract','clear_to_close','closed','passed'
  )) default 'exploring',
  -- Condition
  condition_notes text,
  condition_items jsonb,          -- array of ConditionInput
  -- Metadata
  notes text,
  photos jsonb,                   -- array of URLs
  pro_forma_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.properties enable row level security;

create policy "Users can view own properties"
  on public.properties for select
  using (auth.uid() = user_id);

create policy "Users can insert own properties"
  on public.properties for insert
  with check (auth.uid() = user_id);

create policy "Users can update own properties"
  on public.properties for update
  using (auth.uid() = user_id);

-- Network agents can see properties they submitted
create policy "Network contacts can see submitted properties"
  on public.properties for select
  using (auth.uid() = submitted_by);

-- Seed pilot deals
insert into public.properties (
  id, address, zip, city, state,
  property_type, bedrooms, bathrooms, sqft, year_built, units,
  list_price, offer_price, source, network_verified, status, notes
) values
(
  'a0000000-0000-0000-0000-000000000001',
  '15901 Pythias Ave', '44110', 'Cleveland', 'OH',
  'sfr', 3, 1, 950, 1916, 1,
  95000, 95000, 'network', true, 'under_contract',
  'Offer accepted. Closing May 6. Newer water heater, furnace fair, sewer updated, electrical semi-updated. Half roof replaced last year, other half in rehab scope. No visible knob and tube.'
),
(
  'a0000000-0000-0000-0000-000000000002',
  '3401 Roanoke Ave', '44109', 'Cleveland', 'OH',
  'duplex', 4, 2, 1405, 1890, 2,
  140000, 135000, 'network', true, 'exploring',
  'Updated kitchens and baths, LVP flooring, vinyl windows, vinyl siding, younger roof. Tenants current. Up unit $950/mo lease until 10/31/26. Down unit $800/mo MTM planning to renew. 1 younger HE furnace, 1 older fair furnace, 2 newer water heaters. No lead certification on file.'
);

-- ============================================================
-- 004 — ANALYSES
-- ============================================================

create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  user_id uuid references public.profiles(id),
  -- ── INPUTS ──────────────────────────────────────
  purchase_price numeric,
  down_payment_pct numeric,
  interest_rate numeric,
  loan_term_years integer default 30,
  seller_credits numeric default 0,
  monthly_rent numeric,
  section8_rent numeric,
  other_income numeric default 0,
  property_taxes_annual numeric,
  insurance_monthly numeric,
  hoa_monthly numeric default 0,
  utilities_monthly numeric default 0,
  pm_fee_pct numeric,
  pm_placement_months numeric default 1,
  vacancy_rate numeric,
  maintenance_monthly numeric,
  lawn_monthly numeric default 0,
  capex_monthly numeric,
  rehab_cost numeric default 0,
  rehab_timeline_months integer default 0,
  arv numeric,
  use_home_warranty boolean default false,
  warranty_monthly numeric default 0,
  capex_items jsonb,
  -- ── OUTPUTS ─────────────────────────────────────
  -- Key metrics
  loan_amount numeric,
  monthly_pi numeric,
  total_cash_in numeric,
  monthly_cash_flow numeric,
  annual_cash_flow numeric,
  coc_return numeric,
  dscr numeric,
  noi numeric,
  gross_yield numeric,
  grm numeric,
  break_even_occupancy numeric,
  -- Section 8 scenario
  s8_monthly_cash_flow numeric,
  s8_coc_return numeric,
  s8_dscr numeric,
  -- 5-year projections (base case)
  proj_conservative_5yr numeric,
  proj_base_5yr numeric,
  proj_optimistic_5yr numeric,
  -- Comparisons
  hysa_rate numeric,
  hysa_5yr numeric,
  sp500_5yr numeric,
  -- Scores
  risk_score numeric,
  reward_score numeric,
  cmi_total_score numeric,
  verdict text check (verdict in ('recommended','conditional','fail')),
  verdict_reason text,
  -- Flags
  home_warranty_recommended boolean default false,
  -- AI
  ai_assessment text,
  -- Structuring suggestions (JSON)
  structuring_suggestions jsonb,
  next_steps jsonb,
  -- Expenses breakdown (JSON)
  expense_breakdown jsonb,
  -- Full projections (JSON)
  projections jsonb,
  created_at timestamptz default now()
);

alter table public.analyses enable row level security;

create policy "Users can view own analyses"
  on public.analyses for select
  using (auth.uid() = user_id);

create policy "Users can create own analyses"
  on public.analyses for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- 005 — DEAL TRACKER
-- ============================================================

create table public.deal_tracker (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade unique,
  user_id uuid references public.profiles(id),
  stage text check (stage in (
    'exploring','active_interest','under_contract',
    'clear_to_close','closed_setup','performing'
  )) default 'exploring',
  tasks jsonb not null default '[]'::jsonb,
  -- stage opened/closed timestamps
  stage_history jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.deal_tracker enable row level security;

create policy "Users can manage own trackers"
  on public.deal_tracker for all
  using (auth.uid() = user_id);

-- Seed Pythias tracker (Stage 3 — Under Contract)
insert into public.deal_tracker (property_id, user_id, stage, tasks)
values (
  'a0000000-0000-0000-0000-000000000001',
  null,  -- will be updated post-auth seeding
  'under_contract',
  '[
    {"id":"p1","task":"Offer accepted","owner":"investor","completed":true,"blocking":false},
    {"id":"p2","task":"PM locked at 9%","owner":"investor","completed":true,"blocking":false},
    {"id":"p3","task":"Schedule general inspection + sewer scope + lead paint","owner":"agent","completed":false,"blocking":true,"due_note":"THIS WEEK — May 6 is your wall"},
    {"id":"p4","task":"Get specific furnace assessment from inspector","owner":"inspector","completed":false,"blocking":false,"notes":"Fair condition on 1916 furnace = potential $4,500 credit"},
    {"id":"p5","task":"Confirm electrical scope (what is semi-updated?)","owner":"inspector","completed":false,"blocking":false,"notes":"Insurance underwriter will ask"},
    {"id":"p6","task":"Rate lock with lender","owner":"investor","completed":false,"blocking":true,"due_note":"Do not let this float to May 6"},
    {"id":"p7","task":"Confirm PM rent projection post-rehab","owner":"investor","completed":false,"blocking":true,"due_note":"Most important number — get in writing"},
    {"id":"p8","task":"Confirm $10k rehab scope with contractor","owner":"contractor","completed":false,"blocking":false,"notes":"Is furnace in the $10k or extra?"},
    {"id":"p9","task":"Negotiate inspection credits if applicable","owner":"agent","completed":false,"blocking":false},
    {"id":"p10","task":"Review title commitment","owner":"investor","completed":false,"blocking":false},
    {"id":"p11","task":"Final walkthrough","owner":"investor","completed":false,"blocking":false,"due_note":"Day before close"},
    {"id":"p12","task":"Review closing disclosure","owner":"investor","completed":false,"blocking":false,"due_note":"3 days before May 6"},
    {"id":"p13","task":"Verify wire instructions independently — never from email","owner":"investor","completed":false,"blocking":false},
    {"id":"p14","task":"Close — May 6","owner":"investor","completed":false,"blocking":false}
  ]'::jsonb
);

-- Seed Roanoke tracker (Stage 1 — Exploring)
insert into public.deal_tracker (property_id, user_id, stage, tasks)
values (
  'a0000000-0000-0000-0000-000000000002',
  null,
  'exploring',
  '[
    {"id":"r1","task":"Ryan confirmed tenant details and ledger","owner":"agent","completed":true,"blocking":false},
    {"id":"r2","task":"Preliminary deal analysis run","owner":"investor","completed":true,"blocking":false},
    {"id":"r3","task":"Confirm water/sewer bill average","owner":"agent","completed":false,"blocking":false,"notes":"Need actual number — ask for last 3 months bills"},
    {"id":"r4","task":"Confirm lawn care cost and provider","owner":"agent","completed":false,"blocking":false},
    {"id":"r5","task":"Request roof age and last inspection date","owner":"agent","completed":false,"blocking":true,"notes":"Biggest CapEx unknown on this deal"},
    {"id":"r6","task":"Confirm Down unit lease renewal status","owner":"agent","completed":false,"blocking":false,"notes":"Has lease been signed yet?"},
    {"id":"r7","task":"Lead certification status — critical","owner":"agent","completed":false,"blocking":true,"notes":"1890 build. Must be addressed pre-close or as closing contingency. Budget separately."},
    {"id":"r8","task":"Get home warranty quotes — 2 units","owner":"investor","completed":false,"blocking":false,"notes":"Target $130-150/mo total. Strongly recommended given 1890 age."},
    {"id":"r9","task":"Decide on offer price","owner":"investor","completed":false,"blocking":false,"notes":"Recommendation: $128k. Justified by 1890 build, lead cert risk, thin near-term cash flow."}
  ]'::jsonb
);

-- ============================================================
-- UTILITY FUNCTIONS
-- ============================================================

-- Update updated_at on row change
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure update_updated_at();

create trigger properties_updated_at before update on public.properties
  for each row execute procedure update_updated_at();

create trigger deal_tracker_updated_at before update on public.deal_tracker
  for each row execute procedure update_updated_at();
