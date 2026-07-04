-- AlterTable
ALTER TABLE "PasswordResetToken" ADD COLUMN "otpHash" TEXT;
ALTER TABLE "PasswordResetToken" ADD COLUMN "verifiedAt" TIMESTAMP(3);
