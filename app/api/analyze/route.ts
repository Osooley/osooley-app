/**
 * POST /api/analyze
 *
 * Runs the full 3-layer deal analysis:
 *   1. Financial calculation engine
 *   2. CMI lookup from Supabase
 *   3. Claude AI narrative generation
 *
 * Body: { inputs: AnalysisInputs, property_id: string, zip: string, year_built: number, sqft: number }
 * Returns: AnalysisOutput
 */

export const maxDuration = 30 // seconds — prevents Vercel free tier 10s timeout

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { runFullAnalysis } from '@/lib/calculations/engine'
import type { AnalysisInputs, ZipCMI } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile for goal-aware scoring
    const { data: profile } = await supabase
      .from('profiles')
      .select('goal, risk_tolerance, investment_tier')
      .eq('id', user.id)
      .single()

    const body = await req.json()
    const {
      inputs,
      property_id,
      zip,
      year_built = 1970,
      sqft = 1000,
      address,
    }: {
      inputs: AnalysisInputs
      property_id: string
      zip: string
      year_built?: number
      sqft?: number
      address?: string
    } = body

    // Fetch CMI for this ZIP
    let cmi: ZipCMI | null = null
    if (zip) {
      const { data } = await supabase
        .from('zip_cmi')
        .select('*')
        .eq('zip', zip)
        .single()
      cmi = data
    }

    // If ZIP is not in our network, build a minimal CMI with flags
    if (!cmi) {
      cmi = {
        zip: zip || 'unknown',
        neighborhood: 'Out-of-network ZIP',
        rental_demand_score: 12,
        appreciation_score: 12,
        risk_env_score: 12,
        deal_quality_score: 12,
        total_score: 48,
        grade: 'C',
        entry_opportunity_score: 60,
        avg_yield_low: 0,
        avg_yield_high: 0,
        appreciation_3yr: 0,
        avg_vacancy: 5,
        median_entry_price: 0,
        recommended_tiers: [],
        network_notes: 'This ZIP is outside our core Cleveland network. Financial analysis runs normally but CMI score is limited — we don\'t yet have ground-level vacancy data, block-level insights, or a vetted PM for this area.',
        financing_notes: 'Verify financing options with a local lender.',
        updated_at: new Date().toISOString(),
        avg_yield_range: '—',
        risk_score: 12,
      } as unknown as ZipCMI
    }

    const investorProfile = {
      goal: profile?.goal ?? 'hybrid',
      risk_tolerance: profile?.risk_tolerance ?? 'moderate',
    }

    // Run financial engine
    const hysaRate = await getCurrentHYSARate()
    const analysisResult = runFullAnalysis(inputs, cmi, investorProfile, year_built, hysaRate, sqft)

    // Generate AI assessment via Claude
    const aiAssessment = await generateAIAssessment(
      analysisResult,
      inputs,
      cmi,
      investorProfile,
      address,
      year_built
    )

    const fullResult = {
      ...analysisResult,
      ai_assessment: aiAssessment,
      created_at: new Date().toISOString(),
    }

    // Save to Supabase
    if (property_id) {
      await supabase.from('analyses').insert({
        property_id,
        user_id: user.id,
        // Inputs
        purchase_price: inputs.purchase_price,
        down_payment_pct: inputs.down_payment_pct,
        interest_rate: inputs.interest_rate,
        loan_term_years: inputs.loan_term_years,
        seller_credits: inputs.seller_credits,
        monthly_rent: inputs.monthly_rent,
        section8_rent: inputs.section8_rent,
        property_taxes_annual: inputs.property_taxes_annual,
        insurance_monthly: inputs.insurance_monthly,
        pm_fee_pct: inputs.pm_fee_pct,
        vacancy_rate: inputs.vacancy_rate,
        capex_monthly: inputs.capex_monthly,
        maintenance_monthly: inputs.maintenance_monthly,
        rehab_cost: inputs.rehab_cost,
        arv: inputs.arv,
        // Outputs
        monthly_cash_flow: fullResult.cash_flow.monthly_cash_flow,
        annual_cash_flow: fullResult.cash_flow.annual_cash_flow,
        coc_return: fullResult.metrics.coc_return,
        dscr: fullResult.metrics.dscr,
        noi: fullResult.metrics.noi,
        proj_conservative_5yr: fullResult.projections.conservative[4]?.total_return,
        proj_base_5yr: fullResult.projections.base[4]?.total_return,
        proj_optimistic_5yr: fullResult.projections.optimistic[4]?.total_return,
        hysa_rate: fullResult.comparison.hysa_rate,
        hysa_5yr: fullResult.comparison.hysa_5yr,
        sp500_5yr: fullResult.comparison.sp500_5yr,
        risk_score: fullResult.risk.overall,
        reward_score: fullResult.reward.overall,
        cmi_total_score: cmi.total_score,
        verdict: fullResult.verdict,
        verdict_reason: fullResult.verdict_reason,
        home_warranty_recommended: fullResult.home_warranty_recommended,
        ai_assessment: aiAssessment,
        structuring_suggestions: fullResult.structuring_suggestions,
        next_steps: fullResult.next_steps,
        expense_breakdown: fullResult.expenses,
        projections: fullResult.projections,
      })
    }

    return NextResponse.json(fullResult)
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: 'Analysis failed', detail: String(error) },
      { status: 500 }
    )
  }
}

// ─── Claude AI Assessment ─────────────────────────────────────────────────────

async function generateAIAssessment(
  result: Awaited<ReturnType<typeof runFullAnalysis>>,
  inputs: AnalysisInputs,
  cmi: ZipCMI,
  profile: { goal: string; risk_tolerance: string },
  address?: string,
  yearBuilt?: number
): Promise<string> {
  const prompt = `You are a friendly, expert real estate investment advisor helping beginners invest in Cleveland, OH. 
Be honest, practical, and encouraging. Use plain English — explain any metrics you mention.
Never give legal or tax advice, but point people toward professionals when relevant.
Keep your response under 250 words. Use short paragraphs.

PROPERTY: ${address ?? 'Address not provided'} (ZIP ${cmi.zip} — ${cmi.neighborhood})
YEAR BUILT: ${yearBuilt ?? 'unknown'}

INVESTOR PROFILE:
- Goal: ${profile.goal}
- Risk tolerance: ${profile.risk_tolerance}

KEY NUMBERS:
- Purchase price: $${inputs.purchase_price.toLocaleString()}
- Monthly rent (market): $${inputs.monthly_rent.toLocaleString()}
${inputs.section8_rent ? `- Section 8 rent: $${inputs.section8_rent.toLocaleString()}` : ''}
- Monthly cash flow: $${result.cash_flow.monthly_cash_flow.toLocaleString()}
- Cash-on-cash return: ${result.metrics.coc_return}%
- DSCR: ${result.metrics.dscr}x
- 5-year total return (base): $${result.projections.base[4]?.total_return.toLocaleString()}
- vs. HYSA: $${result.comparison.advantage_over_hysa.toLocaleString()} advantage
- Risk score: ${result.risk.overall}/10
- Reward score: ${result.reward.overall}/10
- Verdict: ${result.verdict}
- CMI grade: ${cmi.grade}

Write a concise, honest advisor assessment covering:
1. Whether this deal makes sense for this investor's profile
2. The 1-2 things that make this deal attractive (if any)
3. The 1-2 honest risks to watch
4. One specific action to take this week

Do not repeat all the numbers — the user can see them. Focus on interpretation and judgment.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      thinking: { type: 'disabled' },
      output_config: { effort: 'low' },
      messages: [{ role: 'user', content: prompt }],
    })
    return response.content[0].type === 'text' ? response.content[0].text : ''
  } catch (e) {
    console.error('Claude API error:', e)
    return ''
  }
}

// ─── Dynamic HYSA Rate ────────────────────────────────────────────────────────

/**
 * In production: fetch from a financial data API or cache weekly.
 * For beta: use a hardcoded current rate, updated manually.
 */
async function getCurrentHYSARate(): Promise<number> {
  // TODO: Replace with dynamic fetch from a rate API
  // Current best HYSA rates as of April 2026: ~4.5-5.0%
  return 0.048
}
