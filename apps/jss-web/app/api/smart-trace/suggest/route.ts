/**
 * Smart Trace Suggestion API
 *
 * Phase 1 Boundaries (CRITICAL):
 * - This endpoint only SUGGESTS, never writes job_id
 * - Only works when online (no offline calls)
 * - Returns candidates with distance and confidence
 * - User must explicitly confirm to actually assign
 *
 * POST /api/smart-trace/suggest
 * Body: { photos: [{ photo_id, lat, lng, accuracy_m }] }
 * Response: { suggestions: [{ photo_id, candidates: [...] }] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Smart Trace configuration (Phase 1)
const SMART_TRACE_CONFIG = {
  geofenceRadius: 100,    // Maximum distance in meters
  minAccuracyM: 100,      // Skip if GPS accuracy > 100m
  maxCandidates: 3,       // Max candidates per photo
}

const CONFIDENCE_THRESHOLDS = {
  medium: 50,   // < 50m = medium confidence
  low: 100,     // < 100m = low confidence
}

interface PhotoCoord {
  photo_id: string
  lat: number
  lng: number
  accuracy_m?: number
}

interface JobCandidate {
  job_id: string
  job_name: string
  distance_m: number
  confidence: 'low' | 'medium'
}

interface PhotoSuggestion {
  photo_id: string
  candidates: JobCandidate[]
  skipped?: boolean
  skip_reason?: string
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000 // Earth's radius in meters
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

/**
 * Determine confidence level based on distance
 */
function getConfidence(distanceM: number): 'low' | 'medium' | null {
  if (distanceM <= CONFIDENCE_THRESHOLDS.medium) return 'medium'
  if (distanceM <= CONFIDENCE_THRESHOLDS.low) return 'low'
  return null // Too far
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const photos: PhotoCoord[] = body.photos

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return NextResponse.json(
        { error: 'photos array is required' },
        { status: 400 }
      )
    }

    // Fetch all active jobs with coordinates for this user's organization
    // In a production system, you'd want to filter by organization_id
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, name, address, geofence_lat, geofence_lng, organization_id')
      .is('deleted_at', null)
      .not('geofence_lat', 'is', null)
      .not('geofence_lng', 'is', null)

    if (jobsError) {
      console.error('Failed to fetch jobs:', jobsError)
      return NextResponse.json(
        { error: 'Failed to fetch jobs' },
        { status: 500 }
      )
    }

    // If no jobs have coordinates, return empty suggestions
    if (!jobs || jobs.length === 0) {
      return NextResponse.json({
        suggestions: photos.map((p) => ({
          photo_id: p.photo_id,
          candidates: [],
          skipped: true,
          skip_reason: 'no_jobs_with_coordinates',
        })),
      })
    }

    // Process each photo
    const suggestions: PhotoSuggestion[] = photos.map((photo) => {
      // Skip if GPS accuracy is too poor
      if (
        photo.accuracy_m &&
        photo.accuracy_m > SMART_TRACE_CONFIG.minAccuracyM
      ) {
        return {
          photo_id: photo.photo_id,
          candidates: [],
          skipped: true,
          skip_reason: `gps_accuracy_too_low_${photo.accuracy_m}m`,
        }
      }

      // Calculate distance to each job
      const candidates: JobCandidate[] = []

      for (const job of jobs) {
        if (!job.geofence_lat || !job.geofence_lng) continue

        const distance = haversineDistance(
          photo.lat,
          photo.lng,
          job.geofence_lat,
          job.geofence_lng
        )

        const confidence = getConfidence(distance)

        // Only include if within geofence radius
        if (confidence && distance <= SMART_TRACE_CONFIG.geofenceRadius) {
          candidates.push({
            job_id: job.id,
            job_name: job.name || job.address || `Job ${job.id.substring(0, 8)}`,
            distance_m: Math.round(distance),
            confidence,
          })
        }
      }

      // Sort by distance (closest first) and limit
      candidates.sort((a, b) => a.distance_m - b.distance_m)
      const topCandidates = candidates.slice(0, SMART_TRACE_CONFIG.maxCandidates)

      return {
        photo_id: photo.photo_id,
        candidates: topCandidates,
      }
    })

    console.log(
      `[SmartTrace] Processed ${photos.length} photos, ` +
      `${suggestions.filter((s) => s.candidates.length > 0).length} with suggestions`
    )

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Smart Trace API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
