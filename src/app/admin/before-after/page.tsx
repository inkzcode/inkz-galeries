import { verifySession } from "@/lib/auth/dal";
import { listBeforeAfterExamplesAdmin } from "@/lib/services/before-after-service";
import { getStorageAdapter } from "@/lib/storage/client";
import { BeforeAfterUploadForm } from "./before-after-upload-form";
import { BeforeAfterExampleList } from "./before-after-example-list";
import { BackLink } from "../../back-link";

// Vitrine avant/après publique (retour d'Enzo, 2026-08-29) — même principe
// que /admin/portfolio : des paires autonomes, indépendantes de tout
// shooting, gérées depuis leur propre page.
export default async function AdminBeforeAfterPage() {
  await verifySession();

  const examples = await listBeforeAfterExamplesAdmin();
  const storage = getStorageAdapter();
  const rows = await Promise.all(
    examples.map(async (example) => ({
      id: example.id,
      beforeUrl: await storage.getPreviewUrl(example.beforeKey),
      afterUrl: await storage.getPreviewUrl(example.afterKey),
      caption: example.caption,
    })),
  );

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <BackLink href="/admin" label="Retour aux shootings" />
      <h1 className="mt-4 font-serif text-3xl font-bold text-ink">Avant / après</h1>
      <p className="mt-2 text-ink-soft">
        Ajoute des paires de photos avant/après retouche pour la vitrine publique (page
        d&apos;accueil et portfolio) — indépendant des shootings clients.
      </p>

      <div className="mt-8 max-w-xl">
        <BeforeAfterUploadForm />
      </div>

      <div className="mt-12 border-t border-border pt-8">
        {rows.length === 0 ? (
          <p className="text-sm text-muted">Rien pour l&apos;instant.</p>
        ) : (
          <BeforeAfterExampleList items={rows} />
        )}
      </div>
    </main>
  );
}
