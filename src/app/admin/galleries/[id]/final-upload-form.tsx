"use client";

import { useActionState } from "react";
import { uploadFinalPhotoAction } from "./final-upload-actions";

export function FinalUploadForm({
  galleryId,
  photoId,
  alreadyImported,
}: {
  galleryId: string;
  photoId: string;
  alreadyImported: boolean;
}) {
  const boundAction = uploadFinalPhotoAction.bind(null, galleryId, photoId);
  const [state, formAction, pending] = useActionState(boundAction, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="file" name="final" accept="image/*" required className="text-xs" />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-border px-2 py-1 text-xs text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-60"
      >
        {pending ? "Import…" : alreadyImported ? "Remplacer" : "Importer le final"}
      </button>
      {state?.error && <span className="text-xs text-danger">{state.error}</span>}
      {state?.success && <span className="text-xs text-success">Importé ✓</span>}
    </form>
  );
}
