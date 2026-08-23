"use client";

import { useActionState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { login } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm text-ink-soft">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="rounded-md border border-border bg-paper px-3 py-2.5 text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent-tint"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm text-ink-soft">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-md border border-border bg-paper px-3 py-2.5 text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent-tint"
        />
      </div>

      <AnimatePresence>
        {state?.error && (
          <motion.p
            role="alert"
            className="text-sm text-danger"
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            {state.error}
          </motion.p>
        )}
      </AnimatePresence>

      <motion.button
        type="submit"
        disabled={pending}
        whileHover={pending ? undefined : { scale: 1.03, y: -2 }}
        whileTap={pending ? undefined : { scale: 0.97 }}
        className="mt-2 inline-flex items-center justify-center rounded-md bg-accent px-6 py-3 text-sm font-medium text-paper shadow-sm hover:shadow-md disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
      >
        {pending ? "Connexion…" : "Se connecter"}
      </motion.button>
    </form>
  );
}
