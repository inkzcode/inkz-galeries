import Link from "next/link";
import { listPortfolioEntries } from "@/lib/services/portfolio-service";
import { BackLink } from "../back-link";

export const metadata = {
  title: "Portfolio",
};

// Rendue à la demande, jamais figée au build (voir
// route-segment-config/index.md) : sans ça, Next essaierait de la
// pré-générer statiquement — un nouveau shooting publié depuis l'admin
// n'apparaîtrait alors qu'au prochain déploiement, pas immédiatement.
export const dynamic = "force-dynamic";

// Page publique (brief §1) — aucune authentification, contrairement à
// /g/[slug] (galeries clients). Chaque shooting affiché ici a été
// explicitement publié par Enzo (Gallery.portfolioEnabled +
// portfolioCoverPhotoId, voir portfolio-service.ts) : ce n'est jamais le
// cas par défaut.
export default async function PortfolioPage() {
  const entries = await listPortfolioEntries();

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 sm:px-10">
      <BackLink href="/" label="Accueil" />

      <h1 className="mt-4 font-serif text-3xl text-ink sm:text-4xl">Portfolio</h1>
      <p className="mt-2 max-w-xl text-ink-soft">
        Une sélection de séances passées, classées par shooting.
      </p>

      {entries.length === 0 ? (
        <p className="mt-16 text-sm text-muted">
          Aucun shooting publié pour l&apos;instant — revenez bientôt.
        </p>
      ) : (
        <div className="mt-10 columns-1 gap-4 sm:columns-2 lg:columns-3">
          {entries.map((entry) => (
            <div
              key={entry.slug}
              className="group relative mb-4 break-inside-avoid overflow-hidden rounded-md bg-surface"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- URL de preview signée/locale, voir storage/README.md */}
              <img
                src={entry.coverUrl}
                alt={entry.title}
                className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.015]"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent px-4 pt-10 pb-3">
                <p className="font-serif text-lg text-paper">{entry.title}</p>
                {entry.shootingType && (
                  <p className="text-xs tracking-wide text-paper/70 uppercase">
                    {entry.shootingType}
                  </p>
                )}
                {entry.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-paper/85">{entry.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-16 border-t border-border pt-8 text-center">
        <Link
          href="/g"
          className="text-sm text-muted underline decoration-border underline-offset-2 hover:text-ink"
        >
          Vous avez une galerie privée ? Accédez-y ici
        </Link>
      </div>
    </main>
  );
}
