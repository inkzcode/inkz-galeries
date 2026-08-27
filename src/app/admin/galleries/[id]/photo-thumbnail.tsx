"use client";

import { useState } from "react";

// Miniature avec vraie gestion d'erreur (retour d'Enzo, 2026-08-27 :
// "quand des images marchent pas affiche l'erreur et me dis de
// réessayer, je veux que ce message d'erreur ne s'enlève jamais tant
// que j'ai pas relancé et que les images sont bien importées") — jusque-
// là, une image dont l'URL existe mais qui échoue au CHARGEMENT (pas au
// niveau base de données, juste un `<img>` qui ne charge pas — cap B2
// dépassé, incohérence de lecture après écriture...) affichait
// simplement une icône d'image cassée, sans explication ni moyen d'agir.
//
// `key={retryToken}` force un vrai nouveau `<img>` au clic sur
// "Réessayer" (donc une vraie nouvelle requête réseau) — jamais de
// paramètre ajouté à l'URL elle-même, qui casserait la signature d'une
// URL présignée S3/B2. L'état d'erreur ne disparaît QUE si ce nouvel
// essai charge réellement (onLoad) ; un nouvel échec (onError) le
// réaffiche aussitôt.
export function PhotoThumbnail({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  if (failed) {
    return (
      <div className="flex aspect-[3/2] w-full flex-col items-center justify-center gap-1.5 bg-danger/5 px-2 text-center">
        <p className="text-xs font-medium text-danger">Aperçu indisponible</p>
        <button
          type="button"
          onClick={() => {
            setFailed(false);
            setRetryToken((token) => token + 1);
          }}
          className="rounded-md border border-danger px-2 py-1 text-xs text-danger transition-colors hover:bg-danger/10"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- URL de preview signée/locale, voir storage/README.md
    <img
      key={retryToken}
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="aspect-[3/2] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
    />
  );
}
