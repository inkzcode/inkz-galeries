"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { uploadPhotosDirectly } from "./direct-photo-upload";
import { SinglePhotoUploadForm } from "./single-photo-upload-form";

const DISPLAYABLE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

function extensionOf(filename: string): string {
  return (filename.split(".").pop() || "").toLowerCase();
}

// Import groupé — retour d'Enzo, 2026-08-22 : "le moment où je dois
// importer mes photos n'est pas logique et trop difficile à comprendre".
// L'ancien formulaire demandait deux fichiers par photo, une par une,
// sans expliquer pourquoi. Ici : on dépose tout le shooting d'un coup ;
// les JPEG/PNG servent directement d'aperçu (rien de plus à faire), seuls
// les RAW ont besoin d'un aperçu à côté, associé automatiquement par nom
// de fichier (voir lib/domain/filename-match.ts).
export function PhotoUploadForm({ galleryId }: { galleryId: string }) {
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [state, setState] = useState<{ imported: number; unmatched: string[] } | undefined>(
    undefined,
  );

  const [originals, setOriginals] = useState<File[]>([]);
  const [previews, setPreviews] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState<"originals" | "previews" | null>(null);
  const originalsInputRef = useRef<HTMLInputElement>(null);
  const previewsInputRef = useRef<HTMLInputElement>(null);

  const needsPreviews = useMemo(
    () => originals.some((file) => !DISPLAYABLE_EXTENSIONS.has(extensionOf(file.name))),
    [originals],
  );

  function addOriginals(files: FileList) {
    setOriginals((prev) => [...prev, ...Array.from(files)]);
  }
  function addPreviews(files: FileList) {
    setPreviews((prev) => [...prev, ...Array.from(files)]);
  }
  function removeOriginal(name: string) {
    setOriginals((prev) => prev.filter((file) => file.name !== name));
  }

  function handleSubmit() {
    const toUpload = originals;
    const previewFiles = previews;
    setOriginals([]);
    setPreviews([]);
    setPending(true);
    setProgress({ done: 0, total: toUpload.length });
    startTransition(async () => {
      const result = await uploadPhotosDirectly(galleryId, toUpload, previewFiles, (done, total) =>
        setProgress({ done, total }),
      );
      setState(result);
      setPending(false);
      setProgress(null);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver("originals");
        }}
        onDragLeave={() => setDragOver(null)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(null);
          addOriginals(event.dataTransfer.files);
        }}
        onClick={() => originalsInputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
          dragOver === "originals" ? "border-accent bg-accent-tint" : "border-border hover:border-ink"
        }`}
      >
        <p className="text-sm font-medium text-ink">Déposez vos photos ici</p>
        <p className="text-xs text-muted">
          JPEG ou PNG : prêtes à l&apos;emploi. RAW (CR2, CR3, NEF, ARW…) :
          ajoutez aussi les aperçus JPEG exportés ci-dessous — associés
          automatiquement par nom de fichier.
        </p>
        <input
          ref={originalsInputRef}
          type="file"
          multiple
          accept="image/*,.cr2,.cr3,.nef,.arw,.dng,.raf,.orf,.rw2"
          className="hidden"
          onChange={(event) => {
            if (event.target.files) addOriginals(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {originals.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {originals.map((file) => (
            <li
              key={file.name}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-ink-soft"
            >
              {file.name}
              <button
                type="button"
                onClick={() => removeOriginal(file.name)}
                aria-label={`Retirer ${file.name}`}
                className="text-muted hover:text-danger"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {needsPreviews && (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver("previews");
          }}
          onDragLeave={() => setDragOver(null)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(null);
            addPreviews(event.dataTransfer.files);
          }}
          onClick={() => previewsInputRef.current?.click()}
          role="button"
          tabIndex={0}
          className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-6 py-6 text-center transition-colors ${
            dragOver === "previews" ? "border-accent bg-accent-tint" : "border-border hover:border-ink"
          }`}
        >
          <p className="text-sm font-medium text-ink">
            Aperçus JPEG des fichiers RAW ({previews.length} déposé
            {previews.length > 1 ? "s" : ""})
          </p>
          <p className="text-xs text-muted">Exportés depuis Lightroom ou équivalent.</p>
          <input
            ref={previewsInputRef}
            type="file"
            multiple
            accept="image/jpeg"
            className="hidden"
            onChange={(event) => {
              if (event.target.files) addPreviews(event.target.files);
              event.target.value = "";
            }}
          />
        </div>
      )}

      {originals.length > 0 && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending}
          className="inline-flex w-fit items-center justify-center rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending
            ? progress
              ? `Import… ${progress.done}/${progress.total}`
              : "Import…"
            : `Importer ${originals.length} photo${originals.length > 1 ? "s" : ""}`}
        </button>
      )}

      {state && (state.imported > 0 || state.unmatched.length > 0) && (
        <div className="rounded-md border border-border bg-surface p-4 text-sm">
          {state.imported > 0 && (
            <p className="text-success">
              {state.imported} photo{state.imported > 1 ? "s" : ""} importée
              {state.imported > 1 ? "s" : ""}.
            </p>
          )}
          {state.unmatched.length > 0 && (
            <div className={state.imported > 0 ? "mt-2" : undefined}>
              <p className="text-danger">
                Échec (aucun aperçu trouvé, ou envoi impossible) pour :
              </p>
              <ul className="mt-1 list-disc pl-5 text-ink-soft">
                {state.unmatched.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-muted">
                Utilisez l&apos;import manuel ci-dessous pour celles-ci.
              </p>
            </div>
          )}
        </div>
      )}

      <details className="text-xs">
        <summary className="cursor-pointer text-muted hover:text-ink">
          Import manuel (une photo à la fois)
        </summary>
        <div className="mt-3">
          <SinglePhotoUploadForm galleryId={galleryId} />
        </div>
      </details>
    </div>
  );
}
