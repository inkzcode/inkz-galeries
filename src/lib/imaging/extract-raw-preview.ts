import "server-only";
import { ExifTool } from "exiftool-vendored";
import { randomUUID } from "node:crypto";
import { writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

// Presque tous les RAW (CR2, CR3, NEF, ARW, DNG, RAF, ORF, RW2...)
// contiennent un aperçu JPEG intégré par l'appareil photo lui-même —
// extrait ici pour générer l'aperçu client SANS qu'Enzo n'ait à exporter
// un JPEG à la main pour chaque photo (retour d'Enzo, 2026-08-25 : "je
// veux pas avoir à le faire [...] avant [la retouche] ça doit être en
// RAW"). ExifTool (via exiftool-vendored) plutôt qu'une librairie JS pure
// : aucune ne couvre correctement tous ces formats, ExifTool est le
// standard du secteur pour ça, avec un binaire vendu par plateforme
// (mécanisme npm optionalDependencies — même approche que sharp/esbuild,
// déjà éprouvée sur Vercel dans ce projet).
//
// Une instance ExifTool dédiée par appel plutôt que le singleton partagé
// du module : en environnement serverless, chaque appel peut tourner
// dans une instance isolée/gelée entre deux invocations — mieux vaut un
// processus démarré et explicitement arrêté (`end()`) à chaque fois
// qu'un processus persistant dont la fonction ne sait jamais s'il
// survivra jusqu'au prochain appel.
export async function extractEmbeddedRawPreview(
  rawBuffer: Buffer,
  extension: string,
): Promise<Buffer | null> {
  const id = randomUUID();
  // `turbopackIgnore` : os.tmpdir() est un chemin dynamique que Turbopack
  // ne peut pas analyser statiquement — sans cette annotation, il inclut
  // tout le projet dans le paquet déployé "par précaution" (avertissement
  // au build, suit exactement la solution qu'il suggère lui-même). Sûr
  // ici : ce chemin ne touche jamais aux fichiers du projet, seulement un
  // répertoire temporaire du système.
  const inputPath = path.join(/*turbopackIgnore: true*/ os.tmpdir(), `${id}.${extension}`);
  const outputPath = path.join(/*turbopackIgnore: true*/ os.tmpdir(), `${id}-preview.jpg`);
  const exiftool = new ExifTool({ maxProcs: 1, taskTimeoutMillis: 30_000 });

  try {
    await writeFile(inputPath, rawBuffer);
    await exiftool.extractJpgFromRaw(inputPath, outputPath);
    return await readFile(outputPath);
  } catch (error) {
    console.error("Extraction de l'aperçu intégré du RAW échouée :", error);
    return null;
  } finally {
    await exiftool.end().catch(() => {});
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}
