"use client";

import { useActionState } from "react";
import { uploadPhotoAction } from "./photos-actions";

// Repli manuel (une photo à la fois) — pour le cas où l'association
// automatique par nom de fichier du formulaire groupé (photo-upload-form.tsx)
// ne trouve pas de correspondance.
export function SinglePhotoUploadForm({ galleryId }: { galleryId: string }) {
  const boundAction = uploadPhotoAction.bind(null, galleryId);
  const [state, formAction, pending] = useActionState(boundAction, undefined);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-md border border-border p-4"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="original" className="text-sm text-ink-soft">
          Fichier original (RAW ou autre)
        </label>
        <input id="original" name="original" type="file" required className="text-sm" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="previewSource" className="text-sm text-ink-soft">
          Aperçu JPEG exporté (Lightroom ou équivalent)
        </label>
        <input
          id="previewSource"
          name="previewSource"
          type="file"
          accept="image/jpeg"
          required
          className="text-sm"
        />
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-fit items-center justify-center rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Import…" : "Importer la photo"}
      </button>
    </form>
  );
}
