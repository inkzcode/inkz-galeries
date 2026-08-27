import { notFound } from "next/navigation";
import Link from "next/link";
import { verifySession } from "@/lib/auth/dal";
import { getGalleryById, listGalleryPhotos } from "@/lib/services/gallery-service";
import { listAccessCodes } from "@/lib/services/access-code-service";
import { listGalleryPhotoNotes } from "@/lib/services/photo-note-service";
import { getSelectedPhotos } from "@/lib/services/confirm-selection-service";
import { listDeliverablePhotos } from "@/lib/services/final-delivery-service";
import { getStorageAdapter } from "@/lib/storage/client";
import { GALLERY_STATUS_LABELS } from "@/lib/domain/gallery-status";
import { calculateAmountDue } from "@/lib/domain/pricing";
import { buildFilenameCsv, buildFilenameList } from "@/lib/domain/lightroom-export";
import { GalleryForm, type GalleryFormDefaults } from "../gallery-form";
import { updateGalleryAction } from "../actions";
import { PhotoUploadForm } from "./photo-upload-form";
import { AccessCodeForm } from "./access-code-form";
import { SelectionExport } from "./selection-export";
import { unlockSelectionAction } from "./selection-actions";
import { markPaymentReceivedAction } from "./payment-actions";
import { RevealSection } from "./reveal-section";
import { RetouchWorkspace, type RetouchPhoto } from "./retouch-workspace";
import { DeleteGalleryButton } from "./delete-gallery-button";
import { ArchiveGalleryButton } from "./archive-gallery-button";
import { PortfolioCoverPicker } from "./portfolio-cover-picker";
import { BackLink } from "../../../back-link";

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

function centsToEuros(cents: number | null): string {
  if (cents === null) return "";
  return (cents / 100).toString();
}

export default async function GalleryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifySession();
  const { id } = await params;

  const gallery = await getGalleryById(id);
  if (!gallery) {
    notFound();
  }

  const defaults: GalleryFormDefaults = {
    title: gallery.title,
    clientName: gallery.clientName ?? "",
    clientEmail: gallery.clientEmail ?? "",
    description: gallery.description ?? "",
    shootingType: gallery.shootingType ?? "",
    shootingDate: toDateInputValue(gallery.shootingDate),
    watermarkLevel: gallery.watermarkLevel,
    pricingMode: gallery.pricingMode,
    includedPhotosCount: gallery.includedPhotosCount?.toString() ?? "",
    extraPhotoPriceEuros: centsToEuros(gallery.extraPhotoPriceCents),
    retouchPhilosophyEnabled: gallery.retouchPhilosophyEnabled,
    selfImageMessagesEnabled: gallery.selfImageMessagesEnabled,
    beforeAfterEnabled: gallery.beforeAfterEnabled,
    portfolioEnabled: gallery.portfolioEnabled,
  };

  const boundAction = updateGalleryAction.bind(null, gallery.id);

  const photos = await listGalleryPhotos(gallery.id);
  const accessCodes = await listAccessCodes(gallery.id);
  const photoNotes = await listGalleryPhotoNotes(gallery.id);
  const storage = getStorageAdapter();
  const photosWithUrl = await Promise.all(
    photos.map(async (photo) => ({
      ...photo,
      previewUrl: photo.previewKey ? await storage.getPreviewUrl(photo.previewKey) : null,
    })),
  );
  const filenameByPhotoId = new Map(photos.map((photo) => [photo.id, photo.filename]));

  const selectedPhotos = await getSelectedPhotos(gallery.id);
  const finalPhotos = await listDeliverablePhotos(gallery.id);
  const pricing = calculateAmountDue(
    {
      pricingMode: gallery.pricingMode,
      includedPhotosCount: gallery.includedPhotosCount,
      extraPhotoPriceCents: gallery.extraPhotoPriceCents,
      currency: gallery.currency,
    },
    selectedPhotos.length,
  );
  const selectionLocked = gallery.selectionLockedAt !== null;

  const selectedPhotoIds = new Set(selectedPhotos.map((photo) => photo.id));
  const previewUrlByPhotoId = new Map(photosWithUrl.map((photo) => [photo.id, photo.previewUrl]));
  const notesByPhotoId = new Map<string, typeof photoNotes>();
  for (const note of photoNotes) {
    const list = notesByPhotoId.get(note.photoId) ?? [];
    list.push(note);
    notesByPhotoId.set(note.photoId, list);
  }

  const retouchPhotos: RetouchPhoto[] = selectedPhotos.map((photo) => ({
    id: photo.id,
    filename: photo.filename,
    previewUrl: previewUrlByPhotoId.get(photo.id) ?? null,
    finalReadyAt: photo.finalReadyAt,
    notes: (notesByPhotoId.get(photo.id) ?? []).map((note) => ({
      id: note.id,
      message: note.message,
      color: note.color,
      positionX: note.positionX,
      positionY: note.positionY,
    })),
  }));

  // Remarques laissées sur une photo jamais sélectionnée (le client peut
  // ouvrir n'importe quelle photo dans le lightbox, pas seulement celles
  // qu'il a choisies) — cas rare, gardé pour ne rien perdre, replié avec
  // le reste (voir accordéon plus bas).
  const otherNotes = photoNotes.filter((note) => !selectedPhotoIds.has(note.photoId));

  // Un seul bloc principal à la fois — ce qui a besoin d'attention MAINTENANT
  // (retour d'Enzo, 2026-08-22 : "trop d'info, les unes à la suite des
  // autres, rends ça le plus simple possible"). Tout le reste (infos du
  // shooting, photos une fois importées, accès client) passe dans un
  // accordéon replié — toujours accessible, jamais imposé.
  const primary = selectedPhotos.length === 0 ? "photos" : "retouch";

  const photosBlock = (
    <>
      <div className="max-w-2xl">
        <PhotoUploadForm galleryId={gallery.id} />
      </div>
      {photosWithUrl.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Aucune photo importée pour l&apos;instant.</p>
      ) : (
        <details open className="group mt-6">
          <summary className="cursor-pointer text-sm font-medium text-ink">
            {photosWithUrl.length} photo{photosWithUrl.length > 1 ? "s" : ""} importée
            {photosWithUrl.length > 1 ? "s" : ""}
            <span className="ml-1 text-xs text-muted group-open:hidden">
              — cliquez pour afficher
            </span>
          </summary>
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {photosWithUrl.map((photo) => (
              <li
                key={photo.id}
                className="group overflow-hidden rounded-md border border-border bg-surface transition-shadow hover:shadow-md"
              >
                {photo.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URLs de preview signées/locales, non compatibles avec l'optimiseur next/image (voir storage/README.md).
                  <img
                    src={photo.previewUrl}
                    alt={photo.filename}
                    className="aspect-[3/2] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex aspect-[3/2] w-full items-center justify-center text-xs text-muted">
                    Pas d&apos;aperçu
                  </div>
                )}
                <p className="truncate px-2 py-1.5 text-xs text-muted">{photo.filename}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <BackLink href="/admin" label="Retour aux shootings" />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl font-bold text-ink">{gallery.title}</h1>
        <span className="rounded-full border border-border px-3 py-1 text-sm text-muted">
          {GALLERY_STATUS_LABELS[gallery.status]}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Link
          href={`/g/${gallery.slug}`}
          target="_blank"
          className="text-sm text-muted underline decoration-border underline-offset-2 hover:text-ink"
        >
          /g/{gallery.slug}
        </Link>
        <Link
          href={`/admin/galleries/${gallery.id}/preview`}
          target="_blank"
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          Voir côté client
        </Link>
      </div>

      {gallery.status === "PAYMENT_PENDING" && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-md border border-accent bg-accent-tint px-4 py-3">
          <p className="text-sm text-ink">
            Paiement en attente — {(pricing.amountDueCents / 100).toFixed(2)} {pricing.currency} dus.
          </p>
          <form action={markPaymentReceivedAction.bind(null, gallery.id)}>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-paper transition-opacity hover:opacity-90"
            >
              Marquer comme reçu
            </button>
          </form>
        </div>
      )}

      <RevealSection className="mt-10">
        {primary === "photos" ? (
          photosBlock
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-baseline gap-x-1 text-sm text-ink-soft">
                <p>
                  {selectedPhotos.length} photo{selectedPhotos.length > 1 ? "s" : ""} sélectionnée
                  {selectedPhotos.length > 1 ? "s" : ""}
                  {pricing.requiresPayment &&
                    gallery.status !== "PAYMENT_PENDING" &&
                    ` — ${(pricing.amountDueCents / 100).toFixed(2)} ${pricing.currency} dus`}
                </p>
                {selectionLocked && (
                  <form action={unlockSelectionAction.bind(null, gallery.id)}>
                    <button type="submit" className="underline decoration-border hover:text-ink">
                      · revenir à la sélection
                    </button>
                  </form>
                )}
              </div>
              <SelectionExport
                filenameList={buildFilenameList(selectedPhotos)}
                csv={buildFilenameCsv(selectedPhotos)}
              />
            </div>

            <div className="mt-6">
              {selectionLocked ? (
                <RetouchWorkspace galleryId={gallery.id} photos={retouchPhotos} />
              ) : (
                <p className="text-sm text-muted">
                  Import des finaux possible une fois la sélection confirmée.
                </p>
              )}
            </div>
          </>
        )}
      </RevealSection>

      <div className="mt-10 flex flex-col gap-2 border-t border-border pt-8">
        <details className="rounded-md border border-border">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ink">
            Infos du shooting
          </summary>
          <div className="border-t border-border px-4 py-5">
            <GalleryForm action={boundAction} defaults={defaults} submitLabel="Enregistrer" />
          </div>
        </details>

        {primary !== "photos" && (
          <details className="rounded-md border border-border">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ink">
              Photos {photosWithUrl.length > 0 && `(${photosWithUrl.length})`}
            </summary>
            <div className="border-t border-border px-4 py-5">{photosBlock}</div>
          </details>
        )}

        <details className="rounded-md border border-border">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ink">
            Accès client {accessCodes.length > 0 && `(${accessCodes.length} code${accessCodes.length > 1 ? "s" : ""})`}
          </summary>
          <div className="border-t border-border px-4 py-5">
            <p className="text-xs text-muted">
              Le client entre ce code sur <code>/g</code> — pas de compte à créer.
            </p>
            <div className="mt-4 max-w-md">
              <AccessCodeForm galleryId={gallery.id} />
            </div>
            {accessCodes.length > 0 && (
              <ul className="mt-6 divide-y divide-border border-t border-border text-sm">
                {accessCodes.map((code) => (
                  <li
                    key={code.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 text-muted"
                  >
                    <span>Créé le {dateTimeFormatter.format(code.createdAt)}</span>
                    <span>
                      {code.lastUsedAt
                        ? `Utilisé le ${dateTimeFormatter.format(code.lastUsedAt)}`
                        : "Jamais utilisé"}
                    </span>
                    <span className={code.expiresAt && code.expiresAt < new Date() ? "text-danger" : ""}>
                      {code.expiresAt
                        ? `${code.expiresAt < new Date() ? "Expiré le" : "Expire le"} ${dateTimeFormatter.format(code.expiresAt)}`
                        : "Sans expiration"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>

        {gallery.portfolioEnabled && finalPhotos.length > 0 && (
          <details className="rounded-md border border-border">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ink">
              Couverture du portfolio public
            </summary>
            <div className="border-t border-border px-4 py-5">
              <p className="text-xs text-muted">
                Choisis la photo (retouchée, finale) qui représente ce shooting sur la page
                publique.
              </p>
              <div className="mt-4">
                <PortfolioCoverPicker
                  galleryId={gallery.id}
                  photos={finalPhotos}
                  currentCoverPhotoId={gallery.portfolioCoverPhotoId}
                />
              </div>
            </div>
          </details>
        )}

        {otherNotes.length > 0 && (
          <details className="rounded-md border border-border">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ink">
              Autres remarques ({otherNotes.length})
            </summary>
            <div className="border-t border-border px-4 py-5">
              <p className="text-xs text-muted">
                Laissées sur des photos non sélectionnées.
              </p>
              <ul className="mt-4 divide-y divide-border">
                {otherNotes.map((note) => (
                  <li key={note.id} className="py-3">
                    <p className="text-xs text-muted">
                      {filenameByPhotoId.get(note.photoId) ?? "Photo supprimée"} ·{" "}
                      {dateTimeFormatter.format(note.createdAt)}
                      {note.positionX !== null && note.positionY !== null && (
                        <>
                          {" "}
                          · 📍 {Math.round(note.positionX * 100)}%, {Math.round(note.positionY * 100)}%
                        </>
                      )}
                    </p>
                    <p className="mt-1 flex items-start gap-1.5 text-ink">
                      <span
                        aria-hidden
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: note.color ?? "#e63946" }}
                      />
                      {note.message}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        )}

        <div className="flex flex-wrap items-center gap-4 border-t border-border pt-6">
          {(gallery.status === "DELIVERED" || gallery.status === "ARCHIVED") && (
            <ArchiveGalleryButton
              galleryId={gallery.id}
              archived={gallery.status === "ARCHIVED"}
            />
          )}
          <DeleteGalleryButton galleryId={gallery.id} />
        </div>
      </div>
    </main>
  );
}
