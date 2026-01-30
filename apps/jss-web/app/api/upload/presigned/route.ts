// app/api/upload/presigned/route.ts
// Generate presigned URL for direct client upload to R2
// Uses local R2 module (lib/storage/r2) for Vercel build

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@slo/snap-auth'
import {
  generatePresignedUrl,
  generateFilePath,
} from '@/lib/storage/r2'

// GET /api/upload/presigned - Generate presigned URL
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!orgMember) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 404 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const filename = searchParams.get('filename')
    const contentType = searchParams.get('contentType') || 'application/octet-stream'
    const folder = searchParams.get('folder') || 'site-photos'  // Default folder for JSS
    const transactionId = searchParams.get('transactionId')
    const projectId = searchParams.get('projectId')  // JSS specific
    const expiresIn = parseInt(searchParams.get('expiresIn') || '3600')

    if (!filename) {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      )
    }

    // Generate file path
    const filePath = generateFilePath({
      folder,
      organizationId: orgMember.organization_id,
      transactionId: projectId || transactionId || undefined,
      filename,
    })

    // Generate presigned URL
    const { presignedUrl, fileUrl } = await generatePresignedUrl(
      filePath,
      contentType,
      expiresIn,
      {
        uploadedBy: user.id,
        organizationId: orgMember.organization_id,
        originalFilename: filename,
        projectId: projectId || undefined,
      }
    )

    return NextResponse.json({
      presignedUrl,
      fileUrl,
      path: filePath,
      expiresIn,
    })
  } catch (error: any) {
    console.error('Error generating presigned URL:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
