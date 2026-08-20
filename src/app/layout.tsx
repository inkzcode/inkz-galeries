import type { Metadata } from "next";
import "./globals.css";

// Direction typographique TEMPORAIRE (voir PROJECT_CONTEXT.md).
// V1 : piles de polices système uniquement (--font-sans-fallback /
// --font-serif-fallback dans globals.css), pour ne dépendre d'aucun accès
// réseau externe et ne pas figer une identité visuelle définitive trop tôt.
// Pour brancher une vraie police (Google Fonts ou auto-hébergée) plus
// tard : réintroduire `next/font/google` ou `next/font/local` ici et
// définir les variables `--font-sans-app`/`--font-serif-app` en résultent
// — aucun autre fichier n'a besoin de changer.

export const metadata: Metadata = {
  title: "Galeries — espace photographe",
  description:
    "Plateforme personnelle de galeries clients : sélection, retouche et livraison des photographies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
