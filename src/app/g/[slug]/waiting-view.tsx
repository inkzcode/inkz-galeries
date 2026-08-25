// Étape 2 du parcours (brief §18) : sélection confirmée, en attente de la
// post-production. Pas d'interactivité, Server Component simple.
export function WaitingView({ galleryTitle }: { galleryTitle: string }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-3 px-6 py-24 text-center">
      <p className="text-sm tracking-wide text-muted uppercase">{galleryTitle}</p>
      <h1 className="font-serif text-2xl font-semibold text-ink">
        Merci, j&apos;ai bien reçu ta sélection.
      </h1>
      <p className="text-ink-soft">Je m&apos;occupe de la suite — reviens bientôt.</p>
    </main>
  );
}
