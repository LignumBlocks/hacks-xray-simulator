-- CreateTable
CREATE TABLE "HackReport" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hackText" TEXT NOT NULL,
    "sourceLink" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "hackType" TEXT NOT NULL,
    "primaryCategory" TEXT NOT NULL,
    "verdictLabel" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "rawLabReport" JSONB NOT NULL,

    CONSTRAINT "HackReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HackReport_createdAt_idx" ON "HackReport"("createdAt");

-- CreateIndex
CREATE INDEX "HackReport_hackType_idx" ON "HackReport"("hackType");

-- CreateIndex
CREATE INDEX "HackReport_verdictLabel_idx" ON "HackReport"("verdictLabel");
