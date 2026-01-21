-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "originalKey" TEXT NOT NULL,
    "originalSizeBytes" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetVariant" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetVariant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Asset_studioId_idx" ON "Asset"("studioId");

-- CreateIndex
CREATE INDEX "AssetVariant_assetId_idx" ON "AssetVariant"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetVariant_assetId_kind_key" ON "AssetVariant"("assetId", "kind");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetVariant" ADD CONSTRAINT "AssetVariant_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
