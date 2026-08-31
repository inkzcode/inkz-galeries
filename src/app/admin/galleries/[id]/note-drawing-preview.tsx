import type { DrawingPoint } from "@/lib/domain/photo-note";

const VIEWBOX = 1000;

function toViewBoxPoints(points: DrawingPoint[]): string {
  return points.map((p) => `${p.x * VIEWBOX},${p.y * VIEWBOX}`).join(" ");
}

// Superpose les tracés/points des remarques client directement sur la
// vignette admin (retour d'Enzo, 2026-08-31 : "je vois les remarques mais
// pas le dessin") — jusqu'ici seul le texte et une pastille de couleur
// étaient affichés côté admin, jamais le tracé lui-même que le client a
// dessiné (voir g/[slug]/drawing-overlay.tsx pour l'équivalent côté
// client, en lecture-écriture). Purement décoratif ici, pas d'évènement.
export function NoteDrawingPreview({
  notes,
}: {
  notes: {
    id: string;
    color: string | null;
    drawingPath: DrawingPoint[] | null;
    positionX: number | null;
    positionY: number | null;
  }[];
}) {
  const hasAnything = notes.some(
    (note) => (note.drawingPath?.length ?? 0) >= 2 || (note.positionX !== null && note.positionY !== null),
  );
  if (!hasAnything) return null;

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      preserveAspectRatio="none"
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {notes.map((note) => {
        if (note.drawingPath && note.drawingPath.length >= 2) {
          return (
            <polyline
              key={note.id}
              points={toViewBoxPoints(note.drawingPath)}
              fill="none"
              stroke={note.color ?? "#e63946"}
              strokeWidth={14}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
          );
        }
        if (note.positionX !== null && note.positionY !== null) {
          return (
            <circle
              key={note.id}
              cx={note.positionX * VIEWBOX}
              cy={note.positionY * VIEWBOX}
              r={14}
              fill={note.color ?? "#e63946"}
              stroke="#ffffff"
              strokeWidth={4}
            />
          );
        }
        return null;
      })}
    </svg>
  );
}
