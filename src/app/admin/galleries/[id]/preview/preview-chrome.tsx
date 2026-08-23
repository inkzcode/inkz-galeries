"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { grantPreviewAccessAction } from "./preview-actions";

const REFRESH_INTERVAL_MS = 4000;

// Bandeau + rafraîchissement automatique de l'aperçu client (retour
// d'Enzo : "ça doit être mis à jour en direct [...] à chaque fois que je
// modifie un truc"). Pas d'infrastructure temps réel (WebSocket, etc.) —
// disproportionné pour un outil mono-photographe à faible trafic ; un
// simple `router.refresh()` périodique relance le Server Component avec
// des données fraîches, ce qui donne l'effet "en direct" recherché sans
// rien à héberger de plus.
export function PreviewChrome({ galleryAdminId }: { galleryAdminId: string }) {
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    grantPreviewAccessAction(galleryAdminId);
  }, [galleryAdminId]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      router.refresh();
    }, REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [router]);

  return (
    <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-accent bg-accent-tint px-4 py-2.5 text-sm sm:px-6">
      <span className="text-ink">
        Aperçu — point de vue client (actions réelles : sélection, remarques…)
      </span>
      <Link
        href={`/admin/galleries/${galleryAdminId}`}
        className="shrink-0 font-medium text-ink underline decoration-ink/40 underline-offset-2 hover:decoration-ink"
      >
        Fermer l&apos;aperçu
      </Link>
    </div>
  );
}
