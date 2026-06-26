/**
 * POST /api/save-deal
 *
 * Persists an analyzed deal as a property the user owns, so it shows up on
 * their dashboard and in the Portfolio tracker. Creates three rows:
 *   1. properties      — the user-owned property
 *   2. analyses        — the analysis result, linked to the new property
 *   3. deal_tracker    — an "exploring" tracker with a starter checklist
 *
 * Body: { address, zip, year_built, sqft, inputs, result }
 * Returns: { ok: true, property_id } | { error }
 *
 * No schema changes required — the tables and their RLS insert policies
 * (with check auth.uid() = user_id) already support this.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Generic starter checklist for a freshly-saved deal in the "exploring" stage.
const STARTER_TASKS = [
  { id: 't1', task: 'Review the analysis and confirm your assumptions', owner: 'investor', completed: false, blocking: false },
  { id: 't2', task: 'Verify the rent estimate with a local PM or agent', owner: 'agent', completed: false, blocking: true },
  { id: 't3', task: 'Confirm property taxes and get an insurance quote', owner: 'investor', completed: false, blocking: false },
  { id: 't4', task: 'Schedule a walkthrough or inspection', owner: 'inspector', completed: false, blocking: false },
  { id: 't5', task: 'Decide on an offer price and financing', owner: 'investor', completed: false, blocking: false },
]

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { address, zip, year_built, sqft, inputs = {}, result = {} } = body

    if (!result || !result.metrics) {
      return NextResponse.json({ error: 'Nothing to save — run an analysis first.' }, { status: 400 })
    }

    // properties.zip is a FK to zip_cmi — route uncovered ZIPs to zip_freeform
    // so the insert never fails on an out-of-network ZIP.
    let zipCols: { zip?: string; zip_freeform?: string } = {}
    if (zip) {
      const { data: known } = await supabase.from('zip_cmi').select('zip').eq('zip', zip).maybeSingle()
      zipCols = known ? { zip } : { zip_freeform: zip }
    }

    // 1. Property (owned by the user → appears under "Properties you brought in")
    const { data: prop, error: propErr } = await supabase
      .from('properties')
      .insert({
        user_id: user.id,
        address: address || 'Saved property',
        ...zipCols,
        city: 'Cleveland',
        state: 'OH',
        property_type: 'sfr',
        sqft: sqft || null,
        year_built: year_built || null,
        units: 1,
        list_price: inputs.purchase_price || null,
        offer_price: inputs.purchase_price || null,
        source: 'self',
        network_verified: false,
        status: 'exploring',
        notes: result.verdict_reason || null,
      })
      .select('id')
      .single()

    if (propErr || !prop) {
      console.error('save-deal: property insert failed', propErr)
      return NextResponse.json({ error: 'Could not save property.' }, { status: 500 })
    }

    // 2. Analysis linked to the new property
    const { error: analysisErr } = await supabase.from('analyses').insert({
      property_id: prop.id,
      user_id: user.id,
      purchase_price: inputs.purchase_price ?? null,
      down_payment_pct: inputs.down_payment_pct ?? null,
      interest_rate: inputs.interest_rate ?? null,
      loan_term_years: inputs.loan_term_years ?? 30,
      seller_credits: inputs.seller_credits ?? 0,
      monthly_rent: inputs.monthly_rent ?? null,
      section8_rent: inputs.section8_rent ?? null,
      property_taxes_annual: inputs.property_taxes_annual ?? null,
      insurance_monthly: inputs.insurance_monthly ?? null,
      pm_fee_pct: inputs.pm_fee_pct ?? null,
      vacancy_rate: inputs.vacancy_rate ?? null,
      capex_monthly: inputs.capex_monthly ?? null,
      maintenance_monthly: inputs.maintenance_monthly ?? null,
      rehab_cost: inputs.rehab_cost ?? 0,
      monthly_cash_flow: result.cash_flow?.monthly_cash_flow ?? null,
      annual_cash_flow: result.cash_flow?.annual_cash_flow ?? null,
      coc_return: result.metrics?.coc_return ?? null,
      dscr: result.metrics?.dscr ?? null,
      noi: result.metrics?.noi ?? null,
      proj_conservative_5yr: result.projections?.conservative?.[4]?.total_return ?? null,
      proj_base_5yr: result.projections?.base?.[4]?.total_return ?? null,
      proj_optimistic_5yr: result.projections?.optimistic?.[4]?.total_return ?? null,
      hysa_rate: result.comparison?.hysa_rate ?? null,
      hysa_5yr: result.comparison?.hysa_5yr ?? null,
      sp500_5yr: result.comparison?.sp500_5yr ?? null,
      risk_score: result.risk?.overall ?? null,
      reward_score: result.reward?.overall ?? null,
      cmi_total_score: result.cmi?.total_score ?? null,
      verdict: result.verdict ?? null,
      verdict_reason: result.verdict_reason ?? null,
      home_warranty_recommended: result.home_warranty_recommended ?? false,
      ai_assessment: result.ai_assessment ?? null,
      structuring_suggestions: result.structuring_suggestions ?? null,
      next_steps: result.next_steps ?? null,
      expense_breakdown: result.expenses ?? null,
      projections: result.projections ?? null,
    })
    if (analysisErr) console.error('save-deal: analysis insert failed', analysisErr)

    // 3. Tracker so it shows on the Portfolio page
    const { error: trackerErr } = await supabase.from('deal_tracker').insert({
      property_id: prop.id,
      user_id: user.id,
      stage: 'exploring',
      tasks: STARTER_TASKS,
    })
    if (trackerErr) console.error('save-deal: tracker insert failed', trackerErr)

    return NextResponse.json({ ok: true, property_id: prop.id })
  } catch (e: any) {
    console.error('save-deal error:', e)
    return NextResponse.json({ error: e?.message || 'Could not save deal.' }, { status: 500 })
  }
}
