-- AlterTable
ALTER TABLE "Gallery" ADD COLUMN     "portfolioCoverPhotoId" TEXT,
ADD COLUMN     "portfolioEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Gallery_portfolioCoverPhotoId_key" ON "Gallery"("portfolioCoverPhotoId");

-- AddForeignKey
ALTER TABLE "Gallery" ADD CONSTRAINT "Gallery_portfolioCoverPhotoId_fkey" FOREIGN KEY ("portfolioCoverPhotoId") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

