// Palette fixe pour le système "une couleur = un commentaire + un dessin"
// (retour d'Enzo, 2026-08-22).
export const NOTE_COLORS = [
  "#e63946", // rouge
  "#457b9d", // bleu
  "#e9c46a", // or
  "#2a9d8f", // sarcelle
  "#9b5de5", // violet
  "#f4a261", // orange
] as const;

// Choisit la première couleur de la palette qui n'est PAS déjà utilisée
// par une remarque/un brouillon actuellement visible sur cette photo.
// Remplace un simple comptage positionnel (`NOTE_COLORS[N %
// NOTE_COLORS.length]`) — retour d'une amie d'Enzo, 2026-08-31 : en
// supprimant une remarque rouge après en avoir créé une bleue, la
// remarque suivante retombait sur bleu (même index positionnel que la
// bleue existante), donnant deux tracés bleus indiscernables. Recalculer
// à partir des couleurs RÉELLEMENT en usage évite ce genre de collision
// après une suppression, quel que soit l'ordre des créations/suppressions.
export function nextAvailableColor(usedColors: readonly (string | null)[]): string {
  const used = new Set(usedColors.map((color) => color ?? NOTE_COLORS[0]));
  const free = NOTE_COLORS.find((color) => !used.has(color));
  if (free) return free;
  // Au-delà de 6 remarques visibles simultanément sur la même photo (cas
  // rare) : les couleurs se répètent — chaque remarque reste de toute
  // façon associée à son propre tracé, la couleur n'est qu'une aide
  // visuelle supplémentaire.
  return NOTE_COLORS[usedColors.length % NOTE_COLORS.length];
}
