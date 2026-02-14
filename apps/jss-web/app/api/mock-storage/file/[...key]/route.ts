/**
 * Mock Storage File Retrieval Endpoint
 * SEOS: Local development without R2 credentials
 *
 * Retrieves files stored in mock storage and returns them.
 * Only active when R2 is not configured.
 */

import { NextRequest, NextResponse } from 'next/server'
import { shouldUseMockStorage, getMockFile } from '@/lib/storage/mock-storage'

interface RouteContext {
  params: Promise<{ key: string[] }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  // Only allow mock storage in development
  if (!shouldUseMockStorage()) {
    return NextResponse.json(
      { error: 'Mock storage is disabled when R2 is configured' },
      { status: 403 }
    )
  }

  try {
    const { key: keyParts } = await context.params
    const key = decodeURIComponent(keyParts.join('/'))

    const file = getMockFile(key)
    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Parse data URL and return as binary
    const matches = file.dataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!matches) {
      return NextResponse.json(
        { error: 'Invalid stored data' },
        { status: 500 }
      )
    }

    const [, contentType, base64Data] = matches
    const buffer = Buffer.from(base64Data, 'base64')

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('[MockStorage] Retrieval error:', error)
    return NextResponse.json(
      { error: 'Retrieval failed' },
      { status: 500 }
    )
  }
}
