import { notFound } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { getGalleryById } from "@/lib/services/gallery-service";
import { getPublicGalleryBySlug } from "@/lib/services/public-gallery-service";
import { listDeliverablePhotos } from "@/lib/services/final-delivery-service";
import { getRandomActiveTrustMessage } from "@/lib/services/trust-message-service";
import { GalleryView } from "@/app/g/[slug]/gallery-view";
import { WaitingView } from "@/app/g/[slug]/waiting-view";
import { DeliveryView } from "@/app/g/[slug]/delivery-view";
import { PreviewChrome } from "./preview-chrome";

const READY_STATUSES = new Set(["READY_TO_DELIVER", "DELIVERED"]);
const WAITING_STATUSES = new Set([
  "SELECTION_RECEIVED",
  "PAYMENT_PENDING",
  "TO_RETOUCH",
  "IN_POST_PRODUCTION",
]);

// Aperçu "point de vue client" depuis l'admin (retour d'Enzo, 2026-08-22 :
// "je veux [...] accéder du point de vue du client sans avoir à rentrer
// le code PIN [...] et ça doit être mis à jour en direct"). Réutilise les
// MÊMES composants et le MÊME service public que `/g/[slug]/page.tsx` —
// c'est un aperçu fidèle, pas une reconstruction séparée qui risquerait
// de diverger. Protégé par la session admin (verifySession), jamais par
// le code d'accès galerie.
//
// Suite au retour "je peux juste voir les images et pas faire le test
// jusqu'au bout" (2026-08-22), l'aperçu est désormais RÉELLEMENT
// interactif : sélection, dessin/remarques et confirmation de sélection
// modifient pour de vrai les données de la galerie. Seule exception :
// `isPreview` sur DeliveryView empêche le marquage automatique "livrée"
// (qui n'a aucun effet visible pour Enzo mais changerait le statut réel
// de la galerie) — voir delivery-view.tsx.
export default async function GalleryClientPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifySession();
  const { id } = await params;

  const gallery = await getGalleryById(id);
  if (!gallery) notFound();

  const publicGallery = await getPublicGalleryBySlug(gallery.slug);
  if (!publicGallery) notFound();

  let view: React.ReactNode;
  if (READY_STATUSES.has(publicGallery.status)) {
    const photos = await listDeliverablePhotos(gallery.id);
    view = (
      <DeliveryView
        gallerySlug={gallery.slug}
        galleryId={gallery.id}
        galleryTitle={publicGallery.title}
        photos={photos}
        isPreview
      />
    );
  } else if (WAITING_STATUSES.has(publicGallery.status)) {
    view = <WaitingView galleryTitle={publicGallery.title} />;
  } else {
    const selfImageMessage = publicGallery.selfImageMessagesEnabled
      ? await getRandomActiveTrustMessage(publicGallery.id)
      : null;
    view = <GalleryView gallery={publicGallery} selfImageMessage={selfImageMessage} />;
  }

  return (
    <>
      <PreviewChrome galleryAdminId={gallery.id} />
      {view}
    </>
  );
}
