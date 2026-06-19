export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized — please sign in again' }, { status: 401 })

    const { listing_text } = await req.json()
    if (!listing_text || listing_text.trim().length < 20) {
      return NextResponse.json({ error: 'Listing text too short — paste more content' }, { status: 400 })
    }

    // Check API key exists
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 })
    }

    let claudeResponse
    try {
      claudeResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        thinking: { type: 'disabled' },
        output_config: { effort: 'low' },
        messages: [{
          role: 'user',
          content: `You are a real estate investment analyst. Extract financially relevant data from this listing and return ONLY valid JSON.

LISTING:
${listing_text}

Return this exact JSON structure (null for missing fields):
{
  "extracted": {
    "list_price": null,
    "monthly_rent": null,
    "unit_rents": null,
    "occupancy_status": "unknown",
    "lease_expiry": null,
    "year_built": null,
    "sqft": null,
    "bedrooms": null,
    "bathrooms": null,
    "property_type": null,
    "hoa_monthly": null,
    "property_taxes_annual": null,
    "recent_updates": [],
    "utilities_included": [],
    "red_flags": [],
    "section8": null,
    "creative_financing_accepted": null,
    "showing_instructions": null
  },
  "summary": "2-3 paragraph plain-English summary for a first-time investor covering: property type, income situation, key positives, any concerns.",
  "confidence": "high"
}`
        }],
      })
    } catch (claudeError: any) {
      console.error('Claude API error:', claudeError)
      return NextResponse.json({
        error: `Claude API error: ${claudeError.message || claudeError.status || 'unknown'}`,
        detail: claudeError.toString()
      }, { status: 500 })
    }

    const text = claudeResponse.content[0].type === 'text' ? claudeResponse.content[0].text : ''

    let parsed
    try {
      const clean = text.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(clean)
    } catch (parseError) {
      console.error('JSON parse error, raw text:', text)
      return NextResponse.json({
        error: 'Could not parse Claude response as JSON',
        raw: text.substring(0, 500)
      }, { status: 500 })
    }

    return NextResponse.json({
      extracted: parsed.extracted,
      summary: parsed.summary,
      confidence: parsed.confidence,
    })

  } catch (error: any) {
    console.error('Listing route error:', error)
    return NextResponse.json({
      error: `Server error: ${error.message || error.toString()}`,
    }, { status: 500 })
  }
}
