/**
 * GET /api/rentcast?zip=44111&type=Single+Family
 *
 * Returns market stats for a ZIP code from RentCast.
 * Used by the markets page and CMI data refresh.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMarketStats } from '@/lib/rentcast/client'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const zip = req.nextUrl.searchParams.get('zip')
  const type = req.nextUrl.searchParams.get('type') ?? 'Single Family'

  if (!zip) return NextResponse.json({ error: 'zip required' }, { status: 400 })

  const data = await getMarketStats(zip, type)

  if (!data) {
    // Return CMI data from Supabase as fallback
    const { data: cmi } = await supabase
      .from('zip_cmi')
      .select('avg_yield_low, avg_yield_high, avg_vacancy, appreciation_3yr')
      .eq('zip', zip)
      .single()

    return NextResponse.json({
      source: 'cmi_fallback',
      averageRent: null,
      vacancyRate: cmi?.avg_vacancy ?? null,
      note: 'RentCast data unavailable for this ZIP — using CMI network data',
    })
  }

  return NextResponse.json({ source: 'rentcast', ...data })
}
