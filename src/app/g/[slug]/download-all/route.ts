import "server-only";
import { Zip, ZipPassThrough } from "fflate";
import { hasGalleryAccess } from "@/lib/gallery-access/session";
import { getOptionalSession } from "@/lib/auth/dal";
import { getPublicGalleryBySlug } from "@/lib/services/public-gallery-service";
import { listDeliverableFinalKeys } from "@/lib/services/final-delivery-service";
import { getStorageAdapter } from "@/lib/storage/client";

// "Tout télécharger" (brief §29) — streamé, jamais assemblé en mémoire
// d'un coup : un fichier à la fois est lu depuis le stockage puis ajouté
// au zip (mode STORE via ZipPassThrough, pas de recompression — les JPEG
// sont déjà compressés, ça ne ferait que perdre du temps CPU pour un gain
// quasi nul). Même protection que le reste de `/g/[slug]` : le cookie
// d'accès galerie est scopé à ce chemin (voir gallery-access/session.ts),
// donc envoyé automatiquement par le navigateur sur ce lien.
//
// `maxDuration` : plafond d'exécution Vercel pour cette route (60s, le
// maximum sans changer de palier). Suffisant pour un shooting de taille
// normale ; une très grosse galerie pourrait dépasser ce délai — pas de
// solution "vraiment illimitée" possible sur une fonction serverless
// classique, mais raisonnable pour l'usage réel de ce projet.
export const maxDuration = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;

  // Le cookie d'accès galerie couvre le client ; l'admin, lui, n'en a
  // jamais un tant qu'il n'a pas lui-même "déverrouillé" la galerie
  // comme un client le ferait — mais l'aperçu admin (preview/page.tsx)
  // est volontairement réellement interactif, ce lien doit donc marcher
  // aussi depuis une session admin valide.
  const [galleryAccess, adminSession] = await Promise.all([
    hasGalleryAccess(slug),
    getOptionalSession(),
  ]);
  if (!galleryAccess && !adminSession?.adminId) {
    return new Response("Accès non autorisé.", { status: 403 });
  }

  const gallery = await getPublicGalleryBySlug(slug);
  if (!gallery) {
    return new Response("Galerie introuvable.", { status: 404 });
  }

  const photos = await listDeliverableFinalKeys(gallery.id);
  if (photos.length === 0) {
    return new Response("Aucune photo à télécharger pour l'instant.", { status: 404 });
  }

  const storage = getStorageAdapter();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const zip = new Zip((error, chunk, final) => {
        if (error) {
          controller.error(error);
          return;
        }
        controller.enqueue(chunk);
        if (final) controller.close();
      });

      (async () => {
        const digits = String(photos.length).length;
        let index = 0;
        for (const photo of photos) {
          index += 1;
          const buffer = await storage.getObjectBuffer("previews", photo.finalKey!);
          const prefix = String(index).padStart(digits, "0");
          const entry = new ZipPassThrough(`${prefix}-${photo.filename}`);
          zip.add(entry);
          entry.push(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength), true);
        }
        zip.end();
      })().catch((error) => controller.error(error));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipFilename(gallery.title)}"`,
    },
  });
}

function zipFilename(galleryTitle: string): string {
  // NFD sépare les accents en marques combinantes distinctes (é → e + ´) ;
  // l'allowlist ASCII qui suit les élimine au passage, avec tout le reste
  // (espaces, apostrophes...) — pas besoin de les cibler explicitement.
  const ascii = galleryTitle
    .normalize("NFD")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${ascii || "photos"}.zip`;
}
