export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { autoPopulateFromAddress, getMarketStats } from '@/lib/rentcast/client'

const CLEVELAND_DEFAULTS = { vacancy_rate: 5.5, insurance_monthly: 80, capex_monthly: 150 }

function extractZip(address: string): string | null {
  const allMatches = address.match(/\b\d{5}\b/g)
  if (!allMatches || allMatches.length === 0) return null
  const zip = allMatches[allMatches.length - 1]
  const num = parseInt(zip)
  if (num < 10000 || num > 99999) return null
  return zip
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { address } = await req.json()
    if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 })

    const zipFromAddress = extractZip(address)

    let rentcastData: any = null
    try {
      rentcastData = await autoPopulateFromAddress(address)
    } catch (e) {
      console.log('RentCast lookup failed:', e)
    }

    const zip = rentcastData?.property?.zipCode || zipFromAddress || ''
    const propertyType = rentcastData?.property?.propertyType || ''
    const isMultiFamily = ['duplex','multi','triplex','fourplex'].some(t => propertyType.toLowerCase().includes(t))

    let marketStats: any = null
    if (zip) {
      try { marketStats = await getMarketStats(zip, isMultiFamily ? 'Multi Family' : 'Single Family') } catch {}
    }

    const { data: cmiData } = await supabase
      .from('zip_cmi')
      .select('avg_vacancy, avg_yield_low, avg_yield_high, median_entry_price')
      .eq('zip', zip)
      .single()

    const sourceLabels: Record<string, string> = {}

    // ── LIST PRICE (from active sale listing) ──────────────────────────
    const saleListing = rentcastData?.sale_listing
    let listPrice: number | null = saleListing?.list_price || null
    let daysOnMarket: number | null = saleListing?.days_on_market || null
    let listingStatus: string | null = saleListing?.listing_status || null

    if (listPrice) {
      sourceLabels.purchase_price = 'rentcast'
    }

    // Fallback: use last sale price as a hint if no active listing
    const lastSalePrice = rentcastData?.property?.lastSalePrice || null
    const lastSaleDate = rentcastData?.property?.lastSaleDate || null

    // ── RENT ───────────────────────────────────────────────────────────
    let monthlyRent: number | null = null
    if (rentcastData?.rent_estimate) {
      monthlyRent = Math.round(rentcastData.rent_estimate)
      sourceLabels.monthly_rent = 'rentcast'
    } else if (marketStats?.averageRent) {
      monthlyRent = Math.round(marketStats.averageRent)
      sourceLabels.monthly_rent = 'assumed'
    } else if (cmiData && listPrice) {
      const midYield = ((cmiData.avg_yield_low + (cmiData.avg_yield_high || cmiData.avg_yield_low + 1)) / 2) / 100
      monthlyRent = Math.round((listPrice * midYield) / 12)
      sourceLabels.monthly_rent = 'assumed'
    } else {
      const zipNum = parseInt(zip)
      monthlyRent = (zipNum >= 44100 && zipNum <= 44199) ? 1250 : 1150
      sourceLabels.monthly_rent = 'assumed'
    }

    // ── VACANCY ────────────────────────────────────────────────────────
    let vacancyRate: number
    if (rentcastData?.market_vacancy) {
      vacancyRate = Math.round(rentcastData.market_vacancy * 10) / 10
      sourceLabels.vacancy_rate = 'rentcast'
    } else if (cmiData?.avg_vacancy) {
      vacancyRate = cmiData.avg_vacancy
      sourceLabels.vacancy_rate = 'assumed'
    } else {
      vacancyRate = CLEVELAND_DEFAULTS.vacancy_rate
      sourceLabels.vacancy_rate = 'assumed'
    }

    // ── TAXES ──────────────────────────────────────────────────────────
    let propertyTaxesAnnual: number | null = null
    const taxAssessment = rentcastData?.property?.taxAssessment?.value
    if (taxAssessment) {
      propertyTaxesAnnual = Math.round(taxAssessment * 0.018)
      sourceLabels.property_taxes_annual = 'rentcast'
    } else if (listPrice || lastSalePrice) {
      propertyTaxesAnnual = Math.round((listPrice || lastSalePrice) * 0.018)
      sourceLabels.property_taxes_annual = 'assumed'
    }

    // ── PROPERTY DETAILS ───────────────────────────────────────────────
    if (rentcastData?.property?.yearBuilt) sourceLabels.year_built = 'rentcast'
    if (rentcastData?.property?.squareFootage) sourceLabels.sqft = 'rentcast'
    sourceLabels.zip = 'rentcast'

    const prefill = {
      year_built: rentcastData?.property?.yearBuilt || null,
      sqft: rentcastData?.property?.squareFootage || null,
      bedrooms: rentcastData?.property?.bedrooms || null,
      bathrooms: rentcastData?.property?.bathrooms || null,
      property_type: mapPropertyType(propertyType),
      zip: zip || null,
      city: rentcastData?.property?.city || null,
      is_multi_family: isMultiFamily,
      occupancy_status: 'unknown',

      // ── KEY DATA ──────────────────────────────────────────────────────
      purchase_price: listPrice || null,          // current list price if active
      monthly_rent: monthlyRent,
      vacancy_rate: vacancyRate,
      property_taxes_annual: propertyTaxesAnnual,

      // Hints for UI
      rent_range_low: rentcastData?.rent_range?.low || null,
      rent_range_high: rentcastData?.rent_range?.high || null,
      last_sale_price: lastSalePrice,
      last_sale_date: lastSaleDate,
      list_price: listPrice,
      days_on_market: daysOnMarket,
      listing_status: listingStatus,

      source_labels: sourceLabels,
      fields_auto_filled: Object.values(sourceLabels).filter(v => v === 'rentcast').length,
      total_key_fields: Object.keys(sourceLabels).length,
    }

    return NextResponse.json({ prefill, raw: { property: rentcastData?.property || null, sale_listing: saleListing } })

  } catch (error: any) {
    console.error('Property lookup error:', error)
    return NextResponse.json({
      prefill: {
        monthly_rent: 1200, vacancy_rate: 5.5,
        source_labels: { monthly_rent: 'assumed', vacancy_rate: 'assumed' },
        fields_auto_filled: 0, total_key_fields: 2,
      },
      raw: null,
    })
  }
}

function mapPropertyType(rcType?: string): string {
  if (!rcType) return 'sfr'
  const t = rcType.toLowerCase()
  if (t.includes('single')) return 'sfr'
  if (t.includes('duplex')) return 'duplex'
  if (t.includes('triplex')) return 'triplex'
  if (t.includes('fourplex') || t.includes('four')) return 'fourplex'
  if (t.includes('multi')) return 'duplex'
  if (t.includes('condo')) return 'condo'
  if (t.includes('townhouse') || t.includes('town')) return 'townhouse'
  return 'sfr'
}
