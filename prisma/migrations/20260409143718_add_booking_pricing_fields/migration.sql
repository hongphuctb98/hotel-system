-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "chargeType" TEXT NOT NULL DEFAULT 'nightly',
ADD COLUMN     "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "surchargeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
