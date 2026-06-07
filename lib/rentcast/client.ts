/**
 * RentCast API Client
 * Docs: https://developers.rentcast.io/
 */

import type { RentCastProperty, RentCastRentEstimate, RentCastMarketData } from '@/types'

const BASE_URL = 'https://api.rentcast.io/v1'

function headers() {
  return {
    'X-Api-Key': process.env.RENTCAST_API_KEY!,
    'Content-Type': 'application/json',
  }
}

async function fetchRC<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { headers: headers() })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`RentCast ${res.status}: ${text}`)
  }
  return res.json()
}

export async function getPropertyByAddress(address: string): Promise<RentCastProperty | null> {
  try {
    const data = await fetchRC<RentCastProperty[]>(`/properties?address=${encodeURIComponent(address)}&limit=1`)
    return Array.isArray(data) ? data[0] ?? null : null
  } catch (e) {
    console.error('RentCast property error:', e)
    return null
  }
}

export async function getRentEstimate(address: string, bedrooms?: number, bathrooms?: number): Promise<RentCastRentEstimate | null> {
  try {
    const params = new URLSearchParams({ address })
    if (bedrooms) params.set('bedrooms', bedrooms.toString())
    if (bathrooms) params.set('bathrooms', bathrooms.toString())
    return await fetchRC<RentCastRentEstimate>(`/avm/rent/long-term?${params}`)
  } catch (e) {
    console.error('RentCast rent estimate error:', e)
    return null
  }
}

export async function getMarketStats(zipCode: string, propertyType: string = 'Single Family'): Promise<RentCastMarketData | null> {
  try {
    const params = new URLSearchParams({ zipCode, propertyType, dataType: 'Rental' })
    return await fetchRC<RentCastMarketData>(`/markets?${params}`)
  } catch (e) {
    console.error('RentCast market stats error:', e)
    return null
  }
}

/**
 * NEW: Get active sale listing for a specific address.
 * Returns the current list price and listing details.
 */
export async function getActiveSaleListing(address: string): Promise<{
  list_price: number | null
  days_on_market: number | null
  listing_status: string | null
  listing_date: string | null
} | null> {
  try {
    const params = new URLSearchParams({
      address,
      status: 'Active',
      limit: '1',
    })
    const data = await fetchRC<any[]>(`/listings/sale?${params}`)
    
    if (!Array.isArray(data) || data.length === 0) {
      // Try inactive too — property might be under contract
      const paramsInactive = new URLSearchParams({
        address,
        status: 'Inactive',
        limit: '1',
      })
      const inactive = await fetchRC<any[]>(`/listings/sale?${paramsInactive}`)
      if (!Array.isArray(inactive) || inactive.length === 0) return null
      
      const l = inactive[0]
      return {
        list_price: l.price || l.listPrice || null,
        days_on_market: l.daysOnMarket || null,
        listing_status: l.status || 'Inactive',
        listing_date: l.listedDate || l.listingDate || null,
      }
    }

    const listing = data[0]
    return {
      list_price: listing.price || listing.listPrice || null,
      days_on_market: listing.daysOnMarket || null,
      listing_status: listing.status || 'Active',
      listing_date: listing.listedDate || listing.listingDate || null,
    }
  } catch (e) {
    console.error('RentCast sale listing error:', e)
    return null
  }
}

export async function autoPopulateFromAddress(address: string): Promise<{
  property: RentCastProperty | null
  rent_estimate: number | null
  rent_range: { low: number; high: number } | null
  market_vacancy: number | null
  sale_listing: Awaited<ReturnType<typeof getActiveSaleListing>>
  source_labels: Record<string, 'rentcast' | 'assumed'>
}> {
  const [property, rentEst, saleListing] = await Promise.all([
    getPropertyByAddress(address),
    getRentEstimate(address),
    getActiveSaleListing(address),
  ])

  let market_vacancy: number | null = null
  if (property?.zipCode) {
    const market = await getMarketStats(property.zipCode)
    market_vacancy = market?.vacancyRate ?? null
  }

  const source_labels: Record<string, 'rentcast' | 'assumed'> = {}
  if (property) {
    source_labels.year_built = 'rentcast'
    source_labels.sqft = 'rentcast'
    source_labels.bedrooms = 'rentcast'
    source_labels.bathrooms = 'rentcast'
    source_labels.property_type = 'rentcast'
  }
  if (rentEst) source_labels.monthly_rent = 'rentcast'
  if (market_vacancy !== null) source_labels.vacancy_rate = 'rentcast'
  if (saleListing?.list_price) source_labels.purchase_price = 'rentcast'

  return {
    property,
    rent_estimate: rentEst?.rent ?? null,
    rent_range: rentEst ? { low: rentEst.rentRangeLow, high: rentEst.rentRangeHigh } : null,
    market_vacancy,
    sale_listing: saleListing,
    source_labels,
  }
}
