"use client";

import { useState, useTransition } from "react";
import { motion } from "motion/react";
import {
  addPhotoNoteAction,
  updatePhotoNoteAction,
  deletePhotoNoteAction,
} from "./photo-note-actions";
import type { PublicGalleryNote } from "@/lib/services/public-gallery-service";
import type { DraftNote } from "./drawing-overlay";
import { HeartButton } from "./heart-button";
import { SendBurst } from "./send-burst";

// Panneau latéral de remarques (retour d'Enzo, 2026-08-22 : "à droite il
// devrait y avoir une fenêtre où on peut écrire des trucs plutôt qu'une
// toute petite barre en bas où on peut faire que un par un"). Remplace
// l'ancien photo-note-form.tsx (un tracé = un envoi immédiat).
//
// Trois idées distinctes rassemblées ici :
// 1. Plusieurs tracés/remarques peuvent s'accumuler avant un envoi groupé
//    ("je veux [...] dire plusieurs trucs d'un coup sans avoir à envoyer
//    à chaque fois").
// 2. Les remarques déjà envoyées restent modifiables ("je veux pouvoir
//    modifier ce que j'ai mis") — texte seulement, le tracé ne bouge pas.
// 3. Le message sur l'image de soi reste affiché tout en haut de CE
//    panneau ("je voudrais [...] que les conseils [...] se trouvent dans
//    la fenêtre de droite tout en haut") — la philosophie de retouche,
//    elle, s'affiche désormais avant la galerie (voir raw-disclaimer.tsx,
//    2026-08-25) : "au moment d'annoter" (ici) est un moment différent
//    de "avant de découvrir les photos" (là-bas).
export function PhotoNotesPanel({
  gallerySlug,
  photoId,
  notes,
  drafts,
  onDraftMessageChange,
  onDraftDiscard,
  onDraftsSaved,
  tips,
  selected,
  locked,
  onToggleSelected,
}: {
  gallerySlug: string;
  photoId: string;
  notes: PublicGalleryNote[];
  drafts: DraftNote[];
  onDraftMessageChange: (draftId: string, message: string) => void;
  onDraftDiscard: (draftId: string) => void;
  onDraftsSaved: (savedDraftIds: string[]) => void;
  tips?: { selfImageMessage?: string | null };
  /** Retour d'Enzo, 2026-08-25 : "je veux [...] pouvoir aussi mettre un
   * cœur sur la photo [...] et que ça mette à jour [...] la galerie en
   * mode grille" — même état/action que le cœur de la grille
   * (gallery-view.tsx), affiché ici en plus pour ne pas avoir à fermer
   * la photo pour la sélectionner. */
  selected: boolean;
  locked: boolean;
  onToggleSelected: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [editedMessages, setEditedMessages] = useState<Record<string, string>>({});
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  // Incrémenté à chaque envoi réussi — voir send-burst.tsx, rejoue
  // l'animation "s'en va vers le photographe" sans logique show/hide ici.
  const [sendTriggerKey, setSendTriggerKey] = useState(0);

  const dirtyEntries = Object.entries(editedMessages).filter(
    ([noteId, message]) => message !== (notes.find((n) => n.id === noteId)?.message ?? ""),
  );
  const hasEmptyDraft = drafts.some((draft) => !draft.message.trim());
  const hasEmptyEdit = dirtyEntries.some(([, message]) => !message.trim());
  const hasChanges = drafts.length > 0 || dirtyEntries.length > 0;
  const canSave = hasChanges && !hasEmptyDraft && !hasEmptyEdit;

  function handleSave() {
    if (!canSave) {
      setTouched(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      const savedDraftIds: string[] = [];
      for (const draft of drafts) {
        const result = await addPhotoNoteAction(gallerySlug, photoId, {
          message: draft.message.trim(),
          drawingPath: draft.points,
          color: draft.color,
        });
        if (result.success) savedDraftIds.push(draft.id);
        else setError(result.error ?? "Une erreur est survenue.");
      }

      const savedEditIds: string[] = [];
      for (const [noteId, message] of dirtyEntries) {
        const result = await updatePhotoNoteAction(gallerySlug, noteId, message.trim());
        if (result.success) savedEditIds.push(noteId);
        else setError(result.error ?? "Une erreur est survenue.");
      }

      if (savedDraftIds.length > 0) onDraftsSaved(savedDraftIds);
      if (savedEditIds.length > 0) {
        setEditedMessages((prev) => {
          const next = { ...prev };
          savedEditIds.forEach((id) => delete next[id]);
          return next;
        });
      }
      if (savedDraftIds.length > 0 || savedEditIds.length > 0) {
        setSendTriggerKey((key) => key + 1);
      }
      setTouched(false);
    });
  }

  function handleDeleteSaved(noteId: string) {
    setDeletingIds((prev) => new Set(prev).add(noteId));
    startTransition(async () => {
      const result = await deletePhotoNoteAction(gallerySlug, noteId);
      if (!result.success) setError(result.error ?? "Une erreur est survenue.");
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(noteId);
        return next;
      });
    });
  }

  const hasTips = tips?.selfImageMessage;
  const isEmpty = notes.length === 0 && drafts.length === 0;

  return (
    <div className="flex h-full flex-col text-paper">
      <div className="shrink-0 border-b border-paper/10 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-paper">Cette photo</span>
          <HeartButton selected={selected} locked={locked} onToggle={onToggleSelected} variant="panel" />
        </div>
        {hasTips && (
          <p className="mt-3 text-xs leading-relaxed text-paper/70">{tips!.selfImageMessage}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-3 text-xs leading-relaxed text-paper/60">
          <p className="font-medium text-paper/80">Un détail vous gêne ?</p>
          <p className="mt-1">
            Entourez-le directement sur la photo et laissez-moi une petite note : une
            mèche, un bouton, un pli, une imperfection, un élément du décor…
          </p>
          <p className="mt-1">
            Je peux corriger ou atténuer ces petits détails pendant la retouche. En
            revanche, je ne modifierai jamais votre morphologie ou les traits qui font
            de vous vous.
          </p>
        </div>

        {isEmpty && (
          <p className="text-xs text-paper/40">Aucune remarque sur cette photo pour l&apos;instant.</p>
        )}

        <div className="flex flex-col gap-3">
          {notes.map((note) => {
            const value = editedMessages[note.id] ?? note.message;
            const dirty = value !== note.message;
            const isDeleting = deletingIds.has(note.id);
            return (
              <div
                key={note.id}
                className={`rounded-md border border-paper/15 bg-paper/5 p-2.5 ${isDeleting ? "opacity-40" : ""}`}
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: note.color ?? "#e63946" }}
                  />
                  <span className="text-[11px] text-paper/50">
                    {dirty && !isDeleting ? "Modifié, pas encore enregistré" : "Envoyée"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteSaved(note.id)}
                    disabled={isDeleting}
                    aria-label="Supprimer cette remarque"
                    className="ml-auto text-xs text-paper/40 hover:text-paper/80"
                  >
                    Supprimer
                  </button>
                </div>
                <textarea
                  value={value}
                  disabled={isDeleting}
                  onChange={(event) =>
                    setEditedMessages((prev) => ({ ...prev, [note.id]: event.target.value }))
                  }
                  rows={2}
                  className="w-full resize-none rounded-md border border-paper/20 bg-paper/10 px-2.5 py-1.5 text-sm text-paper outline-none focus:border-paper/50"
                />
                {touched && dirty && !value.trim() && (
                  <p className="mt-1 text-[11px] text-danger">
                    Vide — supprimez la remarque plutôt que de la laisser vide.
                  </p>
                )}
              </div>
            );
          })}

          {drafts.map((draft) => (
            <div key={draft.id} className="rounded-md border border-paper/25 bg-paper/10 p-2.5">
              <div className="mb-1.5 flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: draft.color }}
                />
                <span className="text-[11px] text-paper/50">Pas encore envoyée</span>
                <button
                  type="button"
                  onClick={() => onDraftDiscard(draft.id)}
                  aria-label="Annuler ce tracé"
                  className="ml-auto text-xs text-paper/40 hover:text-paper/80"
                >
                  Annuler
                </button>
              </div>
              <textarea
                value={draft.message}
                onChange={(event) => onDraftMessageChange(draft.id, event.target.value)}
                rows={2}
                autoFocus
                placeholder="Ex. retirer le bouton sur la joue"
                className="w-full resize-none rounded-md border border-paper/30 bg-paper/10 px-2.5 py-1.5 text-sm text-paper placeholder:text-paper/40 outline-none focus:border-paper/60"
              />
              {touched && !draft.message.trim() && (
                <p className="mt-1 text-[11px] text-danger">Ajoutez un message avant d&apos;envoyer.</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="relative shrink-0 border-t border-paper/10 p-4">
        {error && <p className="mb-2 text-xs text-danger">{error}</p>}
        <motion.button
          type="button"
          onClick={handleSave}
          disabled={pending || !hasChanges}
          whileHover={pending || !hasChanges ? undefined : { scale: 1.02 }}
          whileTap={pending || !hasChanges ? undefined : { scale: 0.97 }}
          className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-paper shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-paper/15 disabled:opacity-40"
        >
          {pending ? "Enregistrement…" : "Enregistrer mes remarques"}
        </motion.button>
        <SendBurst triggerKey={sendTriggerKey} />
      </div>
    </div>
  );
}
