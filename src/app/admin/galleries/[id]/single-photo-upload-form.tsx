"use client";

import { useRef, useState, useTransition } from "react";
import { uploadPhotosDirectly } from "./direct-photo-upload";

// Repli manuel (une photo à la fois) — pour le cas où l'association
// automatique par nom de fichier du formulaire groupé (photo-upload-form.tsx)
// ne trouve pas de correspondance. Même chemin d'envoi direct que le
// formulaire groupé (voir direct-photo-upload.ts) — un gros RAW dépasse
// aussi bien la limite de 4,5 Mo de Vercel tout seul qu'en lot.
export function SinglePhotoUploadForm({ galleryId }: { galleryId: string }) {
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const originalRef = useRef<HTMLInputElement>(null);
  const previewSourceRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const original = originalRef.current?.files?.[0];
    const previewSource = previewSourceRef.current?.files?.[0];
    if (!original || !previewSource) {
      setError("Les deux fichiers sont requis.");
      return;
    }

    setError(null);
    setPending(true);
    startTransition(async () => {
      const result = await uploadPhotosDirectly(galleryId, [original], [previewSource], () => {});
      setPending(false);
      if (result.imported === 0) {
        setError(result.unmatched[0]?.reason ?? "L'import a échoué.");
        return;
      }
      if (originalRef.current) originalRef.current.value = "";
      if (previewSourceRef.current) previewSourceRef.current.value = "";
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-md border border-border p-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="original" className="text-sm text-ink-soft">
          Fichier original (RAW ou autre)
        </label>
        <input id="original" ref={originalRef} type="file" required className="text-sm" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="previewSource" className="text-sm text-ink-soft">
          Aperçu JPEG exporté (Lightroom ou équivalent)
        </label>
        <input
          id="previewSource"
          ref={previewSourceRef}
          type="file"
          accept="image/jpeg"
          required
          className="text-sm"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
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
