/**
 * PropWise Deal Calculation Engine
 *
 * Pure TypeScript financial functions — no external dependencies.
 * All inputs in raw numbers (not percentages unless noted).
 * All money outputs in USD.
 */

import type {
  AnalysisInputs,
  ExpenseBreakdown,
  CashFlowResult,
  KeyMetrics,
  WealthProjection,
  ScenarioProjection,
  AlternativeComparison,
  RiskScore,
  RewardScore,
  Verdict,
  AnalysisOutput,
  StructuringSuggestion,
  NextStep,
  ZipCMI,
} from '@/types'

// ─── Constants ───────────────────────────────────────────────────────────────

const HOME_WARRANTY_THRESHOLD = 220  // $/mo — if CapEx + maintenance exceeds this, flag warranty
const DSCR_HARD_FLOOR = 1.0
const NEGATIVE_CASHFLOW_FLAG = 0
const SP500_AVG_ANNUAL = 0.10        // 10% historical average
const APPRECIATION_RATES = {
  conservative: 0.02,
  base: 0.04,
  optimistic: 0.06,
}

// ─── Mortgage Calculator ──────────────────────────────────────────────────────

export function calcMonthlyPayment(
  principal: number,
  annualRatePct: number,
  termYears: number
): number {
  if (annualRatePct === 0) return principal / (termYears * 12)
  const r = annualRatePct / 100 / 12
  const n = termYears * 12
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

export function calcLoanAmount(
  purchasePrice: number,
  downPaymentPct: number,
  sellerCredits: number = 0
): number {
  const downPayment = purchasePrice * (downPaymentPct / 100)
  return purchasePrice - downPayment - sellerCredits
}

export function calcAnnualDebtService(monthlyPI: number): number {
  return monthlyPI * 12
}

// ─── Mortgage Paydown ─────────────────────────────────────────────────────────

export function calcMortgagePaydownOverYears(
  principal: number,
  annualRatePct: number,
  termYears: number,
  years: number
): number {
  const r = annualRatePct / 100 / 12
  const n = termYears * 12
  const months = years * 12
  // Remaining balance after 'months' payments
  const remaining = principal * (Math.pow(1 + r, n) - Math.pow(1 + r, months)) /
    (Math.pow(1 + r, n) - 1)
  return principal - remaining
}

// ─── CapEx Engine ─────────────────────────────────────────────────────────────

export interface CapExItem {
  name: string
  replacement_cost: number
  remaining_life_years: number
}

export function calcCapExMonthly(items: CapExItem[]): number {
  return items.reduce((total, item) => {
    const annual = item.replacement_cost / item.remaining_life_years
    return total + annual / 12
  }, 0)
}

/**
 * Build default CapEx items from year built and known condition data.
 * Returns monthly reserve recommendation.
 */
export function estimateCapEx(
  yearBuilt: number,
  knownItems?: { name: string; condition: 'new' | 'good' | 'fair' | 'poor' | 'unknown' }[]
): { monthly: number; items: CapExItem[]; notes: string[] } {
  const age = new Date().getFullYear() - yearBuilt
  const notes: string[] = []
  const items: CapExItem[] = []

  // Roof
  const roofLife = age > 30 ? 5 : age > 15 ? 12 : 20
  items.push({ name: 'Roof', replacement_cost: 9000, remaining_life_years: roofLife })

  // HVAC
  const hvacLife = age > 20 ? 5 : 12
  items.push({ name: 'HVAC/Furnace', replacement_cost: 4500, remaining_life_years: hvacLife })
  if (hvacLife <= 5) notes.push('HVAC near end of life — budget for replacement')

  // Water heater
  items.push({ name: 'Water heater', replacement_cost: 1400, remaining_life_years: 8 })

  // Electrical (older homes)
  if (yearBuilt < 1980) {
    items.push({ name: 'Electrical misc', replacement_cost: 4000, remaining_life_years: 15 })
    if (yearBuilt < 1960) notes.push('Pre-1960 electrical — confirm no knob-and-tube')
  }

  // Plumbing
  if (yearBuilt < 1970) {
    items.push({ name: 'Plumbing', replacement_cost: 5000, remaining_life_years: 15 })
    notes.push('Older plumbing — schedule sewer scope')
  }

  // Windows
  items.push({ name: 'Windows (rolling)', replacement_cost: 3600, remaining_life_years: 20 })

  // Structure/misc
  items.push({ name: 'Foundation/exterior misc', replacement_cost: 3000, remaining_life_years: 20 })

  const monthly = Math.round(calcCapExMonthly(items))

  return { monthly, items, notes }
}

// ─── Expense Breakdown ───────────────────────────────────────────────────────

export function buildExpenseBreakdown(inputs: AnalysisInputs): ExpenseBreakdown {
  const loanAmount = calcLoanAmount(
    inputs.purchase_price,
    inputs.down_payment_pct,
    inputs.seller_credits
  )
  const mortgage_pi = calcMonthlyPayment(loanAmount, inputs.interest_rate, inputs.loan_term_years)

  const vacancy = inputs.vacancy_rate ?? 5
  const vacancy_loss = (inputs.monthly_rent * vacancy) / 100

  const effective_income = inputs.monthly_rent - vacancy_loss
  const pm_monthly = effective_income * (inputs.pm_fee_pct / 100)

  // Placement fee annualized over assumed 18-month avg tenancy
  const pm_placement_annualized =
    (inputs.monthly_rent * (inputs.pm_placement_months ?? 1)) / 18

  const total =
    mortgage_pi +
    inputs.property_taxes_annual / 12 +
    inputs.insurance_monthly +
    (inputs.hoa_monthly ?? 0) +
    pm_monthly +
    pm_placement_annualized +
    inputs.capex_monthly +
    inputs.maintenance_monthly +
    (inputs.utilities_monthly ?? 0) +
    (inputs.lawn_monthly ?? 0)

  return {
    mortgage_pi: Math.round(mortgage_pi),
    property_taxes: Math.round(inputs.property_taxes_annual / 12),
    insurance: inputs.insurance_monthly,
    hoa: inputs.hoa_monthly ?? 0,
    pm_monthly: Math.round(pm_monthly),
    pm_placement_annualized: Math.round(pm_placement_annualized),
    vacancy_loss: Math.round(vacancy_loss),
    capex: inputs.capex_monthly,
    maintenance: inputs.maintenance_monthly,
    utilities: inputs.utilities_monthly ?? 0,
    lawn: inputs.lawn_monthly ?? 0,
    total: Math.round(total),
  }
}

// ─── Cash Flow ───────────────────────────────────────────────────────────────

export function calcCashFlow(
  monthlyRent: number,
  vacancyRatePct: number,
  expenses: ExpenseBreakdown
): CashFlowResult {
  const vacancy_adjustment = Math.round(monthlyRent * (vacancyRatePct / 100))
  const effective_gross_income = monthlyRent - vacancy_adjustment
  const monthly_cash_flow = effective_gross_income - expenses.total
  return {
    gross_monthly_rent: monthlyRent,
    vacancy_adjustment,
    effective_gross_income,
    total_expenses: expenses.total,
    monthly_cash_flow: Math.round(monthly_cash_flow),
    annual_cash_flow: Math.round(monthly_cash_flow * 12),
  }
}

// ─── Key Metrics ─────────────────────────────────────────────────────────────

export function calcKeyMetrics(
  inputs: AnalysisInputs,
  cashFlow: CashFlowResult,
  expenses: ExpenseBreakdown
): KeyMetrics {
  const loanAmount = calcLoanAmount(
    inputs.purchase_price,
    inputs.down_payment_pct,
    inputs.seller_credits
  )
  const downPayment = inputs.purchase_price * (inputs.down_payment_pct / 100)
  const total_cash_in = downPayment + (inputs.rehab_cost ?? 0) + inputs.purchase_price * 0.025 // est closing costs

  const noi = (cashFlow.effective_gross_income - (expenses.total - expenses.mortgage_pi)) * 12
  const annual_debt_service = expenses.mortgage_pi * 12

  const dscr = annual_debt_service > 0 ? noi / annual_debt_service : 0
  const coc_return = total_cash_in > 0 ? (cashFlow.annual_cash_flow / total_cash_in) * 100 : 0
  const gross_yield = (cashFlow.gross_monthly_rent * 12 / inputs.purchase_price) * 100
  const grm = cashFlow.gross_monthly_rent > 0
    ? inputs.purchase_price / (cashFlow.gross_monthly_rent * 12)
    : 0
  const break_even_occupancy = cashFlow.gross_monthly_rent > 0
    ? (expenses.total / cashFlow.gross_monthly_rent) * 100
    : 100

  return {
    coc_return: Math.round(coc_return * 10) / 10,
    dscr: Math.round(dscr * 100) / 100,
    noi: Math.round(noi),
    gross_yield: Math.round(gross_yield * 10) / 10,
    grm: Math.round(grm * 10) / 10,
    break_even_occupancy: Math.round(break_even_occupancy * 10) / 10,
    price_per_sqft: inputs.purchase_price / (100), // sqft passed separately
    total_cash_in: Math.round(total_cash_in),
  }
}

// ─── DSCR ────────────────────────────────────────────────────────────────────

export function calcDSCR(noi: number, annualDebtService: number): number {
  if (annualDebtService === 0) return 99  // cash purchase
  return Math.round((noi / annualDebtService) * 100) / 100
}

// ─── 5-Year Wealth Projection ────────────────────────────────────────────────

export function calcWealthProjection(
  inputs: AnalysisInputs,
  cashFlow: CashFlowResult,
  metrics: KeyMetrics,
  appreciationRate: number,
  purchasePrice: number
): WealthProjection[] {
  const loanAmount = calcLoanAmount(
    inputs.purchase_price,
    inputs.down_payment_pct,
    inputs.seller_credits
  )

  const projections: WealthProjection[] = []
  let cumCashFlow = 0

  for (let year = 1; year <= 5; year++) {
    cumCashFlow += cashFlow.annual_cash_flow

    const mortgage_paydown = calcMortgagePaydownOverYears(
      loanAmount,
      inputs.interest_rate,
      inputs.loan_term_years,
      year
    )

    const appreciation =
      purchasePrice * (Math.pow(1 + appreciationRate, year) - 1)

    // Depreciation: building value (80% of purchase) / 27.5 years
    const annual_depreciation = (purchasePrice * 0.8) / 27.5
    // Very rough tax benefit estimate (25% bracket assumed)
    const tax_benefit_estimate = year * annual_depreciation * 0.25 * 0.3 // partial benefit

    const total_return =
      cumCashFlow + mortgage_paydown + appreciation + tax_benefit_estimate

    projections.push({
      year,
      cash_flow_cumulative: Math.round(cumCashFlow),
      mortgage_paydown: Math.round(mortgage_paydown),
      appreciation: Math.round(appreciation),
      tax_benefit_estimate: Math.round(tax_benefit_estimate),
      total_return: Math.round(total_return),
      total_return_on_cash: Math.round((total_return / metrics.total_cash_in) * 1000) / 10,
    })
  }

  return projections
}

export function calcScenarioProjection(
  inputs: AnalysisInputs,
  cashFlow: CashFlowResult,
  metrics: KeyMetrics
): ScenarioProjection {
  return {
    conservative: calcWealthProjection(inputs, cashFlow, metrics, APPRECIATION_RATES.conservative, inputs.purchase_price),
    base: calcWealthProjection(inputs, cashFlow, metrics, APPRECIATION_RATES.base, inputs.purchase_price),
    optimistic: calcWealthProjection(inputs, cashFlow, metrics, APPRECIATION_RATES.optimistic, inputs.purchase_price),
  }
}

// ─── Alternative Comparison ───────────────────────────────────────────────────

export function calcAlternativeComparison(
  totalCashIn: number,
  dealBase5yr: number,
  hysaRate: number = 0.048
): AlternativeComparison {
  const hysa_5yr = Math.round(totalCashIn * (Math.pow(1 + hysaRate, 5) - 1))
  const sp500_5yr = Math.round(totalCashIn * (Math.pow(1 + SP500_AVG_ANNUAL, 5) - 1))

  return {
    hysa_rate: hysaRate * 100,
    hysa_5yr,
    sp500_5yr,
    this_deal_5yr_base: dealBase5yr,
    advantage_over_hysa: dealBase5yr - hysa_5yr,
    advantage_over_sp500: dealBase5yr - sp500_5yr,
  }
}

// ─── Risk / Reward Scoring ────────────────────────────────────────────────────

export function calcRiskScore(
  cmi: ZipCMI,
  metrics: KeyMetrics,
  inputs: AnalysisInputs,
  yearBuilt: number
): RiskScore {
  const age = new Date().getFullYear() - yearBuilt

  // Market risk: invert CMI (lower CMI = higher risk)
  const market_risk = Math.round(5 - (cmi.total_score / 100) * 4)

  // Deal risk: DSCR margin and vacancy sensitivity
  const dscr_margin = metrics.dscr - 1.0
  const deal_risk = dscr_margin > 0.3 ? 1 : dscr_margin > 0.15 ? 2 : dscr_margin > 0 ? 3 : 5

  // Property risk: age + CapEx burden
  const property_risk = age > 80 ? 4 : age > 50 ? 3 : age > 30 ? 2 : 1

  // Execution risk
  const rehab = inputs.rehab_cost ?? 0
  const execution_risk = rehab > 30000 ? 4 : rehab > 10000 ? 2 : 1

  // Liquidity risk — always present in RE
  const liquidity_risk = 2

  const overall = Math.round(
    (market_risk * 1.5 + deal_risk * 2 + property_risk * 1.5 + execution_risk + liquidity_risk) /
    (1.5 + 2 + 1.5 + 1 + 1) * 10
  ) / 10

  return {
    market_risk,
    deal_risk,
    property_risk,
    execution_risk,
    liquidity_risk,
    overall: Math.min(10, Math.max(1, overall)),
  }
}

export function calcRewardScore(
  metrics: KeyMetrics,
  comparison: AlternativeComparison,
  projections: ScenarioProjection
): RewardScore {
  const coc_score = metrics.coc_return > 10 ? 3 : metrics.coc_return > 7 ? 2 : metrics.coc_return > 4 ? 1 : 0
  const advantage_score = comparison.advantage_over_sp500 > 30000 ? 3 : comparison.advantage_over_sp500 > 10000 ? 2 : 1
  const dscr_score = metrics.dscr > 1.3 ? 2 : metrics.dscr > 1.15 ? 1 : 0
  const cash_flow_score = metrics.coc_return > 5 ? 2 : metrics.coc_return > 0 ? 1 : 0

  const raw = coc_score + advantage_score + dscr_score + cash_flow_score
  const overall = Math.min(10, Math.round((raw / 10) * 10))

  return { overall }
}

// ─── Verdict ─────────────────────────────────────────────────────────────────

export function computeVerdict(
  metrics: KeyMetrics,
  riskScore: RiskScore,
  rewardScore: RewardScore,
  cmi: ZipCMI,
  profile: { goal: string; risk_tolerance: string }
): { verdict: Verdict; reason: string } {
  // Hard fails
  if (metrics.dscr < DSCR_HARD_FLOOR) {
    return {
      verdict: 'fail',
      reason: `DSCR of ${metrics.dscr}x is below the minimum 1.0x threshold. The property does not cover its own debt service at this rent and structure.`,
    }
  }

  if (cmi.grade === 'D') {
    return {
      verdict: 'fail',
      reason: `This ZIP scores D on our Cleveland Market Index. We do not recommend investments in D-rated markets.`,
    }
  }

  // Conservative investor with high risk
  if (profile.risk_tolerance === 'conservative' && riskScore.overall > 6) {
    return {
      verdict: 'conditional',
      reason: `This deal carries more risk than your conservative profile suggests. The numbers can work, but the variance is higher than ideal for you. See structuring options below.`,
    }
  }

  // Negative cash flow
  if (metrics.coc_return < 0) {
    return {
      verdict: 'conditional',
      reason: `Cash flow is currently negative. This can still be a wealth-building play if appreciation and equity paydown carry the deal — but you need to be able to fund the gap.`,
    }
  }

  // Strong deal
  if (metrics.coc_return >= 7 && metrics.dscr >= 1.2 && rewardScore.overall >= 6) {
    return {
      verdict: 'recommended',
      reason: `Strong cash-on-cash return, healthy DSCR margin, and compelling 5-year wealth picture. Aligns well with your profile and goals.`,
    }
  }

  // Decent deal
  return {
    verdict: 'conditional',
    reason: `The deal is viable but not exceptional at the current structure. Review the structuring suggestions below — small adjustments can meaningfully improve the outcome.`,
  }
}

// ─── Home Warranty Flag ───────────────────────────────────────────────────────

export function shouldRecommendWarranty(
  capexMonthly: number,
  maintenanceMonthly: number
): { recommended: boolean; monthly_est: number; capex_with_warranty: number } {
  const combined = capexMonthly + maintenanceMonthly
  const recommended = combined > HOME_WARRANTY_THRESHOLD
  const monthly_est = 130 // avg for duplex or SFR + svc call reserve
  const capex_with_warranty = recommended
    ? Math.round(capexMonthly * 0.4 + monthly_est)  // warranty covers ~60% of CapEx items
    : capexMonthly

  return { recommended, monthly_est, capex_with_warranty }
}

// ─── Structuring Engine ───────────────────────────────────────────────────────

export function generateStructuringSuggestions(
  inputs: AnalysisInputs,
  metrics: KeyMetrics,
  targetCoC: number = 7.0,
  targetDSCR: number = 1.2
): StructuringSuggestion[] {
  const suggestions: StructuringSuggestion[] = []

  if (metrics.coc_return >= targetCoC && metrics.dscr >= targetDSCR) {
    return suggestions // already hitting targets
  }

  const loanAmount = calcLoanAmount(inputs.purchase_price, inputs.down_payment_pct, inputs.seller_credits)
  const currentDownPayment = inputs.purchase_price * (inputs.down_payment_pct / 100)

  // Option A: Increase down payment (reduces P&I, improves CoC)
  const higherDown = inputs.down_payment_pct + 5
  const newLoanA = calcLoanAmount(inputs.purchase_price, higherDown, inputs.seller_credits)
  const newPIA = calcMonthlyPayment(newLoanA, inputs.interest_rate, inputs.loan_term_years)
  const savingsA = (calcMonthlyPayment(loanAmount, inputs.interest_rate, inputs.loan_term_years) - newPIA) * 12
  const newCocA = ((metrics.coc_return / 100 * metrics.total_cash_in + savingsA) /
    (metrics.total_cash_in + inputs.purchase_price * 0.05)) * 100

  suggestions.push({
    type: 'increase_down',
    description: `Increase down payment to ${higherDown}% (add $${Math.round(inputs.purchase_price * 0.05).toLocaleString()} more)`,
    new_down_payment: inputs.purchase_price * (higherDown / 100),
    resulting_coc: Math.round(newCocA * 10) / 10,
    resulting_dscr: metrics.dscr + 0.08,
  })

  // Option B: Negotiate lower price
  const lowerPrice = Math.round(inputs.purchase_price * 0.95)
  const priceSavings = (inputs.purchase_price - lowerPrice) * (inputs.down_payment_pct / 100)
  const newCocB = ((metrics.coc_return / 100 * metrics.total_cash_in + priceSavings * 0.07) /
    (metrics.total_cash_in - priceSavings)) * 100

  suggestions.push({
    type: 'lower_price',
    description: `Offer $${lowerPrice.toLocaleString()} (-$${(inputs.purchase_price - lowerPrice).toLocaleString()})`,
    new_offer: lowerPrice,
    resulting_coc: Math.round(newCocB * 10) / 10,
    resulting_dscr: metrics.dscr + 0.05,
  })

  // Option C: Seller credits (reduces cash to close without changing price)
  const credits = Math.round(inputs.purchase_price * 0.03)
  const newCocC = ((metrics.coc_return / 100 * metrics.total_cash_in + credits * 0.07) /
    (metrics.total_cash_in - credits)) * 100

  suggestions.push({
    type: 'seller_credits',
    description: `Request $${credits.toLocaleString()} in seller credits to cover closing costs`,
    new_credits: credits,
    resulting_coc: Math.round(newCocC * 10) / 10,
    resulting_dscr: metrics.dscr + 0.03,
  })

  return suggestions
}

// ─── Full Analysis Runner ────────────────────────────────────────────────────

export function runFullAnalysis(
  inputs: AnalysisInputs,
  cmi: ZipCMI,
  profile: { goal: string; risk_tolerance: string },
  yearBuilt: number,
  hysaRate: number = 0.048,
  sqft: number = 1000
): Omit<AnalysisOutput, 'ai_assessment' | 'created_at'> {
  // Build expenses
  const expenses = buildExpenseBreakdown(inputs)

  // Cash flow — market rent
  const vacancyRate = inputs.vacancy_rate ?? cmi.avg_vacancy ?? 5
  const cashFlow = calcCashFlow(inputs.monthly_rent, vacancyRate, expenses)

  // Key metrics
  const metrics = calcKeyMetrics(inputs, cashFlow, expenses)
  metrics.price_per_sqft = Math.round(inputs.purchase_price / sqft)

  // Section 8 scenario
  let section8CashFlow: CashFlowResult | undefined
  let section8Metrics: KeyMetrics | undefined
  if (inputs.section8_rent && inputs.section8_rent > inputs.monthly_rent) {
    const s8Expenses = buildExpenseBreakdown({
      ...inputs,
      monthly_rent: inputs.section8_rent,
      vacancy_rate: 0.5, // near-zero vacancy on Section 8
    })
    section8CashFlow = calcCashFlow(inputs.section8_rent, 0.5, s8Expenses)
    section8Metrics = calcKeyMetrics({ ...inputs, monthly_rent: inputs.section8_rent }, section8CashFlow, s8Expenses)
    section8Metrics.price_per_sqft = metrics.price_per_sqft
  }

  // Projections
  const projections = calcScenarioProjection(inputs, cashFlow, metrics)
  const dealBase5yr = projections.base[4].total_return

  // Alternative comparison
  const comparison = calcAlternativeComparison(metrics.total_cash_in, dealBase5yr, hysaRate)

  // Risk / reward
  const risk = calcRiskScore(cmi, metrics, inputs, yearBuilt)
  const reward = calcRewardScore(metrics, comparison, projections)
  const risk_reward_ratio = Math.round((reward.overall / Math.max(risk.overall, 1)) * 100) / 100

  // Verdict
  const { verdict, reason } = computeVerdict(metrics, risk, reward, cmi, profile)

  // Home warranty
  const warranty = shouldRecommendWarranty(inputs.capex_monthly, inputs.maintenance_monthly)

  // Structuring suggestions (only if not already hitting targets)
  const targetCoC = profile.goal === 'cashflow' ? 8 : 6
  const structuring_suggestions = generateStructuringSuggestions(inputs, metrics, targetCoC)

  // Next steps (generic — enhanced by AI)
  const next_steps: NextStep[] = [
    {
      order: 1,
      title: 'Connect with your network agent',
      detail: 'Verify comparable rents and confirm ARV if rehab involved.',
      owner: 'agent',
      urgency: 'immediate',
    },
    {
      order: 2,
      title: 'Get a rate quote from your lender',
      detail: `Current rate assumption: ${inputs.interest_rate}%. A 0.25% drop changes CoC by ~0.4%.`,
      owner: 'lender',
      urgency: 'this_week',
    },
    {
      order: 3,
      title: 'Order inspection + sewer scope',
      detail: 'Cleveland older housing stock — sewer scope is non-negotiable.',
      owner: 'inspector',
      urgency: 'this_week',
    },
    {
      order: 4,
      title: 'Confirm PM rent projection',
      detail: 'The rent number drives everything. Get it in writing.',
      owner: 'pm',
      urgency: 'this_week',
    },
  ]

  return {
    cmi,
    risk,
    reward,
    risk_reward_ratio,
    verdict,
    verdict_reason: reason,
    expenses,
    cash_flow: cashFlow,
    metrics,
    section8_cash_flow: section8CashFlow,
    section8_metrics: section8Metrics,
    projections,
    comparison,
    home_warranty_recommended: warranty.recommended,
    home_warranty_monthly_est: warranty.monthly_est,
    capex_with_warranty: warranty.capex_with_warranty,
    structuring_suggestions,
    next_steps,
  }
}
