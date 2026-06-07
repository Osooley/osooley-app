// ─── Investor Profile ───────────────────────────────────────────────────────

export type InvestorGoal = 'cashflow' | 'wealth' | 'hybrid'
export type RiskTolerance = 'conservative' | 'moderate' | 'aggressive'
export type InvestmentTier = 'turnkey' | 'rehab' | 'brrrr'
export type ManagementStyle = 'passive' | 'semi' | 'active'
export type InvestmentHorizon = '3-5' | '5-10' | '10+'

export interface InvestorProfile {
  id: string
  full_name: string
  email: string
  goal: InvestorGoal
  risk_tolerance: RiskTolerance
  investment_tier: InvestmentTier
  management_style: ManagementStyle
  horizon: InvestmentHorizon
  capital_available: number
  profile_complete: boolean
  created_at: string
}

// ─── ZIP / CMI ───────────────────────────────────────────────────────────────

export interface ZipCMI {
  zip: string
  neighborhood: string
  // Pillar scores (each 0-25)
  rental_demand_score: number
  appreciation_score: number
  risk_score: number
  deal_quality_score: number
  // Derived
  total_score: number      // sum of 4 pillars, max 100
  grade: string            // A+, A-, B+, B, B-, C, D
  entry_opportunity_score: number  // 0-100, separate axis
  // Display data
  avg_yield_range: string  // e.g. "7.5–9.0%"
  appreciation_3yr: number // percentage e.g. 14 = 14%
  avg_vacancy: number      // percentage e.g. 4.2 = 4.2%
  recommended_tiers: InvestmentTier[]
  network_notes: string
  financing_notes: string
  updated_at: string
}

// ─── Property ────────────────────────────────────────────────────────────────

export type PropertyType = 'sfr' | 'duplex' | 'triplex' | 'fourplex' | 'condo' | 'townhouse'
export type PropertySource = 'network' | 'self' | 'redfin' | 'zillow' | 'mls'
export type PropertyStatus = 'exploring' | 'interested' | 'offer_submitted' | 'under_contract' | 'closed' | 'passed'

export interface Property {
  id: string
  user_id: string
  address: string
  zip: string
  city: string
  state: string
  property_type: PropertyType
  bedrooms: number
  bathrooms: number
  sqft: number
  year_built: number
  list_price: number
  offer_price: number
  source: PropertySource
  network_verified: boolean
  status: PropertyStatus
  notes: string
  created_at: string
}

// ─── Analysis Inputs ─────────────────────────────────────────────────────────

export interface ConditionInput {
  item: string
  age_years?: number
  condition: 'new' | 'good' | 'fair' | 'poor' | 'unknown'
  replacement_cost?: number
  estimated_life_remaining?: number
}

export interface AnalysisInputs {
  // Financing
  purchase_price: number
  down_payment_pct: number        // e.g. 20 = 20%
  interest_rate: number           // e.g. 7.2 = 7.2%
  loan_term_years: number         // 30 | 20 | 15
  seller_credits: number

  // Income
  monthly_rent: number            // market rent
  section8_rent?: number          // if applicable
  other_income?: number           // parking, laundry, etc.
  units?: number                  // for multi-family

  // Expenses — fixed
  property_taxes_annual: number
  insurance_monthly: number
  hoa_monthly?: number
  utilities_monthly?: number      // owner-paid only

  // Expenses — variable
  pm_fee_pct: number              // e.g. 9 = 9%
  pm_placement_months?: number    // months rent for placement fee
  vacancy_rate?: number           // override CMI default
  maintenance_monthly: number
  lawn_monthly?: number

  // CapEx — from condition model
  capex_monthly: number           // calculated by capex engine
  capex_items?: ConditionInput[]  // systems assessed

  // Rehab (if applicable)
  rehab_cost?: number
  rehab_timeline_months?: number
  arv?: number                    // after repair value

  // Overrides
  use_home_warranty?: boolean
  warranty_monthly?: number
}

// ─── Analysis Outputs ─────────────────────────────────────────────────────────

export interface ExpenseBreakdown {
  mortgage_pi: number
  property_taxes: number
  insurance: number
  hoa: number
  pm_monthly: number
  pm_placement_annualized: number
  vacancy_loss: number
  capex: number
  maintenance: number
  utilities: number
  lawn: number
  total: number
}

export interface CashFlowResult {
  gross_monthly_rent: number
  vacancy_adjustment: number
  effective_gross_income: number
  total_expenses: number
  monthly_cash_flow: number
  annual_cash_flow: number
}

export interface KeyMetrics {
  coc_return: number              // Cash-on-Cash %
  dscr: number                    // Debt Service Coverage Ratio
  noi: number                     // Net Operating Income (annual)
  gross_yield: number             // % of purchase price
  grm: number                     // Gross Rent Multiplier
  break_even_occupancy: number    // % occupancy needed to break even
  price_per_sqft: number
  total_cash_in: number           // down + rehab + closing costs
}

export interface WealthProjection {
  year: number
  cash_flow_cumulative: number
  mortgage_paydown: number
  appreciation: number
  tax_benefit_estimate: number
  total_return: number
  total_return_on_cash: number    // % return on initial cash invested
}

export interface ScenarioProjection {
  conservative: WealthProjection[]
  base: WealthProjection[]
  optimistic: WealthProjection[]
}

export interface AlternativeComparison {
  hysa_rate: number               // current best rate, fetched dynamically
  hysa_5yr: number
  sp500_5yr: number               // using 10% avg
  this_deal_5yr_base: number
  advantage_over_hysa: number
  advantage_over_sp500: number
}

export interface RiskScore {
  market_risk: number             // 1-5 (from CMI)
  deal_risk: number               // 1-5 (DSCR margin, vacancy sensitivity)
  property_risk: number           // 1-5 (age, condition, CapEx burden)
  execution_risk: number          // 1-5 (rehab complexity)
  liquidity_risk: number          // 1-5 (always present)
  overall: number                 // 1-10 weighted
}

export interface RewardScore {
  overall: number                 // 1-10
}

export type Verdict = 'recommended' | 'conditional' | 'fail'

export interface AnalysisOutput {
  // Scores
  cmi: ZipCMI
  risk: RiskScore
  reward: RewardScore
  risk_reward_ratio: number
  verdict: Verdict
  verdict_reason: string

  // Financials
  expenses: ExpenseBreakdown
  cash_flow: CashFlowResult
  metrics: KeyMetrics

  // Section 8 scenario (if available)
  section8_cash_flow?: CashFlowResult
  section8_metrics?: KeyMetrics

  // Projections
  projections: ScenarioProjection
  comparison: AlternativeComparison

  // BRRRR (if applicable)
  brrrr?: {
    capital_recovered: number
    remaining_capital: number
    new_coc_on_remaining: number
    equity_multiple_5yr: number
  }

  // Home warranty flag
  home_warranty_recommended: boolean
  home_warranty_monthly_est: number
  capex_with_warranty: number

  // Structuring suggestions
  structuring_suggestions: StructuringSuggestion[]

  // AI narrative
  ai_assessment?: string
  next_steps: NextStep[]

  created_at: string
}

export interface StructuringSuggestion {
  type: 'increase_down' | 'lower_price' | 'seller_credits' | 'combination'
  description: string
  new_down_payment?: number
  new_offer?: number
  new_credits?: number
  resulting_coc: number
  resulting_dscr: number
}

// ─── Deal Tracker ─────────────────────────────────────────────────────────────

export type TaskOwner = 'investor' | 'agent' | 'lender' | 'inspector' | 'pm' | 'contractor' | 'title'
export type DealStage =
  | 'exploring'
  | 'active_interest'
  | 'under_contract'
  | 'clear_to_close'
  | 'closed_setup'
  | 'performing'

export interface DealTask {
  id: string
  task: string
  owner: TaskOwner
  due_note?: string               // "This week" | "Before May 6" etc.
  completed: boolean
  completed_at?: string
  blocking: boolean               // red flag if not done
  notes?: string
}

export interface DealTracker {
  id: string
  property_id: string
  stage: DealStage
  tasks: DealTask[]
  created_at: string
  updated_at: string
}

// ─── Next Steps ───────────────────────────────────────────────────────────────

export interface NextStep {
  order: number
  title: string
  detail: string
  owner: TaskOwner
  contact_name?: string          // e.g. "Maria G. — Network Agent"
  urgency: 'immediate' | 'this_week' | 'before_close' | 'post_close'
}

// ─── RentCast API ────────────────────────────────────────────────────────────

export interface RentCastProperty {
  id: string
  addressLine1: string
  city: string
  state: string
  zipCode: string
  county: string
  latitude: number
  longitude: number
  propertyType: string
  bedrooms: number
  bathrooms: number
  squareFootage: number
  yearBuilt: number
  lotSize: number
  lastSalePrice: number
  lastSaleDate: string
  assessedValue: number
  taxAssessment: {
    year: number
    value: number
    land: number
    improvements: number
  }
}

export interface RentCastRentEstimate {
  rent: number
  rentRangeLow: number
  rentRangeHigh: number
  latitude: number
  longitude: number
  comparables: RentCastComp[]
}

export interface RentCastComp {
  id: string
  formattedAddress: string
  distance: number
  price: number
  squareFootage: number
  bedrooms: number
  bathrooms: number
  daysOnMarket: number
}

export interface RentCastMarketData {
  zipCode: string
  averageRent: number
  medianRent: number
  minRent: number
  maxRent: number
  totalProperties: number
  vacancyRate?: number
}
