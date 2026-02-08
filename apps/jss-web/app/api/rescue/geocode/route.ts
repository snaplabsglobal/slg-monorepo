/**
 * POST /api/rescue/geocode
 * Reverse geocode coordinates to get address suggestion
 *
 * Note: This returns a SUGGESTION only - user must confirm
 * Confidence is always 'low' or 'medium', never 'high' (Phase 1 rule)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Simple in-memory cache for geocoding results
// Key: rounded lat,lng -> address
const geocodeCache = new Map<string, { formatted: string; timestamp: number }>()
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Round coordinates for cache key (4 decimals = ~11m precision)
 */
function roundCoord(n: number, decimals = 4): number {
  const factor = Math.pow(10, decimals)
  return Math.round(n * factor) / factor
}

/**
 * Generate cache key from coordinates
 */
function cacheKey(lat: number, lng: number): string {
  return `${roundCoord(lat)},${roundCoord(lng)}`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { lat, lng } = body

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      )
    }

    // Check cache first
    const key = cacheKey(lat, lng)
    const cached = geocodeCache.get(key)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({
        success: true,
        address: {
          formatted: cached.formatted,
          source: 'reverse_geocode',
          confidence: 'medium' as const, // Phase 1: never 'high'
          cached: true,
        },
      })
    }

    // Use OpenStreetMap Nominatim for reverse geocoding (free, no API key needed)
    // In production, consider using Google Maps or Mapbox for better results
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'JobSiteSnap/1.0 (contact@snaplabs.global)',
      },
    })

    if (!response.ok) {
      console.warn('[geocode] Nominatim error:', response.status)
      return NextResponse.json({
        success: true,
        address: null,
        message: 'Geocoding service unavailable',
      })
    }

    const data = await response.json()

    // Format address
    let formatted = ''
    if (data.address) {
      const parts: string[] = []

      // City/suburb
      const city =
        data.address.city ||
        data.address.town ||
        data.address.suburb ||
        data.address.municipality
      if (city) parts.push(city)

      // Street address
      const street = data.address.road || data.address.street
      const number = data.address.house_number
      if (street) {
        parts.push(number ? `${number} ${street}` : street)
      }

      formatted = parts.join(' – ')
    }

    if (!formatted && data.display_name) {
      // Fallback to first part of display name
      const displayParts = data.display_name.split(',')
      formatted = displayParts.slice(0, 2).join(' – ').trim()
    }

    if (!formatted) {
      formatted = `${roundCoord(lat, 4)}, ${roundCoord(lng, 4)}`
    }

    // Cache the result
    geocodeCache.set(key, { formatted, timestamp: Date.now() })

    // Determine confidence based on result quality
    // Phase 1: Only 'low' or 'medium', never 'high'
    const hasStreet = !!(data.address?.road || data.address?.street)
    const confidence = hasStreet ? 'medium' : 'low'

    return NextResponse.json({
      success: true,
      address: {
        formatted,
        source: 'reverse_geocode',
        confidence,
        cached: false,
      },
    })
  } catch (error) {
    console.error('[geocode] Error:', error)
    return NextResponse.json(
      { error: 'Failed to geocode' },
      { status: 500 }
    )
  }
}
