import { notFound } from "next/navigation";
import { hasGalleryAccess } from "@/lib/gallery-access/session";
import { getPublicGalleryBySlug } from "@/lib/services/public-gallery-service";
import { listDeliverablePhotos } from "@/lib/services/final-delivery-service";
import { getRandomActiveTrustMessage } from "@/lib/services/trust-message-service";
import { AccessForm } from "./access-form";
import { GalleryView } from "./gallery-view";
import { WaitingView } from "./waiting-view";
import { DeliveryView } from "./delivery-view";

// La même galerie évolue à travers 3 étapes visuelles (brief §18), pilotées
// par Gallery.status — jamais deux galeries séparées.
const READY_STATUSES = new Set(["READY_TO_DELIVER", "DELIVERED"]);
const WAITING_STATUSES = new Set([
  "SELECTION_RECEIVED",
  "PAYMENT_PENDING",
  "TO_RETOUCH",
  "IN_POST_PRODUCTION",
]);

export default async function PublicGalleryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const gallery = await getPublicGalleryBySlug(slug);
  if (!gallery) {
    notFound();
  }

  const unlocked = await hasGalleryAccess(slug);
  if (!unlocked) {
    return <AccessForm gallerySlug={slug} galleryTitle={gallery.title} />;
  }

  if (READY_STATUSES.has(gallery.status)) {
    const photos = await listDeliverablePhotos(gallery.id);
    return (
      <DeliveryView
        gallerySlug={slug}
        galleryId={gallery.id}
        galleryTitle={gallery.title}
        photos={photos}
      />
    );
  }

  if (WAITING_STATUSES.has(gallery.status)) {
    return <WaitingView galleryTitle={gallery.title} />;
  }

  const selfImageMessage = gallery.selfImageMessagesEnabled
    ? await getRandomActiveTrustMessage(gallery.id)
    : null;

  return <GalleryView gallery={gallery} selfImageMessage={selfImageMessage} />;
}
