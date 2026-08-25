"use client";

// Error boundary pour toute la section /admin (convention Next.js —
// error.tsx doit être un Client Component). Attrape par exemple les échecs
// de connexion à la base (DATABASE_URL absent/invalide) au lieu de laisser
// remonter la page d'erreur générique de Next. N'affiche jamais le détail
// technique de l'erreur (pourrait contenir une chaîne de connexion) — juste
// un message et un bouton pour réessayer.
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-4 px-6 py-24">
      <p className="text-sm tracking-wide text-muted uppercase">
        Espace photographe
      </p>
      <h1 className="font-serif text-3xl font-bold text-ink">Une erreur est survenue</h1>
      <p className="text-ink-soft">
        La base de données n&apos;a pas répondu à temps — sur l&apos;offre
        gratuite Neon, le compute se met en veille après une période
        d&apos;inactivité et met quelques secondes à se réveiller. Réessayez ;
        si ça persiste, vérifier <code>DATABASE_URL</code> dans{" "}
        <code>.env.local</code> (voir PROJECT_CONTEXT.md).
      </p>
      {error.digest && (
        <p className="text-xs text-muted">Référence : {error.digest}</p>
      )}
      <button
        type="button"
        onClick={reset}
        className="inline-flex w-fit items-center justify-center rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
      >
        Réessayer
      </button>
    </main>
  );
}
