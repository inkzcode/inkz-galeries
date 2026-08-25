import Link from "next/link";
import { verifySession } from "@/lib/auth/dal";
import { listGalleries, listArchivedGalleries } from "@/lib/services/gallery-service";
import { GalleryList } from "./gallery-list";

export default async function AdminDashboard() {
  await verifySession();
  const [galleries, archivedGalleries] = await Promise.all([
    listGalleries(),
    listArchivedGalleries(),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-3xl text-ink">Shootings</h1>
        <Link
          href="/admin/galleries/new"
          className="inline-flex items-center justify-center rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-paper shadow-sm hover:-translate-y-0.5 hover:shadow-md"
        >
          Nouveau shooting
        </Link>
      </div>

      {galleries.length === 0 ? (
        <p className="mt-16 text-ink-soft">
          Aucun shooting pour l&apos;instant. Créez-en un pour commencer.
        </p>
      ) : (
        <GalleryList galleries={galleries} />
      )}

      {/* Archivés (brief §32) — repliés par défaut, hors de la liste
          principale : c'est tout leur intérêt, désencombrer ce tableau de
          bord des vieux shootings déjà livrés depuis longtemps. */}
      {archivedGalleries.length > 0 && (
        <details className="mt-10 rounded-md border border-border">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ink">
            Archivés ({archivedGalleries.length})
          </summary>
          <div className="border-t border-border px-4 py-2">
            <GalleryList galleries={archivedGalleries} />
          </div>
        </details>
      )}
    </main>
  );
}
