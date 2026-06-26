/**
 * POST /api/delete-deal
 *
 * Removes a saved deal the user owns. Deleting the property cascades to its
 * deal_tracker and analyses rows (ON DELETE CASCADE).
 *
 * Body: { property_id }
 * Returns: { ok: true } | { error }
 *
 * Why service role: properties has no DELETE RLS policy, so a user's
 * RLS-scoped client cannot delete its own rows. We use the service-role
 * client here but enforce ownership in code (user_id must match the caller)
 * before deleting — so it's no broader than a per-user delete policy would be.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { property_id } = await req.json()
    if (!property_id) {
      return NextResponse.json({ error: 'Missing property_id' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      console.error('delete-deal: SUPABASE_SERVICE_ROLE_KEY not configured')
      return NextResponse.json({ error: 'Server not configured for deletes.' }, { status: 500 })
    }
    const admin = createAdminClient(url, serviceKey, { auth: { persistSession: false } })

    // Enforce ownership before deleting (service role bypasses RLS).
    const { data: prop, error: selErr } = await admin
      .from('properties')
      .select('id, user_id')
      .eq('id', property_id)
      .maybeSingle()
    if (selErr) {
      console.error('delete-deal: lookup failed', selErr)
      return NextResponse.json({ error: 'Could not look up property.' }, { status: 500 })
    }
    if (!prop) {
      return NextResponse.json({ error: 'Property not found.' }, { status: 404 })
    }
    if (prop.user_id !== user.id) {
      return NextResponse.json({ error: 'You can only remove your own deals.' }, { status: 403 })
    }

    // Cascade removes deal_tracker + analyses.
    const { error: delErr } = await admin.from('properties').delete().eq('id', property_id)
    if (delErr) {
      console.error('delete-deal: delete failed', delErr)
      return NextResponse.json({ error: 'Could not remove deal.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('delete-deal error:', e)
    return NextResponse.json({ error: e?.message || 'Could not remove deal.' }, { status: 500 })
  }
}
