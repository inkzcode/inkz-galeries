// Message affiché sur la galerie client quand
// `Gallery.retouchPhilosophyEnabled` est activé (brief — schéma prêt
// depuis un moment, contenu jamais rédigé). Rédigé par défaut le
// 2026-08-22 à la demande d'Enzo ("fais les commentaires sur les trucs
// philosophiques quitte à ce que je le modifie après, les textes au moins
// c'est mis dans le site") — DESTINÉ À ÊTRE MODIFIÉ PAR ENZO, ce n'est
// qu'un premier jet dans son ton, pas un texte définitif.
//
// Un seul texte global (pas par galerie) — comme une note d'intention,
// cohérente d'un shooting à l'autre. Simple constante plutôt qu'un champ
// en base : c'est un paragraphe qu'Enzo éditera directement ici de temps
// en temps, pas un contenu nécessitant une interface d'administration.
const RETOUCH_PHILOSOPHY =
  "Je retouche pour sublimer, jamais pour transformer : mon travail consiste à révéler ce qui est déjà là — une lumière, une expression, un instant — pas à lisser une identité. Chaque retouche reste discrète : rien n'est imposé, tout peut être discuté. Si un détail vous met mal à l'aise, dites-le-moi simplement en l'entourant sur la photo — c'est exactement à ça que sert cet espace.";

export function getRetouchPhilosophy(): string {
  return RETOUCH_PHILOSOPHY;
}
