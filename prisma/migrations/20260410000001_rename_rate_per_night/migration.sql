-- Rename ratePerNight to rate_per_night to match @map("rate_per_night")
ALTER TABLE "bookings" RENAME COLUMN "ratePerNight" TO "rate_per_night";
