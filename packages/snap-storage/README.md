# @slo/snap-storage

Shared storage utilities for Cloudflare R2 - used by ls-web and jss-web.

## Installation

This package is part of the monorepo workspace. It's automatically available to all apps.

## Usage

### Server-side (API Routes)

```typescript
import { uploadToR2, generatePresignedUrl, generateFilePath, getR2Config } from '@slo/snap-storage/server'

// Upload file
const filePath = generateFilePath({
  folder: 'receipts',
  organizationId: 'org-123',
  transactionId: 'tx-456',
  filename: 'receipt.jpg',
})

const { fileUrl } = await uploadToR2(
  fileBuffer,
  filePath,
  'image/jpeg',
  { uploadedBy: userId }
)

// Generate presigned URL
const { presignedUrl, fileUrl } = await generatePresignedUrl(
  filePath,
  'image/jpeg',
  3600, // expires in 1 hour
  { uploadedBy: userId }
)
```

### Client-side (React Components)

```typescript
import { uploadFile, uploadFileViaAPI } from '@slo/snap-storage/client'

// Upload with presigned URL (recommended for large files)
const { url, path } = await uploadFile(file, {
  folder: 'receipts',
  transactionId: 'tx-456',
  onProgress: (progress) => console.log(`${progress}%`),
})

// Upload via API (supports progress tracking)
const { url, path } = await uploadFileViaAPI(file, {
  folder: 'receipts',
  transactionId: 'tx-456',
  onProgress: (progress) => console.log(`${progress}%`),
})
```

## Environment Variables

Required in each app's `.env.local` or Vercel:

```bash
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_access_key
CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name
CLOUDFLARE_R2_PUBLIC_URL=https://your-public-domain.com  # Optional
```

## API Routes

Each app should create their own API routes using the shared utilities:

- `POST /api/upload` - Server-side upload
- `GET /api/upload/presigned` - Get presigned URL
- `DELETE /api/upload` - Delete file

See `apps/ls-web/app/api/upload/route.ts` for reference implementation.
