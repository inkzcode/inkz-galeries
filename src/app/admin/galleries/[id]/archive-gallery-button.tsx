"use client";

import { useTransition } from "react";
import { archiveGalleryAction, unarchiveGalleryAction } from "../actions";

// Archivage (brief §32) — purement organisationnel et réversible
// (contrairement à la suppression, voir delete-gallery-button.tsx) : pas
// de confirmation lourde, juste un bouton qui bascule.
export function ArchiveGalleryButton({
  galleryId,
  archived,
}: {
  galleryId: string;
  archived: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await (archived ? unarchiveGalleryAction(galleryId) : archiveGalleryAction(galleryId));
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="text-xs text-muted underline decoration-border underline-offset-2 hover:text-ink disabled:opacity-60"
    >
      {pending
        ? "…"
        : archived
          ? "Désarchiver ce shooting"
          : "Archiver ce shooting"}
    </button>
  );
}
