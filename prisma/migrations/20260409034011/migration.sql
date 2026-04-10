-- DropForeignKey
ALTER TABLE "staffs" DROP CONSTRAINT "staffs_userId_fkey";

-- AlterTable
ALTER TABLE "staffs" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "staffs" ADD CONSTRAINT "staffs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
