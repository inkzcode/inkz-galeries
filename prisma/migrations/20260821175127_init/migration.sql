-- CreateEnum
CREATE TYPE "GalleryStatus" AS ENUM ('DRAFT', 'AWAITING_SELECTION', 'SELECTION_RECEIVED', 'PAYMENT_PENDING', 'TO_RETOUCH', 'IN_POST_PRODUCTION', 'READY_TO_DELIVER', 'DELIVERED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WatermarkLevel" AS ENUM ('NONE', 'LIGHT', 'STANDARD', 'STRONG');

-- CreateEnum
CREATE TYPE "PricingMode" AS ENUM ('DISABLED', 'FREE', 'INCLUDED_PLUS_EXTRA', 'PER_PHOTO');

-- CreateEnum
CREATE TYPE "AnnotationAuthor" AS ENUM ('CLIENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "StatusChangedBy" AS ENUM ('SYSTEM', 'ADMIN');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('GALLERY_READY', 'SELECTION_CONFIRMED', 'PAYMENT_RECEIVED', 'FINAL_READY');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gallery" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "clientName" TEXT,
    "clientEmail" TEXT,
    "description" TEXT,
    "shootingType" TEXT,
    "shootingDate" TIMESTAMP(3),
    "status" "GalleryStatus" NOT NULL DEFAULT 'DRAFT',
    "coverPhotoId" TEXT,
    "watermarkLevel" "WatermarkLevel" NOT NULL DEFAULT 'NONE',
    "pricingMode" "PricingMode" NOT NULL DEFAULT 'DISABLED',
    "includedPhotosCount" INTEGER,
    "extraPhotoPriceCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "retouchPhilosophyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "selfImageMessagesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "beforeAfterEnabled" BOOLEAN NOT NULL DEFAULT false,
    "selectionLockedAt" TIMESTAMP(3),
    "deletionWarningAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalKey" TEXT NOT NULL,
    "previewKey" TEXT,
    "finalKey" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "finalReadyAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelectionItem" (
    "id" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SelectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoNote" (
    "id" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "author" "AnnotationAuthor" NOT NULL,
    "message" TEXT NOT NULL,
    "positionX" DOUBLE PRECISION,
    "positionY" DOUBLE PRECISION,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessCode" (
    "id" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "provider" TEXT,
    "providerPaymentId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "fromStatus" "GalleryStatus",
    "toStatus" "GalleryStatus" NOT NULL,
    "changedBy" "StatusChangedBy" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustMessage" (
    "id" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrustMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BeforeAfterExample" (
    "id" TEXT NOT NULL,
    "galleryId" TEXT,
    "beforeKey" TEXT NOT NULL,
    "afterKey" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BeforeAfterExample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Gallery_slug_key" ON "Gallery"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Gallery_coverPhotoId_key" ON "Gallery"("coverPhotoId");

-- CreateIndex
CREATE INDEX "Photo_galleryId_idx" ON "Photo"("galleryId");

-- CreateIndex
CREATE UNIQUE INDEX "SelectionItem_photoId_key" ON "SelectionItem"("photoId");

-- CreateIndex
CREATE INDEX "PhotoNote_photoId_idx" ON "PhotoNote"("photoId");

-- CreateIndex
CREATE INDEX "AccessCode_galleryId_idx" ON "AccessCode"("galleryId");

-- CreateIndex
CREATE INDEX "Payment_galleryId_idx" ON "Payment"("galleryId");

-- CreateIndex
CREATE INDEX "StatusHistory_galleryId_idx" ON "StatusHistory"("galleryId");

-- CreateIndex
CREATE INDEX "BeforeAfterExample_galleryId_idx" ON "BeforeAfterExample"("galleryId");

-- CreateIndex
CREATE INDEX "NotificationLog_galleryId_idx" ON "NotificationLog"("galleryId");

-- AddForeignKey
ALTER TABLE "Gallery" ADD CONSTRAINT "Gallery_coverPhotoId_fkey" FOREIGN KEY ("coverPhotoId") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "Gallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectionItem" ADD CONSTRAINT "SelectionItem_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoNote" ADD CONSTRAINT "PhotoNote_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessCode" ADD CONSTRAINT "AccessCode_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "Gallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "Gallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "Gallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeforeAfterExample" ADD CONSTRAINT "BeforeAfterExample_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "Gallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "Gallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
