import Link from "next/link";
import { listPortfolioEntries } from "@/lib/services/portfolio-service";
import { PortfolioGrid } from "../portfolio-grid";
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
// cas par défaut. Lien direct partageable — la même grille est aussi
// intégrée directement sur la page d'accueil (voir page.tsx).
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
        <div className="mt-10">
          <PortfolioGrid entries={entries} />
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
