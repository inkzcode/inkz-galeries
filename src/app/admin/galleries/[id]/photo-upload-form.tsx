"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { uploadPhotosDirectly, type UploadFailure, type UploadProgress } from "./direct-photo-upload";
import { SinglePhotoUploadForm } from "./single-photo-upload-form";

const DISPLAYABLE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

function extensionOf(filename: string): string {
  return (filename.split(".").pop() || "").toLowerCase();
}

// Import groupé — retour d'Enzo, 2026-08-22 : "le moment où je dois
// importer mes photos n'est pas logique et trop difficile à comprendre".
// L'ancien formulaire demandait deux fichiers par photo, une par une,
// sans expliquer pourquoi. Ici : on dépose tout le shooting d'un coup ;
// les JPEG/PNG servent directement d'aperçu (rien de plus à faire). Pour
// les RAW, le serveur extrait automatiquement l'aperçu intégré par
// l'appareil photo (retour d'Enzo, 2026-08-25 : "avant [la retouche] ça
// doit être en RAW [...] je veux pas avoir à le faire") — la zone
// d'aperçus JPEG ci-dessous reste disponible en secours, associée
// automatiquement par nom de fichier, si l'extraction automatique ne
// donne pas un bon résultat pour certaines photos.
export function PhotoUploadForm({ galleryId }: { galleryId: string }) {
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [state, setState] = useState<
    { imported: number; unmatched: UploadFailure[]; capExceeded: boolean } | undefined
  >(undefined);

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

  function runUpload(toUpload: File[], previewFiles: File[]) {
    setPending(true);
    setProgress({ done: 0, total: toUpload.length, imported: 0, failed: 0 });
    startTransition(async () => {
      const result = await uploadPhotosDirectly(galleryId, toUpload, previewFiles, setProgress);
      setState(result);
      setPending(false);
      setProgress(null);
    });
  }

  function handleSubmit() {
    const toUpload = originals;
    const previewFiles = previews;
    setOriginals([]);
    setPreviews([]);
    runUpload(toUpload, previewFiles);
  }

  // Réessaie directement les fichiers échoués — leur référence est
  // conservée (voir direct-photo-upload.ts), inutile pour Enzo de les
  // rechercher un par un (retour d'Enzo, 2026-08-25).
  function handleRetryFailed() {
    if (!state) return;
    const toRetry = state.unmatched.map((failure) => failure.file);
    setState(undefined);
    runUpload(toRetry, []);
  }

  return (
    <div className="flex flex-col gap-4">
      {pending && progress && (
        <div className="rounded-lg border border-accent bg-accent-tint p-4">
          <div className="mb-2 flex items-center justify-between text-sm font-medium text-ink">
            <span>Import en cours, ne fermez pas cette page…</span>
            <span>
              {progress.done} / {progress.total}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-paper">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-ink-soft">
            {progress.imported} importée{progress.imported > 1 ? "s" : ""}
            {progress.failed > 0
              ? `, ${progress.failed} échec${progress.failed > 1 ? "s" : ""}`
              : ""}
            {" — le temps dépend surtout de la vitesse d'envoi de votre connexion."}
          </p>
        </div>
      )}

      <div
        onDragOver={(event) => {
          if (pending) return;
          event.preventDefault();
          setDragOver("originals");
        }}
        onDragLeave={() => setDragOver(null)}
        onDrop={(event) => {
          event.preventDefault();
          if (pending) return;
          setDragOver(null);
          addOriginals(event.dataTransfer.files);
        }}
        onClick={() => !pending && originalsInputRef.current?.click()}
        role="button"
        tabIndex={pending ? -1 : 0}
        aria-disabled={pending}
        className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
          pending
            ? "cursor-not-allowed border-border opacity-50"
            : "cursor-pointer border-border hover:border-ink"
        } ${dragOver === "originals" ? "border-accent bg-accent-tint" : ""}`}
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
          disabled={pending}
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
            Aperçus JPEG en secours ({previews.length} déposé
            {previews.length > 1 ? "s" : ""})
          </p>
          <p className="text-xs text-muted">
            Facultatif — les RAW ont déjà un aperçu généré automatiquement. À utiliser
            seulement si le résultat automatique ne convient pas pour certaines photos
            (exportés depuis Lightroom ou équivalent).
          </p>
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

      {originals.length > 0 && !pending && (
        <button
          type="button"
          onClick={handleSubmit}
          className="inline-flex w-fit items-center justify-center rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
        >
          {`Importer ${originals.length} photo${originals.length > 1 ? "s" : ""}`}
        </button>
      )}

      {state && state.capExceeded && (
        <div className="rounded-md border border-danger bg-danger/5 p-4 text-sm">
          <p className="font-medium text-danger">Quota Backblaze du jour dépassé (1 Go)</p>
          <p className="mt-1 text-ink-soft">
            L&apos;import s&apos;est arrêté tout de suite plutôt que de faire échouer chaque photo
            restante une par une. Réessayez après minuit (heure de reset du quota) — les photos
            non importées restent listées ci-dessous, prêtes à renvoyer.
          </p>
        </div>
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
              <div className="flex items-center justify-between gap-2">
                <p className="text-danger">Échec pour :</p>
                {!pending && !state.capExceeded && (
                  <button
                    type="button"
                    onClick={handleRetryFailed}
                    className="shrink-0 rounded-md border border-border px-3 py-1 text-xs font-medium text-ink transition-colors hover:border-ink"
                  >
                    Réessayer {state.unmatched.length > 1 ? `les ${state.unmatched.length}` : ""}
                  </button>
                )}
              </div>
              <ul className="mt-1 list-disc pl-5 text-ink-soft">
                {state.unmatched.map((failure) => (
                  <li key={failure.filename}>
                    {failure.filename} — <span className="text-danger">{failure.reason}</span>
                  </li>
                ))}
              </ul>
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
