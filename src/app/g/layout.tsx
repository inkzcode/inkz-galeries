import type { Metadata } from "next";

// Galeries privées des clients — jamais indexées par les moteurs de
// recherche (métadonnée placée ici, pas dans page.tsx, car `/g/page.tsx`
// est un Client Component — `metadata` ne peut être exporté que d'un
// Server Component ; ce layout couvre `/g` et `/g/[slug]`).
export const metadata: Metadata = {
  title: "Accès galerie",
  robots: { index: false, follow: false },
};

export default function GalleryAccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
