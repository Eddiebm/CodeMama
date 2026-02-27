-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Partner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "interest" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "lastContactAt" DATETIME,
    "humanRequired" BOOLEAN NOT NULL DEFAULT false,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactTitle" TEXT,
    "partnerType" TEXT NOT NULL DEFAULT 'PHARMA',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Partner" ("contactEmail", "contactName", "contactTitle", "createdAt", "humanRequired", "id", "interest", "lastContactAt", "name", "region", "status") SELECT "contactEmail", "contactName", "contactTitle", "createdAt", "humanRequired", "id", "interest", "lastContactAt", "name", "region", "status" FROM "Partner";
DROP TABLE "Partner";
ALTER TABLE "new_Partner" RENAME TO "Partner";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
