## Context

Three API routes currently write files directly to `public/uploads/` via Node.js `fs`. This works locally but fails entirely on Vercel (serverless, read-only filesystem) and any multi-instance deployment. A storage abstraction layer is needed to allow swapping the storage backend without touching business logic in route handlers.

**Current state:**
```
route.ts → fs.writeFile(path.join(process.cwd(), "public/uploads/...")) → disk
```

**Target state:**
```
route.ts → storage.upload(key, buffer, mime) → [local: disk | s3: S3/R2]
```

## Goals / Non-Goals

**Goals:**
- Fix the Vercel deployment error immediately (using an S3-compatible backend)
- No changes to the client-facing interface (request/response unchanged)
- Support Cloudflare R2 (free tier) for staging before switching to AWS S3
- Local developers continue using the filesystem — no cloud credentials required

**Non-Goals:**
- Image transformation / resizing
- Direct client upload via presigned URLs — files still flow through the Next.js server
- CDN integration (can be added later via `S3_PUBLIC_URL`)
- Multipart upload for large files

## Decisions

### D1: Singleton module (`lib/storage.ts`) rather than class instantiation

The driver is initialized once based on the `STORAGE_DRIVER` env var and exported as a `storage` singleton. Routes simply `import { storage } from "@/lib/storage"`.

**Alternative considered**: Factory function or dependency injection.  
**Rationale**: Simpler, consistent with the existing project pattern (`lib/prisma.ts` is also a singleton).

### D2: Minimal interface — only `upload` and `delete`

```ts
interface StorageDriver {
  upload(key: string, buffer: Buffer, mimeType: string): Promise<string> // returns public URL
  delete(key: string): Promise<void>
}
```

**Rationale**: The three current routes only need these two operations. No over-engineering for operations not yet required (list, copy, presign).

### D3: `key` is a relative path; URL is determined by the driver

Routes pass a `key` like `rooms/{roomId}/{filename}`. The driver builds the appropriate URL:
- `local`: `/uploads/rooms/{roomId}/{filename}` (served by Next.js static file serving)
- `s3`: `https://{bucket}.s3.{region}.amazonaws.com/rooms/{roomId}/{filename}` or custom `S3_PUBLIC_URL`

**Rationale**: Business logic does not need to know the storage backend's URL scheme.

### D4: S3 driver uses `@aws-sdk/client-s3` (v3 modular)

AWS SDK v3 supports S3-compatible APIs (Cloudflare R2, MinIO) via the `endpoint` config option. Switching providers only requires changing `S3_ENDPOINT`.

```
AWS S3:        S3_ENDPOINT= (empty)
Cloudflare R2: S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
MinIO local:   S3_ENDPOINT=http://localhost:9000
```

### D5: `local` driver uses `fs` with `public/uploads/` prefix

Preserves existing behavior — files are still served via Next.js static file serving. No changes for local developers.

## Risks / Trade-offs

**[Risk] DB stores full URLs (`https://...`) rather than relative paths** → If the bucket/domain changes, old URLs in the DB break.  
*Mitigation*: Use `S3_PUBLIC_URL` to map to a custom domain (e.g. CloudFront), reducing dependency on the bucket URL.

**[Risk] Vercel request body size limit** → Vercel serverless functions cap request bodies at 4.5 MB.  
*Mitigation*: Document clearly in `.env.example`. Files larger than 4.5 MB would require presigned direct upload (out of scope).

**[Risk] S3 credential exposure** → `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` must remain server-side only (no `NEXT_PUBLIC_` prefix).  
*Mitigation*: Already correct — route handlers run server-side; env vars are not bundled into the client.

**[Trade-off] Files flow through the Next.js server rather than direct upload** → Consumes server bandwidth (client → server → S3).  
*Acceptable*: Far simpler architecture; suitable for the low-traffic internal nature of a hotel management system.

## Migration Plan

1. Add `@aws-sdk/client-s3` to dependencies
2. Create `lib/storage.ts` with both drivers
3. Refactor the three route handlers
4. Update `.env.example`
5. **Vercel**: Set `STORAGE_DRIVER=s3` + Cloudflare R2 credentials in the Vercel dashboard
6. **Rollback**: Set `STORAGE_DRIVER=local` to immediately fall back to filesystem (only works on non-serverless environments)

## Open Questions

- File size limit: Should we return a clear error when files exceed 4.5 MB on Vercel?  
  → Leave Vercel to return 413 for now; validation can be added later if needed.
