import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = "slg-receipts-dev"; // Default bucket, could be env var

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.warn("R2 environment variables are missing. R2Service will not function correctly.");
}

const R2 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || "",
    secretAccessKey: R2_SECRET_ACCESS_KEY || "",
  },
});

export class R2Service {
  static async getSignedUploadUrl(key: string, contentType: string) {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });
    // Expires in 1 hour
    return await getSignedUrl(R2, command, { expiresIn: 3600 });
  }

  static async getSignedDownloadUrl(key: string) {
      const command = new GetObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: key,
      });
      return await getSignedUrl(R2, command, { expiresIn: 3600 });
  }

  static getPublicUrl(key: string) {
      // Assuming a public custom domain is set up, or using the R2 dev URL if public access is allowed.
      // For now, we return the signed URL approach mostly, but if there's a public domain:
      // return `https://pub-domain.com/${key}`;
      // Fallback to purely key for the Edge Function to handle or presigned.
      return key;
  }
}
