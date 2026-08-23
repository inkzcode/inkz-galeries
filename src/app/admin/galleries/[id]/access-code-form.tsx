"use client";

import { useActionState } from "react";
import { issueAccessCodeAction } from "./access-code-actions";

export function AccessCodeForm({ galleryId }: { galleryId: string }) {
  const boundAction = issueAccessCodeAction.bind(null, galleryId);
  const [state, formAction, pending] = useActionState(boundAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-fit items-center justify-center rounded-md border border-ink px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-60"
      >
        {pending ? "Génération…" : "Générer un nouveau code d'accès"}
      </button>

      {state?.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      {state?.plaintextCode && (
        <div className="rounded-md border border-accent bg-surface p-4">
          <p className="text-sm text-ink-soft">
            Code généré — à transmettre au client maintenant, il ne sera
            plus jamais réaffiché ensuite (seul un condensé est conservé).
          </p>
          <p className="mt-2 font-mono text-2xl tracking-widest text-ink">
            {state.plaintextCode}
          </p>
        </div>
      )}
    </form>
  );
}
