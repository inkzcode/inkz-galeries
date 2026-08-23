// Palette fixe pour le système "une couleur = un commentaire + un dessin"
// (retour d'Enzo, 2026-08-22). Cycle par photo : la Nième remarque d'une
// photo reçoit NOTE_COLORS[N % NOTE_COLORS.length] — au-delà de 6
// remarques sur la même photo, les couleurs se répètent (cas rare, pas
// grave : chaque remarque reste de toute façon associée à son propre
// tracé, la couleur n'est qu'une aide visuelle supplémentaire).
export const NOTE_COLORS = [
  "#e63946", // rouge
  "#457b9d", // bleu
  "#e9c46a", // or
  "#2a9d8f", // sarcelle
  "#9b5de5", // violet
  "#f4a261", // orange
] as const;

export function colorForNoteIndex(index: number): string {
  return NOTE_COLORS[index % NOTE_COLORS.length];
}
