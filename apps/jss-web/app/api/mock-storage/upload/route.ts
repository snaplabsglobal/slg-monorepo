/**
 * Mock Storage Upload Endpoint
 * SEOS: Local development without R2 credentials
 *
 * Accepts file uploads and stores them in memory as data URLs.
 * Only active when R2 is not configured.
 */

import { NextRequest, NextResponse } from 'next/server'
import { shouldUseMockStorage, storeMockFile } from '@/lib/storage/mock-storage'

export async function PUT(request: NextRequest) {
  // Only allow mock storage in development
  if (!shouldUseMockStorage()) {
    return NextResponse.json(
      { error: 'Mock storage is disabled when R2 is configured' },
      { status: 403 }
    )
  }

  try {
    const key = request.nextUrl.searchParams.get('key')
    if (!key) {
      return NextResponse.json(
        { error: 'Missing key parameter' },
        { status: 400 }
      )
    }

    // Read the file as array buffer
    const buffer = await request.arrayBuffer()
    const contentType = request.headers.get('content-type') || 'application/octet-stream'

    // Convert to base64 data URL
    const base64 = Buffer.from(buffer).toString('base64')
    const dataUrl = `data:${contentType};base64,${base64}`

    // Store in mock storage
    storeMockFile(key, dataUrl, contentType)

    console.log(`[MockStorage] Upload complete: ${key} (${buffer.byteLength} bytes)`)

    return new NextResponse(null, { status: 200 })
  } catch (error) {
    console.error('[MockStorage] Upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
}

// Also support POST for compatibility
export async function POST(request: NextRequest) {
  return PUT(request)
}
