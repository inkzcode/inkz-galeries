"use client";

import { useRef, useState, useTransition } from "react";
import { uploadFinalDirectly } from "./direct-final-upload";

export function FinalUploadForm({
  galleryId,
  photoId,
  alreadyImported,
}: {
  galleryId: string;
  photoId: string;
  alreadyImported: boolean;
}) {
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(false);
    setPending(true);
    startTransition(async () => {
      const ok = await uploadFinalDirectly(galleryId, photoId, file);
      setPending(false);
      if (!ok) {
        setError("L'import a échoué.");
        return;
      }
      setSuccess(true);
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <input ref={inputRef} type="file" accept="image/*" required className="text-xs" />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-border px-2 py-1 text-xs text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-60"
      >
        {pending ? "Import…" : alreadyImported ? "Remplacer" : "Importer le final"}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
      {success && <span className="text-xs text-success">Importé ✓</span>}
    </form>
  );
}
