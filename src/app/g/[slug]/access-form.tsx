"use client";

import { useActionState } from "react";
import { unlockGalleryAction } from "./actions";

export function AccessForm({ gallerySlug, galleryTitle }: { gallerySlug: string; galleryTitle: string }) {
  const boundAction = unlockGalleryAction.bind(null, gallerySlug);
  const [state, formAction, pending] = useActionState(boundAction, undefined);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-8 px-6 py-24">
      <div className="flex flex-col gap-2">
        <p className="text-sm tracking-wide text-muted uppercase">Accès galerie</p>
        <h1 className="font-serif text-3xl text-ink">{galleryTitle}</h1>
        <p className="text-ink-soft">
          Saisissez le code transmis pour retrouver votre galerie.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="code" className="text-sm text-ink-soft">
            Code d&apos;accès
          </label>
          <input
            id="code"
            name="code"
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            required
            className="rounded-md border border-border bg-paper px-3 py-2.5 text-center font-mono text-lg tracking-widest text-ink outline-none focus:border-ink"
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
          className="inline-flex items-center justify-center rounded-md bg-accent px-6 py-3 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Vérification…" : "Accéder à ma galerie"}
        </button>
      </form>
    </main>
  );
}
