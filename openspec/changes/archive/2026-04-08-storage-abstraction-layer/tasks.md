## 1. Dependencies

- [x] 1.1 Install `@aws-sdk/client-s3` via npm

## 2. Storage Abstraction Layer

- [x] 2.1 Create `lib/storage.ts` — define `StorageDriver` interface with `upload(key, buffer, mimeType): Promise<string>` and `delete(key): Promise<void>`
- [x] 2.2 Implement `local` driver in `lib/storage.ts` — write to `public/uploads/{key}`, create parent dirs with `fs.mkdir`, return `/uploads/{key}`
- [x] 2.3 Implement `s3` driver in `lib/storage.ts` — use `@aws-sdk/client-s3` with `PutObjectCommand` (ACL: public-read) and `DeleteObjectCommand`; support `S3_ENDPOINT` for R2/MinIO; return `S3_PUBLIC_URL/{key}` or default bucket URL
- [x] 2.4 Export `storage` singleton from `lib/storage.ts` — select driver based on `STORAGE_DRIVER` env var, default to `local`

## 3. Refactor API Routes

- [x] 3.1 Refactor `app/api/rooms/[id]/images/route.ts` — replace `fs.mkdir + fs.writeFile` with `storage.upload(key, buffer, mimeType)`; store returned URL in DB
- [x] 3.2 Refactor `app/api/rooms/[id]/images/[imageId]/route.ts` (DELETE) — replace `fs.rm` with `storage.delete(key)`; derive key from stored URL
- [x] 3.3 Refactor `app/api/staff/[id]/avatar/route.ts` POST — replace `fs.mkdir + fs.writeFile` with `storage.upload`; store returned URL
- [x] 3.4 Refactor `app/api/staff/[id]/avatar/route.ts` DELETE — replace `fs.rm` with `storage.delete`
- [x] 3.5 Refactor `app/api/staff/[id]/documents/route.ts` POST — replace `fs.mkdir + fs.writeFile` with `storage.upload`; store returned URL

## 4. Configuration

- [x] 4.1 Update `.env.example` — add `STORAGE_DRIVER`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT` (optional), `S3_PUBLIC_URL` (optional) with comments
