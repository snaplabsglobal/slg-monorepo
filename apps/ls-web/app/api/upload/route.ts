// app/api/upload/route.ts
// File upload API for Cloudflare R2
// Uses shared @slo/snap-storage package

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@slo/snap-auth'
import {
  uploadToR2,
  generatePresignedUrl,
  generateFilePath,
  deleteFromR2,
} from '@slo/snap-storage/server'

// POST /api/upload - Upload file to R2
export async function POST(request: NextRequest) {
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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = formData.get('folder') as string || 'receipts'
    const transactionId = formData.get('transactionId') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Generate file path
    const filename = file.name || `file-${Date.now()}`
    const filePath = generateFilePath({
      folder,
      organizationId: orgMember.organization_id,
      transactionId: transactionId || undefined,
      filename,
    })

    // Upload to R2
    const fileBuffer = await file.arrayBuffer()
    const { fileUrl } = await uploadToR2(
      fileBuffer,
      filePath,
      file.type || 'application/octet-stream',
      {
        uploadedBy: user.id,
        organizationId: orgMember.organization_id,
        originalFilename: file.name,
      }
    )

    return NextResponse.json({
      success: true,
      url: fileUrl,
      path: filePath,
      size: file.size,
      contentType: file.type,
    })
  } catch (error: any) {
    console.error('Error uploading file to R2:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/upload - Generate presigned URL for direct upload
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
    const folder = searchParams.get('folder') || 'receipts'
    const transactionId = searchParams.get('transactionId')

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
      transactionId: transactionId || undefined,
      filename,
    })

    // Generate presigned URL
    const expiresIn = parseInt(searchParams.get('expiresIn') || '3600')
    const { presignedUrl, fileUrl } = await generatePresignedUrl(
      filePath,
      contentType,
      expiresIn,
      {
        uploadedBy: user.id,
        organizationId: orgMember.organization_id,
        originalFilename: filename,
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

// DELETE /api/upload - Delete file from R2
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const path = searchParams.get('path')

    if (!path) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this file (check organization)
    const pathParts = path.split('/')
    if (pathParts.length < 2) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 400 }
      )
    }

    const orgId = pathParts[1]
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .single()

    if (!orgMember) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Only owners and admins can delete
    if (orgMember.role !== 'Owner' && orgMember.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Delete from R2
    await deleteFromR2(path)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting file from R2:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
