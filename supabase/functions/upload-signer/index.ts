import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.370.0"
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.370.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { filename, contentType } = await req.json()
    
    // Validate Auth (optional but recommended to check authorization header)
    // const authHeader = req.headers.get('Authorization')
    // if (!authHeader) throw new Error('Missing Authorization header')

    const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID') ?? ''
    const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID') ?? ''
    const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY') ?? ''
    const R2_BUCKET_NAME = Deno.env.get('R2_BUCKET_NAME') ?? ''
    const R2_PUBLIC_DOMAIN = Deno.env.get('R2_PUBLIC_DOMAIN') ?? '' // e.g. https://cdn.example.com

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
        throw new Error('Missing R2 Credentials')
    }

    const S3 = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })

    const key = `receipts/${crypto.randomUUID()}-${filename}`

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(S3, command, { expiresIn: 3600 })
    const publicUrl = R2_PUBLIC_DOMAIN ? `${R2_PUBLIC_DOMAIN}/${key}` : uploadUrl.split('?')[0] // Fallback if no custom domain

    return new Response(
      JSON.stringify({ uploadUrl, publicUrl, key }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
