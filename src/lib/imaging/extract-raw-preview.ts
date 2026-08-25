import "server-only";
import { LibRaw } from "@colorhythm/libraw-wasm";

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
let initialized: Promise<void> | null = null;
function ensureInitialized(): Promise<void> {
  // LibRaw.initialize() est partagé au sein d'un même realm JS — un seul
  // appel suffit, réutilisé par toutes les extractions de cette instance
  // de fonction serverless.
  if (!initialized) {
    initialized = LibRaw.initialize().then(() => undefined);
  }
  return initialized;
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
