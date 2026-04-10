-- CreateTable for room_type_pricing (must come before defaultPrice is dropped)
CREATE TABLE "room_type_pricing" (
    "id" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "nightlyPrice" DECIMAL(12,2),
    "dailyPrice" DECIMAL(12,2),
    "hourlyBlockHours" INTEGER,
    "hourlyBlockPrice" DECIMAL(12,2),
    "hourlyExtraPrice" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_type_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "room_type_pricing_roomTypeId_key" ON "room_type_pricing"("roomTypeId");

-- AddForeignKey
ALTER TABLE "room_type_pricing" ADD CONSTRAINT "room_type_pricing_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DataMigration: copy defaultPrice → nightlyPrice before dropping the column
INSERT INTO "room_type_pricing" ("id", "roomTypeId", "nightlyPrice", "updatedAt")
SELECT gen_random_uuid(), "id", "defaultPrice", now()
FROM "room_types"
ON CONFLICT ("roomTypeId") DO NOTHING;

-- AlterTable: drop defaultPrice from room_types
ALTER TABLE "room_types" DROP COLUMN "defaultPrice";

-- AlterTable: add hourly columns to bookings
ALTER TABLE "bookings"
    ADD COLUMN "hourlyBlockHours" INTEGER,
    ADD COLUMN "hourlyRatePerHour" DECIMAL(12,2);
