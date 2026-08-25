"use client";

import { useActionState, useState } from "react";
import { deleteGalleryAction } from "../actions";

// Zone dangereuse (retour d'Enzo, 2026-08-25 : "je veux pouvoir
// supprimer mes shooting si je veux") — repliée par défaut, et retaper
// le titre exact du shooting pour confirmer plutôt qu'une simple boîte
// de dialogue : un shooting peut représenter des dizaines de photos et
// le travail du client à les sélectionner, une confirmation qui se ferme
// d'un clic distrait n'est pas assez pour ça.
export function DeleteGalleryButton({
  galleryId,
  galleryTitle,
}: {
  galleryId: string;
  galleryTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const boundAction = deleteGalleryAction.bind(null, galleryId);
  const [state, formAction, pending] = useActionState(boundAction, undefined);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-muted underline decoration-border underline-offset-2 hover:text-danger"
      >
        Supprimer ce shooting
      </button>
    );
  }

  return (
    <div className="rounded-md border border-danger/40 bg-danger/5 p-4">
      <p className="text-sm font-medium text-danger">Supprimer définitivement ce shooting</p>
      <p className="mt-1 text-xs text-ink-soft">
        Toutes les photos, remarques et la sélection du client seront perdues pour
        toujours — impossible à annuler. Pour confirmer, tapez le titre exact du
        shooting : <span className="font-medium text-ink">{galleryTitle}</span>
      </p>
      <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          name="confirmation"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder={galleryTitle}
          className="rounded-md border border-border bg-paper px-3 py-1.5 text-sm text-ink outline-none focus:border-danger"
        />
        <button
          type="submit"
          disabled={pending || confirmation.trim() !== galleryTitle}
          className="rounded-md bg-danger px-4 py-1.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Suppression…" : "Supprimer définitivement"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setConfirmation("");
          }}
          className="text-sm text-muted hover:text-ink"
        >
          Annuler
        </button>
      </form>
      {state?.error && <p className="mt-2 text-xs text-danger">{state.error}</p>}
    </div>
  );
}
