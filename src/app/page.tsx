import { listPortfolioEntries } from "@/lib/services/portfolio-service";
import { HomeIntro } from "./home-intro";
import { PortfolioGrid } from "./portfolio-grid";
import { HomeFooter } from "./home-footer";

// Rendue à la demande, pas figée au build (même raisonnement que
// /portfolio/page.tsx) — sinon un nouveau shooting publié depuis l'admin
// n'apparaîtrait qu'au prochain déploiement, pas immédiatement.
export const dynamic = "force-dynamic";

// Server Component (retour d'Enzo, 2026-08-25 : "je ne veux pas que le
// portfolio soit simplement un petit mot en bas de la page, je veux une
// vraie galerie à grille sous le comment ça marche") — la page d'accueil
// devient async pour aller chercher le portfolio public directement ici,
// plutôt que de le cacher derrière un lien vers une page séparée. Le hero
// animé (hors de portée d'un Server Component, motion exige "use client")
// reste dans home-intro.tsx.
export default async function Home() {
  const portfolioEntries = await listPortfolioEntries();

  return (
    <main className="relative overflow-hidden">
      <HomeIntro />

      <section className="relative border-t border-border px-6 py-20 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm tracking-wide text-muted uppercase">Portfolio</p>
          <h2 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">Séances passées</h2>

          {portfolioEntries.length === 0 ? (
            <p className="mt-10 text-sm text-muted">
              Aucun shooting publié pour l&apos;instant — revenez bientôt.
            </p>
          ) : (
            <div className="mt-10">
              <PortfolioGrid entries={portfolioEntries} />
            </div>
          )}
        </div>
      </section>

      <HomeFooter />
    </main>
  );
}
