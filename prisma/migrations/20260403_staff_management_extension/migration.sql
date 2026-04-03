-- Add employment and contact fields to staffs
ALTER TABLE "staffs" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "staffs" ADD COLUMN "joinedAt" TIMESTAMP(3);
ALTER TABLE "staffs" ADD COLUMN "resignedAt" TIMESTAMP(3);

-- Backfill contactEmail from the linked user's login email
UPDATE "staffs" s
SET "contactEmail" = u.email
FROM "users" u
WHERE s."userId" = u.id;

-- CreateTable staff_documents
CREATE TABLE "staff_documents" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'OTHER',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_documents_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "staff_documents" ADD CONSTRAINT "staff_documents_staffId_fkey"
    FOREIGN KEY ("staffId") REFERENCES "staffs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
