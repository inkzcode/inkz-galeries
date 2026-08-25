import { verifySession } from "@/lib/auth/dal";
import { listPortfolioItemsAdmin } from "@/lib/services/portfolio-item-service";
import { getStorageAdapter } from "@/lib/storage/client";
import { PortfolioUploadForm } from "./portfolio-upload-form";
import { PortfolioItemList } from "./portfolio-item-list";
import { BackLink } from "../../back-link";

// Gestion des éléments de portfolio autonomes (brief §1, retour d'Enzo
// 2026-08-25 : "un bouton dans l'espace photographe où je peux ajouter
// des trucs dans mon portfolio sans passer par inkz.fr ni par un
// shooting quelconque"). Les shootings publiés au portfolio (voir
// admin/galleries/[id]/portfolio-cover-picker.tsx) restent gérés depuis
// leur propre page — celle-ci ne concerne que ce qui n'a jamais été un
// shooting.
export default async function AdminPortfolioPage() {
  await verifySession();

  const items = await listPortfolioItemsAdmin();
  const storage = getStorageAdapter();
  const rows = await Promise.all(
    items.map(async (item) => ({
      id: item.id,
      title: item.title,
      category: item.category,
      imageUrl: await storage.getPreviewUrl(item.imageKey),
    })),
  );

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <BackLink href="/admin" label="Retour aux shootings" />
      <h1 className="mt-4 font-serif text-3xl font-bold text-ink">Portfolio</h1>
      <p className="mt-2 text-ink-soft">
        Ajoute directement une image au portfolio public — indépendant des shootings clients.
      </p>

      <div className="mt-8 max-w-xl">
        <PortfolioUploadForm />
      </div>

      <div className="mt-12 border-t border-border pt-8">
        {rows.length === 0 ? (
          <p className="text-sm text-muted">Rien pour l&apos;instant.</p>
        ) : (
          <PortfolioItemList items={rows} />
        )}
      </div>
    </main>
  );
}
