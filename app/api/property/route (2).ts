/**
 * POST /api/property
 * Auto-populate property fields from address using RentCast.
 * Falls back to market-level estimates when property-specific data is unavailable.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { autoPopulateFromAddress, getMarketStats } from '@/lib/rentcast/client'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { address } = await req.json()
    if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 })

    // Extract ZIP from address string as fallback
    const zipMatch = address.match(/\b\d{5}\b/)
    const zipFromAddress = zipMatch ? zipMatch[0] : null

    const data = await autoPopulateFromAddress(address)

    const zip = data.property?.zipCode || zipFromAddress || ''

    // Get market stats for ZIP-level fallbacks
    let marketStats = null
    if (zip) {
      marketStats = await getMarketStats(zip, 'Single Family')
    }

    // Build source labels
    const sourceLabels: Record<string, string> = {}

    // Property-level data (high confidence)
    if (data.property?.yearBuilt) sourceLabels.year_built = 'rentcast'
    if (data.property?.squareFootage) sourceLabels.sqft = 'rentcast'
    if (data.property?.bedrooms) sourceLabels.bedrooms = 'rentcast'
    if (data.property?.bathrooms) sourceLabels.bathrooms = 'rentcast'
    if (data.property?.zipCode) sourceLabels.zip = 'rentcast'
    if (data.property?.taxAssessment?.value) sourceLabels.property_taxes_annual = 'rentcast'

    // Rent (property AVM or market average)
    if (data.rent_estimate) {
      sourceLabels.monthly_rent = 'rentcast'
    } else if (marketStats?.averageRent) {
      sourceLabels.monthly_rent = 'assumed'
    }

    // Vacancy
    if (data.market_vacancy) {
      sourceLabels.vacancy_rate = 'rentcast'
    } else {
      sourceLabels.vacancy_rate = 'assumed'
    }

    // Build prefill — use property AVM first, fall back to market data
    const monthlyRent = data.rent_estimate
      ? Math.round(data.rent_estimate)
      : marketStats?.averageRent
      ? Math.round(marketStats.averageRent)
      : null

    // Tax estimate: use RentCast assessment or estimate from last sale price
    const lastSalePrice = data.property?.lastSalePrice
    const taxAssessmentValue = data.property?.taxAssessment?.value
    let propertyTaxesAnnual = null
    if (taxAssessmentValue) {
      propertyTaxesAnnual = Math.round(taxAssessmentValue * 0.018) // Cuyahoga effective rate ~1.8%
    } else if (lastSalePrice) {
      propertyTaxesAnnual = Math.round(lastSalePrice * 0.018)
      sourceLabels.property_taxes_annual = 'assumed'
    }

    // Last sale price as purchase price hint
    if (lastSalePrice) sourceLabels.purchase_price_hint = 'rentcast'

    const prefill = {
      year_built: data.property?.yearBuilt || null,
      sqft: data.property?.squareFootage || null,
      bedrooms: data.property?.bedrooms || null,
      bathrooms: data.property?.bathrooms || null,
      property_type: mapPropertyType(data.property?.propertyType),
      zip: zip || null,
      city: data.property?.city || null,
      property_taxes_annual: propertyTaxesAnnual,
      monthly_rent: monthlyRent,
      rent_range_low: data.rent_range?.low || null,
      rent_range_high: data.rent_range?.high || null,
      vacancy_rate: data.market_vacancy
        ? Math.round(data.market_vacancy * 10) / 10
        : 5, // default 5% if no market data
      last_sale_price: lastSalePrice || null,
      last_sale_date: data.property?.lastSaleDate || null,
      source_labels: sourceLabels,
      // Confidence metadata
      fields_auto_filled: Object.keys(sourceLabels).filter(k => sourceLabels[k] === 'rentcast').length,
      total_key_fields: 8,
    }

    return NextResponse.json({ prefill, raw: { property: data.property, rent_estimate: data.rent_estimate } })
  } catch (error) {
    console.error('Property lookup error:', error)
    return NextResponse.json({ error: 'Property lookup failed', detail: String(error) }, { status: 500 })
  }
}

function mapPropertyType(rcType?: string): string {
  if (!rcType) return 'sfr'
  const t = rcType.toLowerCase()
  if (t.includes('single')) return 'sfr'
  if (t.includes('duplex')) return 'duplex'
  if (t.includes('triplex')) return 'triplex'
  if (t.includes('condo')) return 'condo'
  if (t.includes('townhouse') || t.includes('town')) return 'townhouse'
  return 'sfr'
}
