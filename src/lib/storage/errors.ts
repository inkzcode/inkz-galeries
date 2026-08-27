// Détection du quota gratuit Backblaze dépassé (1 Go de bande passante
// de téléchargement par jour — voir PROJECT_CONTEXT.md, ce plafond a déjà
// cassé un import complet une fois, chaque photo échouant une par une).
// Distincte de toute autre erreur (celles-là méritent d'être réessayées,
// voir photos-actions.ts) : pas la peine de retenter une requête qui ne
// réussira pas avant la remise à zéro du quota le lendemain.
//
// Le texte exact renvoyé par l'API compatible S3 de Backblaze pour ce cas
// précis n'est pas documenté officiellement (recherché le 2026-08-27,
// seule l'API native documente le code `cap_exceeded`) — cette détection
// n'a pas pu être reproduite dans cet environnement, faute de vraies
// clés B2 ici. Volontairement large (accessdenied + "cap" quelque part
// dans le message) plutôt qu'une correspondance exacte fragile ; à
// resserrer si jamais elle se déclenche à tort.
export function isStorageCapExceeded(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const name = "name" in error ? String((error as { name?: unknown }).name ?? "") : "";
  const combined = `${name} ${error.message}`.toLowerCase();
  return combined.includes("accessdenied") && combined.includes("cap");
}
