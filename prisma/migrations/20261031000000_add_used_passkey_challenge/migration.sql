-- CreateTable
CREATE TABLE "UsedPasskeyChallenge" (
    "challenge" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsedPasskeyChallenge_pkey" PRIMARY KEY ("challenge")
);

-- CreateIndex
CREATE INDEX "UsedPasskeyChallenge_usedAt_idx" ON "UsedPasskeyChallenge"("usedAt");
