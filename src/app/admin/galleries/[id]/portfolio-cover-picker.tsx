"use client";

import { useActionState } from "react";
import { setPortfolioCoverAction } from "./portfolio-actions";

type FinalPhoto = { id: string; filename: string; viewUrl: string };

// Choix de la photo de couverture du portfolio public (brief §1) —
// volontairement limité aux photos qui ont un fichier FINAL (retouché,
// sans watermark) : jamais une preview, qui n'a rien à faire sur une
// page publique (voir gallery-service.ts). Chaque vignette est son
// propre petit formulaire — cliquer dessus la choisit directement, pas
// de sélection puis bouton "valider" séparé.
export function PortfolioCoverPicker({
  galleryId,
  photos,
  currentCoverPhotoId,
}: {
  galleryId: string;
  photos: FinalPhoto[];
  currentCoverPhotoId: string | null;
}) {
  const boundAction = setPortfolioCoverAction.bind(null, galleryId);
  const [state, formAction, pending] = useActionState(boundAction, undefined);

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {photos.map((photo) => {
          const isCover = photo.id === currentCoverPhotoId;
          return (
            <form key={photo.id} action={formAction}>
              <input type="hidden" name="photoId" value={photo.id} />
              <button
                type="submit"
                disabled={pending}
                aria-pressed={isCover}
                title={photo.filename}
                className={`relative block w-full overflow-hidden rounded-md border-2 transition-colors disabled:opacity-60 ${
                  isCover ? "border-accent" : "border-transparent hover:border-border"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- URL de preview signée/locale, voir storage/README.md */}
                <img src={photo.viewUrl} alt={photo.filename} className="aspect-[3/2] w-full object-cover" />
                {isCover && (
                  <span className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs text-paper">
                    ✓
                  </span>
                )}
              </button>
            </form>
          );
        })}
      </div>

      {currentCoverPhotoId && (
        <form action={formAction} className="mt-3">
          <input type="hidden" name="photoId" value="" />
          <button
            type="submit"
            disabled={pending}
            className="text-xs text-muted underline decoration-border underline-offset-2 hover:text-ink"
          >
            Retirer la couverture
          </button>
        </form>
      )}

      {state?.error && <p className="mt-2 text-xs text-danger">{state.error}</p>}
    </div>
  );
}
