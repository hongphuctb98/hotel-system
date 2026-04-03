-- Make Staff.userId nullable so Staff can exist without a linked User account
ALTER TABLE "staffs" ALTER COLUMN "userId" DROP NOT NULL;
