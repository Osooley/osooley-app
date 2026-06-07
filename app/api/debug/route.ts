/**
 * POST /api/debug
 * Development tool — shows raw RentCast response for any address.
 * Remove or protect this before going public.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const RENTCAST_BASE = 'https://api.rentcast.io/v1'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { address } = await req.json()

  const results: any = {}

  // Test 1: Property lookup
  try {
    const encoded = encodeURIComponent(address)
    const res = await fetch(`${RENTCAST_BASE}/properties?address=${encoded}&limit=1`, {
      headers: { 'X-Api-Key': process.env.RENTCAST_API_KEY! }
    })
    const data = await res.json()
    results.property = { status: res.status, data }
  } catch (e: any) {
    results.property = { error: e.message }
  }

  // Test 2: Rent estimate
  try {
    const encoded = encodeURIComponent(address)
    const res = await fetch(`${RENTCAST_BASE}/avm/rent/long-term?address=${encoded}`, {
      headers: { 'X-Api-Key': process.env.RENTCAST_API_KEY! }
    })
    const data = await res.json()
    results.rent_estimate = { status: res.status, data }
  } catch (e: any) {
    results.rent_estimate = { error: e.message }
  }

  // Test 3: Extract ZIP from address
  const allMatches = address.match(/\b\d{5}\b/g)
  const zip = allMatches ? allMatches[allMatches.length - 1] : null
  results.extracted_zip = zip

  // Test 4: Market stats for ZIP
  if (zip) {
    try {
      const res = await fetch(`${RENTCAST_BASE}/markets?zipCode=${zip}&propertyType=Single+Family&dataType=Rental`, {
        headers: { 'X-Api-Key': process.env.RENTCAST_API_KEY! }
      })
      const data = await res.json()
      results.market_stats = { status: res.status, data }
    } catch (e: any) {
      results.market_stats = { error: e.message }
    }
  }

  return NextResponse.json(results, {
    headers: { 'Content-Type': 'application/json' }
  })
}
