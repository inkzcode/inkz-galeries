import type { GalleryStatusValue } from "./gallery-status";

// Transitions automatiques de statut (brief §5 : "Les statuts devront
// pouvoir évoluer automatiquement lorsque cela est pertinent"). Chaque
// fonction représente UN évènement du cycle de vie (brief §15/§18) et
// retourne le nouveau statut, ou le statut inchangé si l'évènement ne
// s'applique pas dans l'état courant — jamais d'exception, jamais de
// régression arrière (un statut "plus avancé" n'est jamais rétrogradé ici).
//
// Toutes ces fonctions sont pures : c'est à l'appelant (lib/services) de
// décider quand les invoquer et d'écrire le résultat en base, avec une
// entrée dans StatusHistory pour la traçabilité (voir schema.prisma).
//
// Seul `onFirstPhotoImported` est branché à ce jour (lib/services/import-photo.ts)
// — les autres correspondent à des actions pas encore construites
// (confirmation de sélection, paiement, post-production : Milestone 4).
// Elles sont écrites et testées à l'avance pour ne pas avoir à redessiner
// ce fichier plus tard.

export function onFirstPhotoImported(current: GalleryStatusValue): GalleryStatusValue {
  return current === "DRAFT" ? "AWAITING_SELECTION" : current;
}

export function onSelectionConfirmed(current: GalleryStatusValue): GalleryStatusValue {
  return current === "AWAITING_SELECTION" ? "SELECTION_RECEIVED" : current;
}

export function onPaymentRequired(current: GalleryStatusValue): GalleryStatusValue {
  return current === "SELECTION_RECEIVED" ? "PAYMENT_PENDING" : current;
}

// Appelé soit juste après confirmation si aucun paiement n'est requis
// (montant nul, brief §16), soit après réception du paiement.
export function onReadyForRetouch(current: GalleryStatusValue): GalleryStatusValue {
  return current === "SELECTION_RECEIVED" || current === "PAYMENT_PENDING"
    ? "TO_RETOUCH"
    : current;
}

export function onPostProductionStarted(current: GalleryStatusValue): GalleryStatusValue {
  return current === "TO_RETOUCH" ? "IN_POST_PRODUCTION" : current;
}

export function onFinalFilesImported(current: GalleryStatusValue): GalleryStatusValue {
  return current === "IN_POST_PRODUCTION" ? "READY_TO_DELIVER" : current;
}

export function onDelivered(current: GalleryStatusValue): GalleryStatusValue {
  return current === "READY_TO_DELIVER" ? "DELIVERED" : current;
}

// L'archivage est TOUJOURS une action manuelle de l'admin (voir
// PROJECT_CONTEXT.md §12 — "aucune suppression/archivage automatique") :
// volontairement aucune fonction `onXxx` n'y mène automatiquement.
