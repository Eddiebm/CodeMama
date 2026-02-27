-- AlterTable
ALTER TABLE "Draft" ADD COLUMN "sentAt" DATETIME;
ALTER TABLE "Draft" ADD COLUMN "subject" TEXT;

-- CreateTable
CREATE TABLE "EmailValidation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "checkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailValidation_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailValidation_partnerId_key" ON "EmailValidation"("partnerId");
