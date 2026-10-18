import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
const s3 = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT || undefined,
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
  forcePathStyle: String(process.env.S3_FORCE_PATH_STYLE||"") === "true"
});
export async function signUpload(key: string, contentType: string, expiresSeconds = 300){
  const cmd = new PutObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key, ContentType: contentType });
  return await getSignedUrl(s3, cmd, { expiresIn: expiresSeconds });
}
export async function signDownload(key: string, expiresSeconds = 300){
  const cmd = new GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key });
  return await getSignedUrl(s3, cmd, { expiresIn: expiresSeconds });
}
