"use client";

// Error boundary pour /g/* (voir src/app/admin/error.tsx pour l'équivalent
// admin). Message volontairement générique et rassurant côté client — pas
// de détail technique (pourrait exposer une chaîne de connexion ou autre
// détail d'infrastructure), cohérent avec le ton bienveillant voulu pour
// cette partie du site (brief §6/§8).
export default function GalleryError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-4 px-6 py-24 text-center">
      <p className="text-sm tracking-wide text-muted uppercase">
        Un instant
      </p>
      <h1 className="font-serif text-2xl font-semibold text-ink">
        Quelque chose s&apos;est mal passé
      </h1>
      <p className="text-ink-soft">
        Réessayez dans un instant. Si le problème persiste, contactez
        directement votre photographe.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mx-auto inline-flex w-fit items-center justify-center rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
      >
        Réessayer
      </button>
    </main>
  );
}
