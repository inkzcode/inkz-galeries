import { z } from "zod";

// Validation d'une demande de retouche / annotation (brief §7). Un message
// + soit un tracé libre dessiné sur l'image (nouveau, 2026-08-22 — retour
// d'Enzo : "renforce le côté dessin où on peut vrm dessiner et entourer le
// problème"), soit un point simple (ancien format, gardé pour compatibilité
// avec les remarques déjà en base — voir prisma/schema.prisma).
//
// positionX/Y/drawingPath/color arrivent en pratique comme des chaînes
// issues d'un FormData (voire `null` si le champ caché n'existe même pas
// dans le DOM) — même leçon que gallery-form.ts : ne pas supposer qu'un
// champ optionnel absent vaut toujours "".
const optionalCoordinate = z.preprocess((value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}, z.number().min(0).max(1).optional());

const pointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

// Le tracé arrive en JSON (sérialisé côté client dans un champ caché) —
// jamais interprété comme du HTML/JS, uniquement redessiné en SVG à partir
// de coordonnées numériques validées point par point.
const optionalDrawingPath = z.preprocess((value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "string") return value;
  if (value.trim() === "") return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return value; // laisse zod rejeter proprement une valeur invalide
  }
}, z.array(pointSchema).min(2, "Le tracé est trop court.").max(1000).optional());

const optionalColor = z.preprocess((value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
}, z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide.").optional());

export const PhotoNoteSchema = z.object({
  message: z.string().trim().min(1, "Le message ne peut pas être vide.").max(2000),
  positionX: optionalCoordinate,
  positionY: optionalCoordinate,
  drawingPath: optionalDrawingPath,
  color: optionalColor,
});

export type PhotoNoteInput = z.infer<typeof PhotoNoteSchema>;

export type DrawingPoint = { x: number; y: number };

// `drawingPath` vient de Prisma comme JSON non typé (`Prisma.JsonValue`) —
// revalidé ici avant d'être utilisé, uniquement un tableau de points
// {x,y} numériques dans 0..1, jamais fait confiance tel quel même si
// c'est nous-mêmes qui l'avons écrit (défense en profondeur, coût nul).
// Partagé entre la vue client (public-gallery-service.ts) et la vue admin
// (galleries/[id]/page.tsx) — avant ce partage, seule la vue client
// dessinait réellement le tracé ; l'admin ne recevait même pas ce champ
// et ne voyait donc que le texte de la remarque, jamais le dessin
// (retour d'Enzo, 2026-08-31 : "je vois les remarques mais pas le dessin").
export function parseDrawingPath(value: unknown): DrawingPoint[] | null {
  if (!Array.isArray(value)) return null;
  const points: DrawingPoint[] = [];
  for (const item of value) {
    if (
      typeof item === "object" &&
      item !== null &&
      typeof (item as { x?: unknown }).x === "number" &&
      typeof (item as { y?: unknown }).y === "number"
    ) {
      points.push({ x: (item as { x: number }).x, y: (item as { y: number }).y });
    }
  }
  return points.length >= 2 ? points : null;
}

// Édition du texte d'une remarque déjà envoyée (retour d'Enzo, 2026-08-22 :
// "je veux pouvoir modifier ce que j'ai mis") — le tracé et la couleur
// restent fixes, seul le message est modifiable.
export const PhotoNoteMessageSchema = z.object({
  message: z.string().trim().min(1, "Le message ne peut pas être vide.").max(2000),
});
