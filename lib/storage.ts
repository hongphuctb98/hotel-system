import { promises as fs } from "fs";
import path from "path";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

interface StorageDriver {
  upload(key: string, buffer: Buffer, mimeType: string): Promise<string>;
  delete(key: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Local driver — writes to public/uploads/{key}, served by Next.js static
// ---------------------------------------------------------------------------
const localDriver: StorageDriver = {
  async upload(key, buffer) {
    const filePath = path.join(process.cwd(), "public", "uploads", key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
    return `/uploads/${key}`;
  },

  async delete(key) {
    const filePath = path.join(process.cwd(), "public", "uploads", key);
    await fs.rm(filePath, { force: true });
  },
};

// ---------------------------------------------------------------------------
// S3 driver — supports AWS S3, Cloudflare R2, and any S3-compatible endpoint
// ---------------------------------------------------------------------------
function createS3Driver(): StorageDriver {
  const bucket = process.env.S3_BUCKET!;
  const region = process.env.S3_REGION ?? "auto";
  const endpoint = process.env.S3_ENDPOINT || undefined;
  const publicUrl = process.env.S3_PUBLIC_URL?.replace(/\/$/, "");

  const client = new S3Client({
    region,
    ...(endpoint ? { endpoint, forcePathStyle: false } : {}),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });

  function buildPublicUrl(key: string): string {
    if (publicUrl) return `${publicUrl}/${key}`;
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  return {
    async upload(key, buffer, mimeType) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
          ACL: "public-read",
        })
      );
      return buildPublicUrl(key);
    },

    async delete(key) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );
    },
  };
}

// ---------------------------------------------------------------------------
// Singleton — driver selected by STORAGE_DRIVER env var (default: "local")
// ---------------------------------------------------------------------------
const driver = process.env.STORAGE_DRIVER === "s3" ? createS3Driver() : localDriver;

export const storage: StorageDriver = driver;

// ---------------------------------------------------------------------------
// Derive the storage key from a stored URL
//   local: "/uploads/rooms/abc/img.jpg" → "rooms/abc/img.jpg"
//   s3:    "https://cdn.example.com/rooms/abc/img.jpg" → "rooms/abc/img.jpg"
// ---------------------------------------------------------------------------
export function urlToKey(url: string): string {
  if (url.startsWith("/uploads/")) return url.slice("/uploads/".length);
  try {
    return new URL(url).pathname.slice(1);
  } catch {
    return url;
  }
}
