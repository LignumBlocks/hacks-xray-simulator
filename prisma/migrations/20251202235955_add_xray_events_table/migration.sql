-- CreateTable
CREATE TABLE "xray_events" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceHost" TEXT,
    "country" TEXT NOT NULL,
    "clientIpHash" TEXT,
    "userAgent" TEXT,
    "verdictLabel" TEXT NOT NULL,
    "legalityLabel" TEXT NOT NULL,
    "mathScore0to10" INTEGER NOT NULL,
    "riskScore0to10" INTEGER NOT NULL,
    "practicalityScore0to10" INTEGER NOT NULL,
    "primaryCategory" TEXT,
    "adherenceLevel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xray_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "xray_events_reportId_idx" ON "xray_events"("reportId");

-- CreateIndex
CREATE INDEX "xray_events_verdictLabel_idx" ON "xray_events"("verdictLabel");

-- CreateIndex
CREATE INDEX "xray_events_sourceHost_idx" ON "xray_events"("sourceHost");

-- CreateIndex
CREATE INDEX "xray_events_country_idx" ON "xray_events"("country");

-- CreateIndex
CREATE INDEX "xray_events_createdAt_idx" ON "xray_events"("createdAt");

-- AddForeignKey
ALTER TABLE "xray_events" ADD CONSTRAINT "xray_events_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "HackReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
