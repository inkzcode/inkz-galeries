import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decryptSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

// Vérification optimiste (cookie uniquement, pas de requête base de données)
// — voir node_modules/next/dist/docs/01-app/02-guides/authentication.md
// ("Optimistic checks with Proxy"). Ce n'est qu'une première ligne de
// défense : chaque page/Server Action de /admin revérifie elle-même la
// session via lib/auth/dal.ts (verifySession).
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname === "/admin/login";

  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await decryptSession(cookie);
  const isAuthenticated = Boolean(session?.adminId);

  if (!isLoginRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (isLoginRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};
