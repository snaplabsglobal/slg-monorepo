/**
 * POST /api/jobs/:jobId/import/preview
 *
 * Magic Import MVP - Preview Endpoint
 * Find candidate photos near this job within a time range.
 *
 * Request:
 *   { "range": "30d" | "12m" }
 *
 * Response:
 *   {
 *     "photos": [{ id, thumbnail_url, taken_at }],
 *     "count": number,
 *     "job": { name, address }
 *   }
 *
 * Filter Logic (strict order):
 * 1. Time: taken_at within range
 * 2. GPS: photo.lat IS NOT NULL
 * 3. Distance: within 150m of job.geofence_lat/lng
 * 4. Unassigned: job_id IS NULL
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
}

// Haversine distance in meters
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000 // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Max distance for import (150 meters)
const MAX_DISTANCE_METERS = 150

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: jobId } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request
    const body = await request.json()
    const range = body.range as '30d' | '12m'

    if (!range || !['30d', '12m'].includes(range)) {
      return NextResponse.json(
        { error: 'Invalid range. Use "30d" or "12m".' },
        { status: 400 }
      )
    }

    // Get job with geofence
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, name, address, geofence_lat, geofence_lng, organization_id')
      .eq('id', jobId)
      .is('deleted_at', null)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Check job has geofence
    if (!job.geofence_lat || !job.geofence_lng) {
      return NextResponse.json(
        {
          error: 'Job has no location',
          message: 'Add a job address to use Magic Import.',
        },
        { status: 400 }
      )
    }

    // Calculate date range
    const now = new Date()
    let minDate: Date
    if (range === '30d') {
      minDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    } else {
      minDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    }

    // Query unassigned photos with GPS within time range
    // We fetch more than needed and filter by distance in JS
    // (Supabase doesn't have native distance functions)
    const { data: photos, error: photosError } = await supabase
      .from('job_photos')
      .select('id, thumbnail_url, file_url, taken_at, lat, lng')
      .eq('organization_id', job.organization_id)
      .is('job_id', null)
      .is('deleted_at', null)
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .gte('taken_at', minDate.toISOString())
      .lte('taken_at', now.toISOString())
      .order('taken_at', { ascending: false })
      .limit(2000)

    if (photosError) {
      console.error('Error fetching photos:', photosError)
      return NextResponse.json(
        { error: 'Failed to fetch photos' },
        { status: 500 }
      )
    }

    // Filter by distance
    const candidatePhotos = (photos || [])
      .filter((photo) => {
        if (!photo.lat || !photo.lng) return false
        const distance = haversineDistance(
          job.geofence_lat!,
          job.geofence_lng!,
          photo.lat,
          photo.lng
        )
        return distance <= MAX_DISTANCE_METERS
      })
      .map((photo) => ({
        id: photo.id,
        thumbnail_url: photo.thumbnail_url || photo.file_url,
        taken_at: photo.taken_at,
      }))

    return NextResponse.json(
      {
        photos: candidatePhotos,
        count: candidatePhotos.length,
        job: {
          id: job.id,
          name: job.name,
          address: job.address,
        },
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (error) {
    console.error('Import preview error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
