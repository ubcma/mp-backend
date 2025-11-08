import {
  S3Client,
  PutObjectCommand,
  CreateBucketCommand,
  DeleteObjectCommand,
  DeleteBucketCommand,
  paginateListObjectsV2,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accessKeyId = process.env.AWS_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || "";
const region = process.env.AWS_REGION || "us-west-2";
const BUCKET = process.env.AWS_S3_BUCKET!;

console.log("\n [S3 INIT]");
console.log(`  Bucket: ${BUCKET}`);
console.log(`  Region: ${region}`);
console.log(`  Access Key Prefix: ${accessKeyId.slice(0, 6)}...\n`);

const s3 = new S3Client({
  region,
  credentials: { accessKeyId, secretAccessKey },
});

// ========== UPLOAD FILE ==========
export async function uploadFileToS3({
  key,
  body,
  contentType = "image/png",
}: {
  key: string;
  body: Buffer | string;
  contentType: string;
}) {
  console.log(`\ S3 Upload] Starting upload to S3...`);
  console.log(`   Bucket: ${BUCKET}`);
  console.log(`   Key: ${key}`);
  console.log(`   Content-Type: ${contentType}`);
  console.log(`   Size: ${typeof body === "string" ? body.length : body.byteLength} bytes`);

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  try {
    const res = await s3.send(command);
    console.log(`[S3 Upload Success] ETag: ${res.ETag || "(no ETag)"}`);

    const url = `https://${BUCKET}.s3.${region}.amazonaws.com/${key}`;
    console.log(`[S3 File URL] ${url}\n`);
    return url;
  } catch (err: any) {
    console.error("[S3 Upload Failed]");
    console.error(`Message: ${err.message}`);
    console.error(`Code: ${err.Code || err.code}`);
    throw err;
  }
}


export async function getSignedFileUrl(key: string, expiresInSeconds = 3600) {
  console.log(`\n[S3 Signed URL] Generating for key: ${key}`);
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });

  try {
    const url = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
    console.log(`[S3 Signed URL Success] Expires in: ${expiresInSeconds}s`);
    console.log(`URL: ${url}\n`);
    return url;
  } catch (err: any) {
    console.error("[S3 Signed URL Failed]", err.message);
    throw err;
  }
}

// ========== READ FILE ==========
export async function readFileFromS3(key: string): Promise<string> {
  console.log(`\n📖 [S3 Read] Reading file: ${key}`);
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  try {
    const { Body } = await s3.send(command);
    console.log(`[S3 Read Success]`);
    return await Body?.transformToString()!;
  } catch (err: any) {
    console.error(`[S3 Read Failed]`, err.message);
    throw err;
  }
}

// ========== LIST FILES ==========
export async function listAllFiles(prefix?: string) {
  console.log(`\n[S3 List] Listing files with prefix: ${prefix || "(root)"}`);
  const paginator = paginateListObjectsV2(
    { client: s3 },
    { Bucket: BUCKET, Prefix: prefix },
  );

  const files: string[] = [];
  for await (const page of paginator) {
    page.Contents?.forEach((obj) => files.push(obj.Key!));
  }

  console.log(`✅ [S3 List Success] Found ${files.length} file(s):`);
  files.forEach((f) => console.log(`   - ${f}`));
  return files;
}

// ========== DELETE FILE ==========
export async function deleteFileFromS3(key: string) {
  console.log(`\n🗑️ [S3 Delete] Key: ${key}`);
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
  try {
    await s3.send(command);
    console.log(`[S3 Delete Success]`);
  } catch (err: any) {
    console.error(`❌ [S3 Delete Failed]`, err.message);
  }
}

// ========== CREATE / DELETE BUCKET ==========
export async function createBucket(bucketName: string) {
  console.log(`\n[S3 Create Bucket] ${bucketName}`);
  const command = new CreateBucketCommand({ Bucket: bucketName });
  await s3.send(command);
  console.log(`✅ [S3 Create Bucket Success]`);
}

export async function deleteBucket(bucketName: string) {
  console.log(`\n[S3 Delete Bucket] ${bucketName}`);
  const command = new DeleteBucketCommand({ Bucket: bucketName });
  await s3.send(command);
  console.log(`✅ [S3 Delete Bucket Success]`);
}

export { s3 };
