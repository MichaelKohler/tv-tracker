-- This deletes all existing rows, so if there are any ongoing resets, they will be lost.
-- This may or may not be acceptable depending on your user volume.

-- DeleteRows
DELETE FROM "PasswordReset";

-- AlterTable
ALTER TABLE "PasswordReset" DROP COLUMN "email",
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "PasswordReset_userId_idx" ON "PasswordReset"("userId");
