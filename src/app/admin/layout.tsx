import type { Metadata } from "next";
import Link from "next/link";
import { getOptionalSession } from "@/lib/auth/dal";
import { logout } from "./login/actions";
import { BrandDots } from "../brand-dots";
import { BackLink } from "../back-link";

// Espace privé — jamais indexé par les moteurs de recherche.
export const metadata: Metadata = {
  title: "Espace photographe",
  robots: { index: false, follow: false },
};

// Ce layout n'effectue volontairement PAS la vérification d'authentification
// principale (voir le guide Next.js sur les layouts et l'auth : un layout ne
// re-render pas à chaque navigation et ne bloque pas le rendu des segments
// enfants). La protection réelle vient de src/proxy.ts (vérification
// optimiste) et de verifySession() appelé dans chaque page/Server Action
// (lib/auth/dal.ts). Ici, on ne fait que décider d'afficher la navigation.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getOptionalSession();

  return (
    <div className="min-h-screen">
      {session && (
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="flex items-center gap-2 font-serif text-lg text-ink">
                <BrandDots size={8} />
                Espace photographe
              </Link>
              <BackLink href="/" label="Voir le site" />
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="text-sm text-muted transition-colors hover:text-ink"
              >
                Se déconnecter
              </button>
            </form>
          </div>
        </header>
      )}
      {children}
    </div>
  );
}
