// Statuts d'une galerie (voir brief §5) — dupliqué à dessein depuis
// prisma/schema.prisma (`GalleryStatus`) pour que ce fichier reste
// indépendant de l'ORM (voir README.md de ce dossier). Garder synchronisé
// avec le schéma.
export const GALLERY_STATUSES = [
  "DRAFT",
  "AWAITING_SELECTION",
  "SELECTION_RECEIVED",
  "PAYMENT_PENDING",
  "TO_RETOUCH",
  "IN_POST_PRODUCTION",
  "READY_TO_DELIVER",
  "DELIVERED",
  "ARCHIVED",
] as const;

export type GalleryStatusValue = (typeof GALLERY_STATUSES)[number];

export const GALLERY_STATUS_LABELS: Record<GalleryStatusValue, string> = {
  DRAFT: "Brouillon",
  AWAITING_SELECTION: "En attente de sélection",
  SELECTION_RECEIVED: "Sélection reçue",
  PAYMENT_PENDING: "Paiement en attente",
  TO_RETOUCH: "À retoucher",
  IN_POST_PRODUCTION: "Post-production en cours",
  READY_TO_DELIVER: "Prêt à livrer",
  DELIVERED: "Livré",
  ARCHIVED: "Archivé",
};
