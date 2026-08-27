import { PaymentStep } from "./payment-step";

// Écran affiché quand une galerie est en PAYMENT_PENDING sur un
// chargement de page classique (pas juste immédiatement après avoir
// confirmé sa sélection) — le chemin "je reviens plus tard finaliser mon
// paiement" (retour d'Enzo, 2026-08-28). Même habillage que
// `waiting-view.tsx`, mais interactif : rend le même `PaymentStep` que la
// modale de confirmation, donc la même logique (réutilisation du
// PaymentIntent, jamais de statut changé côté client) s'applique ici
// aussi, sans duplication.
export function PaymentView({
  gallerySlug,
  galleryTitle,
}: {
  gallerySlug: string;
  galleryTitle: string;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <div>
        <p className="text-sm tracking-wide text-muted uppercase">{galleryTitle}</p>
        <h1 className="font-serif text-2xl font-semibold text-ink">Finaliser mon paiement</h1>
        <p className="mt-2 text-ink-soft">
          Ta sélection est confirmée — il ne reste que le règlement pour lancer la retouche.
        </p>
      </div>
      <div className="w-full text-left">
        <PaymentStep gallerySlug={gallerySlug} />
      </div>
    </main>
  );
}
