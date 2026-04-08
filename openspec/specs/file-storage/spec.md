### Requirement: Storage driver selection via environment variable
The system SHALL select the active storage driver based on the `STORAGE_DRIVER` environment variable. Accepted values are `local` and `s3`. If the value is absent or unrecognized, the system SHALL default to `local`.

#### Scenario: STORAGE_DRIVER=local selects filesystem driver
- **WHEN** `STORAGE_DRIVER` is set to `local`
- **THEN** uploaded files are written to `public/uploads/{key}` on the local filesystem

#### Scenario: STORAGE_DRIVER=s3 selects S3 driver
- **WHEN** `STORAGE_DRIVER` is set to `s3`
- **THEN** uploaded files are sent to the configured S3-compatible bucket

#### Scenario: Missing STORAGE_DRIVER defaults to local
- **WHEN** `STORAGE_DRIVER` is not set
- **THEN** the system behaves as if `STORAGE_DRIVER=local`

---

### Requirement: File upload returns a public URL
The system SHALL return a publicly accessible URL string upon successful upload. The URL format SHALL depend on the active driver.

#### Scenario: Local driver returns a relative URL
- **WHEN** a file is uploaded using the `local` driver with key `rooms/abc/image.jpg`
- **THEN** the returned URL is `/uploads/rooms/abc/image.jpg`

#### Scenario: S3 driver returns an absolute URL using S3_PUBLIC_URL when set
- **WHEN** a file is uploaded using the `s3` driver and `S3_PUBLIC_URL=https://cdn.example.com`
- **THEN** the returned URL is `https://cdn.example.com/rooms/abc/image.jpg`

#### Scenario: S3 driver returns default bucket URL when S3_PUBLIC_URL is not set
- **WHEN** a file is uploaded using the `s3` driver and `S3_PUBLIC_URL` is not set
- **THEN** the returned URL is `https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/rooms/abc/image.jpg`

---

### Requirement: File deletion by key
The system SHALL delete a stored file given its key. If the file does not exist, the operation SHALL succeed silently (no error thrown).

#### Scenario: Local driver deletes file from filesystem
- **WHEN** `storage.delete("staff/xyz/avatar.jpg")` is called with the `local` driver
- **THEN** the file at `public/uploads/staff/xyz/avatar.jpg` is removed

#### Scenario: S3 driver deletes object from bucket
- **WHEN** `storage.delete("staff/xyz/avatar.jpg")` is called with the `s3` driver
- **THEN** the object at key `staff/xyz/avatar.jpg` is deleted from the S3 bucket

#### Scenario: Deleting a non-existent key does not throw
- **WHEN** `storage.delete` is called with a key that does not exist
- **THEN** the operation resolves without throwing an error

---

### Requirement: S3-compatible endpoint support
The S3 driver SHALL support any S3-compatible provider (AWS S3, Cloudflare R2, MinIO) by accepting an optional `S3_ENDPOINT` environment variable.

#### Scenario: Empty S3_ENDPOINT targets AWS S3
- **WHEN** `S3_ENDPOINT` is empty or not set
- **THEN** the S3 client sends requests to the default AWS S3 endpoint for the configured region

#### Scenario: Custom S3_ENDPOINT targets alternative provider
- **WHEN** `S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com`
- **THEN** the S3 client sends requests to the Cloudflare R2 endpoint

---

### Requirement: Uploaded objects are publicly readable
Files uploaded via the S3 driver SHALL be stored with `public-read` ACL or equivalent bucket policy so they are accessible via their public URL without authentication.

#### Scenario: Room images are publicly accessible
- **WHEN** a room image is uploaded via the S3 driver
- **THEN** the image URL is accessible in a browser without authentication headers

#### Scenario: Staff avatars are publicly accessible
- **WHEN** a staff avatar is uploaded via the S3 driver
- **THEN** the avatar URL is accessible without authentication headers
