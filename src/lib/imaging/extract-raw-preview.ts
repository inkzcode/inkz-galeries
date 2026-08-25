import "server-only";
import { LibRaw } from "@colorhythm/libraw-wasm";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import path from "node:path";

// Presque tous les RAW (CR2, CR3, NEF, ARW, DNG, RAF, ORF, RW2...)
// contiennent un aperçu JPEG intégré par l'appareil photo lui-même —
// extrait ici pour générer l'aperçu client SANS qu'Enzo n'ait à exporter
// un JPEG à la main pour chaque photo (retour d'Enzo, 2026-08-25 : "je
// veux pas avoir à le faire [...] avant [la retouche] ça doit être en
// RAW").
//
// Deuxième tentative après un premier échec réel en production :
// `exiftool-vendored` (essayé d'abord) a besoin de Perl installé sur la
// machine — absent sur Vercel, pas installable sur une fonction
// serverless. `@colorhythm/libraw-wasm` tourne en WebAssembly pur, sans
// process externe ni interpréteur système — vérifié qu'il s'initialise
// et tourne réellement en Node.js nu avant de l'utiliser ici (pas
// seulement documenté comme compatible), après avoir aussi vérifié que
// `libraw-wasm` (le paquet dont celui-ci est un fork) échoue en Node
// avec "Worker is not defined" (dépend du `Worker` du navigateur, absent
// de Node par défaut).
//
// Troisième bug réel en production (toujours le même jour) : la
// librairie charge son `.wasm` en interne via
// `new URL('./libraw.wasm', import.meta.url)` — un motif que Turbopack
// reconnaît et réécrit en référence d'asset CLIENT
// (`_next/static/.../libraw.[hash].wasm`), absente du système de
// fichiers de la fonction serveur au runtime ("ENOENT"). Contourné en
// lisant nous-mêmes le fichier et en passant les octets directement à
// `LibRaw.initialize()`, qui accepte un buffer explicite à la place de
// son chargement interne (voir le README du paquet, section "custom
// asset pipeline").
//
// Piège suivant, trouvé en local avant de redéployer cette fois :
// résoudre le chemin via `require.resolve('@colorhythm/libraw-wasm/libraw.wasm')`
// (le sous-chemin exporté par le paquet) fait ÉCHOUER LE BUILD — Turbopack
// a un support natif des imports `.wasm` et le déclenche dès qu'il voit
// une chaîne se terminant par `.wasm` passée à `require.resolve()`,
// produisant un module cassé. Contourné en résolvant plutôt l'entrée JS
// normale du paquet (`require.resolve('@colorhythm/libraw-wasm')`, jamais
// spécial pour Turbopack) puis en construisant le chemin du `.wasm` par
// un simple `path.join` sur son dossier — même technique
// `turbopackIgnore` que pour `os.tmpdir()` plus haut dans ce fichier
// historiquement (voir PROJECT_CONTEXT.md §6trigies point 3).
let initialized: Promise<void> | null = null;
function ensureInitialized(): Promise<void> {
  // LibRaw.initialize() est partagé au sein d'un même realm JS — un seul
  // appel suffit, réutilisé par toutes les extractions de cette instance
  // de fonction serverless.
  if (!initialized) {
    initialized = loadWasmBytes().then((bytes) => LibRaw.initialize(bytes).then(() => undefined));
  }
  return initialized;
}

async function loadWasmBytes(): Promise<ArrayBuffer> {
  const require = createRequire(import.meta.url);
  const entryPath = require.resolve("@colorhythm/libraw-wasm");
  const wasmPath = path.join(/*turbopackIgnore: true*/ path.dirname(entryPath), "libraw.wasm");
  const bytes = await readFile(wasmPath);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

export async function extractEmbeddedRawPreview(rawBuffer: Buffer): Promise<Buffer | null> {
  await ensureInitialized();

  const decoder = new LibRaw();
  try {
    await decoder.waitUntilReady();

    const arrayBuffer = rawBuffer.buffer.slice(
      rawBuffer.byteOffset,
      rawBuffer.byteOffset + rawBuffer.byteLength,
    );
    decoder.open(arrayBuffer);
    decoder.unpackThumb();
    const thumb = decoder.dcrawMakeMemThumb();

    if (thumb.type_ !== "LIBRAW_IMAGE_JPEG") {
      // Certains RAW embarquent un aperçu dans un autre format (bitmap,
      // HEIC/H265...) — pas assez courant pour justifier un décodage
      // supplémentaire ; traité comme "aucun aperçu utilisable".
      return null;
    }
    return Buffer.from(thumb.data);
  } catch (error) {
    console.error("Extraction de l'aperçu intégré du RAW échouée :", error);
    return null;
  } finally {
    decoder.dispose();
  }
}
