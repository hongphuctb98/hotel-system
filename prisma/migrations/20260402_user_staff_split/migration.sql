-- CreateTable staffs: HR profile linked 1-to-1 with users
CREATE TABLE "staffs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "position" TEXT,
    "department" TEXT,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staffs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staffs_userId_key" ON "staffs"("userId");

-- AddForeignKey
ALTER TABLE "staffs" ADD CONSTRAINT "staffs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migrate existing name + avatarUrl from users into staffs
INSERT INTO "staffs" ("id", "userId", "name", "avatarUrl", "isActive", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::TEXT,
    "id",
    "name",
    "avatarUrl",
    "isActive",
    "createdAt",
    CURRENT_TIMESTAMP
FROM "users";

-- AlterTable users: drop name and avatarUrl columns
ALTER TABLE "users" DROP COLUMN "name";
ALTER TABLE "users" DROP COLUMN "avatarUrl";
