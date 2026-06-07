export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { url } = await req.json()
    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Fetch the listing page
    let pageText = ''
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(10000),
      })

      const html = await res.text()

      // Extract JSON-LD structured data first (most reliable)
      const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi) || []
      const jsonLdData = jsonLdMatches.map(m => {
        try { return JSON.parse(m.replace(/<script[^>]*>/, '').replace('</script>', '').trim()) } catch { return null }
      }).filter(Boolean)

      // Extract key meta tags
      const metaPrice = html.match(/content="[^"]*\$[\d,]+[^"]*"/g) || []
      const metaTitle = html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] || ''

      // Extract visible text (strip HTML tags, limit size)
      pageText = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .substring(0, 8000) // limit for Claude

      // Prepend structured data if found
      if (jsonLdData.length > 0) {
        pageText = `STRUCTURED DATA: ${JSON.stringify(jsonLdData).substring(0, 2000)}\n\nPAGE TEXT: ${pageText}`
      }

    } catch (fetchError: any) {
      return NextResponse.json({
        error: `Could not fetch that URL: ${fetchError.message}. Try pasting the listing description instead.`
      }, { status: 400 })
    }

    // Use Claude to extract data from the page
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Extract real estate listing data from this page content. Return ONLY valid JSON.

PAGE CONTENT:
${pageText}

Return this exact JSON (null for missing fields):
{
  "extracted": {
    "list_price": number or null,
    "monthly_rent": number or null,
    "unit_rents": null,
    "occupancy_status": "occupied" or "vacant" or "unknown",
    "lease_expiry": null,
    "year_built": number or null,
    "sqft": number or null,
    "bedrooms": number or null,
    "bathrooms": number or null,
    "property_type": "sfr/duplex/triplex/fourplex/condo/townhouse" or null,
    "address": "full address string" or null,
    "zip": "5-digit zip" or null,
    "city": "city name" or null,
    "hoa_monthly": number or null,
    "property_taxes_annual": number or null,
    "days_on_market": number or null,
    "recent_updates": [],
    "utilities_included": [],
    "red_flags": [],
    "section8": null
  },
  "summary": "2-3 paragraph investor summary covering: property type, income situation, key positives, any concerns. Be specific with numbers.",
  "confidence": "high or medium or low"
}

Focus on finding: list price, address, year built, sqft, beds/baths, any mention of rent or tenants.`
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    let parsed
    try {
      const clean = text.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      return NextResponse.json({ error: 'Could not parse listing data', raw: text.substring(0, 200) }, { status: 500 })
    }

    return NextResponse.json({
      extracted: parsed.extracted,
      summary: parsed.summary,
      confidence: parsed.confidence,
      source: 'url',
    })

  } catch (error: any) {
    console.error('URL fetch error:', error)
    return NextResponse.json({ error: `Error: ${error.message}` }, { status: 500 })
  }
}
