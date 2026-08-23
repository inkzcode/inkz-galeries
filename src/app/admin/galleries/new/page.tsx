import { verifySession } from "@/lib/auth/dal";
import { GalleryForm } from "../gallery-form";
import { createGalleryAction } from "../actions";
import { BackLink } from "../../../back-link";

export default async function NewGalleryPage() {
  await verifySession();

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <BackLink href="/admin" label="Retour aux shootings" />
      <h1 className="mt-4 font-serif text-3xl text-ink">Nouveau shooting</h1>
      <p className="mt-2 text-ink-soft">
        Seul le titre est requis — le reste peut être complété maintenant ou
        plus tard.
      </p>
      <div className="mt-10">
        <GalleryForm action={createGalleryAction} submitLabel="Créer le shooting" />
      </div>
    </main>
  );
}
