"use client";

import { useRef, useState } from "react";
import type { DrawingPoint, PublicGalleryNote } from "@/lib/services/public-gallery-service";

const VIEWBOX = 1000;

// Une remarque pas encore envoyée : tracé + couleur (affichés tout de
// suite sur la photo) + message (rédigé/modifié dans photo-notes-panel.tsx).
// Plusieurs peuvent coexister avant l'envoi groupé (retour d'Enzo,
// 2026-08-22 : "je veux pouvoir entourer plusieurs trucs [...] d'un coup
// sans avoir à envoyer à chaque fois").
export type DraftNote = {
  id: string;
  points: DrawingPoint[];
  color: string;
  message: string;
};

function toViewBoxPoints(points: DrawingPoint[]): string {
  return points.map((p) => `${p.x * VIEWBOX},${p.y * VIEWBOX}`).join(" ");
}

// Surface de dessin superposée à la photo dans la lightbox (retour
// d'Enzo, 2026-08-22 : "renforce le côté dessin où on peut vrm dessiner
// et entourer le problème [...] une couleur = un commentaire + un
// dessin"). Remplace l'ancien "un clic = un point".
//
// Point important corrigé ici : au clic-glissé, l'image entière semblait
// bouger ("relou"). Cause réelle — le conteneur de la lightbox défile
// (`overflow-y-auto`) et un geste de glissement sur une image est, par
// défaut, interprété par le navigateur comme un début de défilement/glisser
// natif. Fix : `touch-action: none` sur la surface de dessin,
// `preventDefault()` sur chaque évènement pointer, et une vraie capture de
// pointeur (`setPointerCapture`) pour ne jamais perdre le tracé en cours
// même si le curseur sort brièvement de la zone.
export function DrawingOverlay({
  notes,
  draftNotes,
  activeColor,
  disabled = false,
  onStrokeComplete,
}: {
  notes: PublicGalleryNote[];
  /** Tracés déjà terminés (relâchés) mais pas encore envoyés — restent
   * affichés tant qu'ils ne sont ni envoyés ni annulés depuis le panneau
   * de remarques (retour d'Enzo : "dès que je lâche on voit plus le
   * tracé"). Plusieurs à la fois, contrairement aux notes déjà envoyées
   * qui viennent de `notes`. */
  draftNotes: DraftNote[];
  activeColor: string;
  disabled?: boolean;
  onStrokeComplete: (points: DrawingPoint[]) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [currentPoints, setCurrentPoints] = useState<DrawingPoint[]>([]);
  const isDrawing = currentPoints.length > 0;

  function pointFromEvent(event: React.PointerEvent<SVGSVGElement>): DrawingPoint {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
  }

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (disabled) return;
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture non disponible pour ce type de pointeur (rare) — le tracé
      // fonctionne quand même tant que le curseur reste sur la surface.
    }
    setCurrentPoints([pointFromEvent(event)]);
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!isDrawing) return;
    event.preventDefault();
    const next = pointFromEvent(event);
    setCurrentPoints((prev) => {
      const last = prev[prev.length - 1];
      // N'ajoute un point que s'il y a un vrai mouvement — évite un
      // tableau énorme pour un tracé lent, sans perdre en fluidité visuelle.
      const distance = Math.hypot(next.x - last.x, next.y - last.y);
      return distance > 0.003 ? [...prev, next] : prev;
    });
  }

  function handlePointerUp(event: React.PointerEvent<SVGSVGElement>) {
    if (!isDrawing) return;
    event.preventDefault();
    if (currentPoints.length >= 2) {
      onStrokeComplete(currentPoints);
    }
    setCurrentPoints([]);
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      preserveAspectRatio="none"
      className={`absolute inset-0 h-full w-full ${disabled ? "" : "cursor-crosshair"}`}
      style={{ touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {notes.map((note) =>
        note.drawingPath ? (
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
        ) : note.positionX !== null && note.positionY !== null ? (
          // Anciennes remarques "un point" (avant ce système de tracé) —
          // toujours affichées, pour ne rien perdre.
          <circle
            key={note.id}
            cx={note.positionX * VIEWBOX}
            cy={note.positionY * VIEWBOX}
            r={14}
            fill={note.color ?? "#e63946"}
            stroke="#ffffff"
            strokeWidth={4}
          />
        ) : null,
      )}

      {draftNotes.map((draft) => (
        <polyline
          key={draft.id}
          points={toViewBoxPoints(draft.points)}
          fill="none"
          stroke={draft.color}
          strokeWidth={14}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {currentPoints.length >= 2 && (
        <polyline
          points={toViewBoxPoints(currentPoints)}
          fill="none"
          stroke={activeColor}
          strokeWidth={14}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
