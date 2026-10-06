-- CreateEnum
CREATE TYPE "ImageStatus" AS ENUM ('pending', 'processed', 'failed');

-- CreateTable
CREATE TABLE "images" (
    "id" UUID NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "original_key" TEXT NOT NULL,
    "thumbnail_key" TEXT,
    "status" "ImageStatus" NOT NULL DEFAULT 'pending',
    "error_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "images_original_key_key" ON "images"("original_key");

-- CreateIndex
CREATE UNIQUE INDEX "images_thumbnail_key_key" ON "images"("thumbnail_key");

-- CreateIndex
CREATE INDEX "images_status_created_at_idx" ON "images"("status", "created_at" DESC);
