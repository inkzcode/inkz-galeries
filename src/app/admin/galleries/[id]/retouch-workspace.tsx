"use client";

import { useRef, useState, useTransition } from "react";
import { motion, type Variants } from "motion/react";
import { uploadFinalsDirectlyBatch, type UploadFailure } from "./direct-final-upload";
import { FinalUploadForm } from "./final-upload-form";

export type RetouchPhoto = {
  id: string;
  filename: string;
  previewUrl: string | null;
  finalReadyAt: Date | null;
  notes: {
    id: string;
    message: string;
    color: string | null;
    positionX: number | null;
    positionY: number | null;
  }[];
};

const EASE = [0.2, 0.7, 0.3, 1] as const;
const grid: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const card: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

// Vue unifiée de l'étape "à retoucher" (brief §18) — remplace la liste
// texte photo par photo + la section "Demandes de retouche" séparée
// (retour d'Enzo, 2026-08-22 : "beaucoup d'info inutile et pas assez de
// logique et concrète"). Une carte par photo sélectionnée : vignette,
// statut, remarque du client directement dessus (plus besoin de recouper
// deux listes pour savoir quelle photo a quelle remarque). Import groupé
// par glisser-déposer en priorité ; import manuel par photo conservé en
// repli discret (`<details>`) pour les cas non reconnus par nom de
// fichier.
export function RetouchWorkspace({
  galleryId,
  photos,
}: {
  galleryId: string;
  photos: RetouchPhoto[];
}) {
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [state, setState] = useState<{ matched: number; unmatched: UploadFailure[] } | undefined>(
    undefined,
  );
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const doneCount = photos.filter((p) => p.finalReadyAt).length;
  const total = photos.length;

  function submitFiles(files: FileList) {
    if (files.length === 0) return;
    const fileArray = Array.from(files);
    const candidates = photos.map((p) => ({ id: p.id, filename: p.filename }));
    setPending(true);
    setProgress({ done: 0, total: fileArray.length });
    startTransition(async () => {
      const result = await uploadFinalsDirectlyBatch(galleryId, candidates, fileArray, (done, t) =>
        setProgress({ done, total: t }),
      );
      setState(result);
      setPending(false);
      setProgress(null);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          <span className="font-serif text-2xl font-bold text-ink">{doneCount}</span> sur {total}{" "}
          final{total > 1 ? "aux" : ""} importé{doneCount > 1 ? "s" : ""}
        </p>
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-border">
          <motion.div
            className="h-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: total > 0 ? `${(doneCount / total) * 100}%` : "0%" }}
            transition={{ duration: 0.5, ease: EASE }}
          />
        </div>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          submitFiles(event.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragOver ? "border-accent bg-accent-tint" : "border-border hover:border-ink"
        }`}
      >
        <p className="text-sm font-medium text-ink">
          {pending
            ? progress
              ? `Import en cours… ${progress.done}/${progress.total}`
              : "Import en cours…"
            : "Déposez ici tous vos fichiers retouchés"}
        </p>
        <p className="text-xs text-muted">
          Reconnus automatiquement par nom de fichier — ou cliquez pour parcourir.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            if (event.target.files) submitFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {state && (state.matched > 0 || state.unmatched.length > 0) && (
        <div className="rounded-md border border-border bg-surface p-4 text-sm">
          {state.matched > 0 && (
            <p className="text-success">
              {state.matched} fichier{state.matched > 1 ? "s" : ""} importé
              {state.matched > 1 ? "s" : ""}.
            </p>
          )}
          {state.unmatched.length > 0 && (
            <div className={state.matched > 0 ? "mt-2" : undefined}>
              <p className="text-danger">Échec pour :</p>
              <ul className="mt-1 list-disc pl-5 text-ink-soft">
                {state.unmatched.map((failure) => (
                  <li key={failure.filename}>
                    {failure.filename} — <span className="text-danger">{failure.reason}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-muted">
                Utilisez l&apos;import manuel sur la bonne carte ci-dessous.
              </p>
            </div>
          )}
        </div>
      )}

      <motion.div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        variants={grid}
        initial="hidden"
        animate="show"
      >
        {photos.map((photo) => (
          <motion.div
            key={photo.id}
            variants={card}
            className="overflow-hidden rounded-lg border border-border bg-paper"
          >
            <div className="relative aspect-[3/2] w-full bg-surface">
              {photo.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL de preview signée/locale, voir storage/README.md.
                <img
                  src={photo.previewUrl}
                  alt={photo.filename}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted">
                  Pas d&apos;aperçu
                </div>
              )}
              <span
                className={`absolute top-2 right-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                  photo.finalReadyAt ? "bg-accent text-paper" : "bg-paper/90 text-ink-soft"
                }`}
              >
                {photo.finalReadyAt ? "Importé ✓" : "En attente"}
              </span>
            </div>
            <div className="flex flex-col gap-2 p-3">
              <p className="truncate text-xs text-muted">{photo.filename}</p>

              {photo.notes.map((note) => (
                <p
                  key={note.id}
                  className="flex items-start gap-1.5 rounded-md bg-accent-tint px-2 py-1.5 text-xs text-ink-soft"
                >
                  <span
                    aria-hidden
                    className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: note.color ?? "#e63946" }}
                  />
                  <span>
                    {note.message}
                    {note.positionX !== null && note.positionY !== null && (
                      <>
                        {" "}
                        · 📍 {Math.round(note.positionX * 100)}%, {Math.round(note.positionY * 100)}%
                      </>
                    )}
                  </span>
                </p>
              ))}

              <details className="text-xs">
                <summary className="cursor-pointer text-muted hover:text-ink">
                  Import manuel
                </summary>
                <div className="mt-2">
                  <FinalUploadForm
                    galleryId={galleryId}
                    photoId={photo.id}
                    alreadyImported={photo.finalReadyAt !== null}
                  />
                </div>
              </details>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
