import { S3Client } from "@aws-sdk/client-s3";

const endpoint = process.env.B2_ENDPOINT;
const region = process.env.B2_REGION;
const accessKeyId = process.env.B2_KEY_ID;
const secretAccessKey = process.env.B2_APP_KEY;

if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
  throw new Error(
    "Не заданы переменные окружения для B2 (B2_KEY_ID, B2_APP_KEY, B2_BUCKET, B2_ENDPOINT, B2_REGION)"
  );
}

export const s3 = new S3Client({
  endpoint,
  region,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: true, // критично для B2
});

export const BUCKET = process.env.B2_BUCKET ?? "project-control-uploads";