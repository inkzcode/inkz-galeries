import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-10 px-6 py-24 sm:px-10">
      <p className="text-sm tracking-wide text-muted uppercase">
        Fondations du projet — direction visuelle temporaire
      </p>

      <h1 className="font-serif text-4xl leading-tight text-ink sm:text-5xl">
        Un espace pour découvrir, choisir et recevoir vos photographies.
      </h1>

      <p className="max-w-xl text-lg leading-relaxed text-ink-soft">
        Cette page est un point de départ, pas encore l&apos;identité
        définitive du site. Chaque séance donnera lieu à une galerie privée,
        accessible avec un code, dans laquelle vous pourrez parcourir vos
        photographies, faire votre sélection et suivre l&apos;avancement de
        la retouche.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/g"
          className="inline-flex items-center justify-center rounded-md bg-ink px-6 py-3 text-sm font-medium text-paper transition-opacity hover:opacity-90"
        >
          Accéder à ma galerie
        </Link>
        <Link
          href="/admin"
          className="inline-flex items-center justify-center rounded-md border border-border px-6 py-3 text-sm font-medium text-ink-soft transition-colors hover:border-ink"
        >
          Espace photographe
        </Link>
      </div>
    </main>
  );
}
