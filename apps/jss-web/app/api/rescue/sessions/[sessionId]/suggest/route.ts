/**
 * POST /api/rescue/sessions/[sessionId]/suggest
 * Generate group suggestions based on GPS/time clustering
 *
 * Note: This only returns SUGGESTIONS - nothing is auto-assigned
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  suggestGroups,
  generateBuildingBuckets,
} from '@/lib/rescue/clustering'
import type { RescuePhoto, ClusterConfig } from '@/lib/rescue/types'
import { DEFAULT_CLUSTER_CONFIG } from '@/lib/rescue/types'

type RouteContext = {
  params: Promise<{ sessionId: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { sessionId } = await context.params
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
    const photos = body.photos as RescuePhoto[]
    const mode = (body.mode as 'groups' | 'buckets') || 'groups'
    const config = {
      ...DEFAULT_CLUSTER_CONFIG,
      ...(body.config || {}),
    } as ClusterConfig

    if (!Array.isArray(photos) || photos.length === 0) {
      return NextResponse.json(
        { error: 'No photos provided' },
        { status: 400 }
      )
    }

    // Validate photo data
    const validPhotos: RescuePhoto[] = []
    for (const p of photos) {
      if (!p.photoId || !p.takenAtUtc) {
        continue // skip invalid
      }
      validPhotos.push({
        photoId: p.photoId,
        takenAtUtc: p.takenAtUtc,
        lat: typeof p.lat === 'number' ? p.lat : undefined,
        lng: typeof p.lng === 'number' ? p.lng : undefined,
        accuracyM: typeof p.accuracyM === 'number' ? p.accuracyM : undefined,
        fileName: p.fileName,
        fileSize: p.fileSize,
      })
    }

    console.log(
      `[rescue/suggest] Processing ${validPhotos.length} photos for session ${sessionId}`
    )

    // Generate suggestions based on mode
    if (mode === 'buckets') {
      // Multi-unit building mode
      const { buckets, unlocatedPhotoIds, noiseGpsPhotoIds } =
        generateBuildingBuckets(validPhotos, config)

      return NextResponse.json({
        success: true,
        sessionId,
        mode: 'buckets',
        buckets,
        stats: {
          totalPhotos: validPhotos.length,
          bucketsCount: buckets.length,
          sessionsCount: buckets.reduce((sum: number, b) => sum + b.sessions.length, 0),
          unlocatedCount: unlocatedPhotoIds.length,
          noiseCount: noiseGpsPhotoIds.length,
        },
        unlocatedPhotoIds,
        noiseGpsPhotoIds,
      })
    } else {
      // Simple group mode
      const { groups, unlocatedPhotoIds, noiseGpsPhotoIds } = suggestGroups(
        validPhotos,
        config
      )

      return NextResponse.json({
        success: true,
        sessionId,
        mode: 'groups',
        groups,
        stats: {
          totalPhotos: validPhotos.length,
          groupsCount: groups.length,
          organizedCount: groups.reduce((sum: number, g) => sum + g.photoIds.length, 0),
          unlocatedCount: unlocatedPhotoIds.length,
          noiseCount: noiseGpsPhotoIds.length,
        },
        unlocatedPhotoIds,
        noiseGpsPhotoIds,
      })
    }
  } catch (error) {
    console.error('[rescue/suggest] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    )
  }
}
