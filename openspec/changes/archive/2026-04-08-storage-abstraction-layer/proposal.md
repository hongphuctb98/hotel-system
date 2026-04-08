## Why

Vercel and other serverless platforms have a read-only filesystem — current API routes use `fs.writeFile` into `public/uploads/`, causing `ENOENT: no such file or directory, mkdir '/var/task/public/uploads/...'` on deployment. Storage backend must be decoupled from business logic to support both local development and cloud storage without code changes.

## What Changes

- **Create** `lib/storage.ts` — storage abstraction with two drivers: `local` (filesystem) and `s3` (S3-compatible API)
- **Refactor** `app/api/rooms/[id]/images/route.ts` — replace `fs.writeFile/rm` with `storage.upload/delete`
- **Refactor** `app/api/staff/[id]/avatar/route.ts` — replace `fs.writeFile/rm` with `storage.upload/delete`
- **Refactor** `app/api/staff/[id]/documents/route.ts` — replace `fs.writeFile/rm` with `storage.upload/delete`
- **Add dependency** `@aws-sdk/client-s3`
- **Update** `.env.example` with storage config env vars

## Capabilities

### New Capabilities

- `file-storage`: Abstraction layer for file upload/delete — supports local filesystem (dev) and S3-compatible cloud storage (production). Driver is selected via the `STORAGE_DRIVER` env var.

### Modified Capabilities

<!-- No existing capabilities have requirement changes — implementation only -->

## Impact

- **API routes**: 3 files refactored (`rooms images`, `staff avatar`, `staff documents`) — client-facing behavior unchanged
- **Dependencies**: Add `@aws-sdk/client-s3`
- **Env vars**: Add `STORAGE_DRIVER`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT` (optional, for R2/MinIO), `S3_PUBLIC_URL` (optional, for CloudFront/custom domain)
- **DB**: No schema changes — URL is still stored as a string, only the prefix differs (`/uploads/...` vs `https://...`)
- **Local dev**: No changes — `STORAGE_DRIVER=local` preserves existing behavior
