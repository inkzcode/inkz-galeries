"use client";

import { useActionState } from "react";
import { motion } from "motion/react";
import { issueAccessCodeAction } from "./access-code-actions";

export function AccessCodeForm({ galleryId }: { galleryId: string }) {
  const boundAction = issueAccessCodeAction.bind(null, galleryId);
  const [state, formAction, pending] = useActionState(boundAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-xs text-muted">
        Expiration (optionnel)
        <input
          type="date"
          name="expiresAt"
          min={new Date().toISOString().slice(0, 10)}
          className="w-fit rounded-md border border-border bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        />
      </label>

      <motion.button
        type="submit"
        disabled={pending}
        whileHover={pending ? undefined : { scale: 1.03, y: -1 }}
        whileTap={pending ? undefined : { scale: 0.97 }}
        className="inline-flex w-fit items-center justify-center rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-paper shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Génération…" : "Générer un nouveau code d'accès"}
      </motion.button>

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
