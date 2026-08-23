// Limitation best-effort des tentatives (codes d'accès galerie, login
// admin — brief §21 : "limitation des abus"). **En mémoire uniquement** :
// efficace sur un process Node long-vivant, mais chaque instance
// serverless a sa propre mémoire — ce n'est pas une garantie forte en
// production multi-instance. Une évolution (compteur en base, ou service
// dédié type Upstash) est possible plus tard si les abus deviennent un
// problème réel. Ne jamais prétendre l'inverse dans l'UI (même esprit que
// l'avertissement watermark, brief §13).
//
// Dépend aussi de la fiabilité de l'en-tête `x-forwarded-for` fourni par
// l'appelant pour construire la clé — fiable sur Vercel (l'infrastructure
// définit cet en-tête elle-même), pas garanti si le projet est un jour
// déployé ailleurs sans proxy de confiance devant l'app (un client pourrait
// alors falsifier cet en-tête pour contourner la limite).
import { headers } from "next/headers";

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

const attempts = new Map<string, { count: number; windowStart: number }>();

export function isRateLimited(key: string): boolean {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.windowStart > WINDOW_MS) return false;
  return entry.count >= MAX_ATTEMPTS;
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    attempts.set(key, { count: 1, windowStart: now });
    return;
  }
  entry.count += 1;
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}

// Helper partagé pour construire une clé de limitation à partir de l'IP du
// client — voir l'avertissement en tête de fichier sur `x-forwarded-for`.
export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  return headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
