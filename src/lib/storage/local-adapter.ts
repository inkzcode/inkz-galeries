import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageAdapter, StorageBucket } from "./types";

// Implémentation de secours pour le développement local, zéro coût, zéro
// compte externe requis (voir PROJECT_CONTEXT.md §12 — coûts). Utilisée
// automatiquement quand les variables R2_* ne sont pas renseignées (voir
// client.ts). NE DOIT JAMAIS être utilisée en production (client.ts lève
// une erreur explicite dans ce cas).
//
// - "originals" → <root>/.local-storage/originals/ (gitignored, JAMAIS
//   dans public/ — cohérent avec "jamais servi au navigateur").
// - "previews"  → <root>/public/dev-previews/ (gitignored) pour bénéficier
//   du serveur de fichiers statiques de Next.js sans route dédiée.
function dirFor(bucket: StorageBucket, rootDir: string): string {
  return bucket === "originals"
    ? path.join(rootDir, ".local-storage", "originals")
    : path.join(rootDir, "public", "dev-previews");
}

export function createLocalStorageAdapter(rootDir: string = process.cwd()): StorageAdapter {
  return {
    async putObject(bucket, key, body) {
      const filePath = path.join(dirFor(bucket, rootDir), key);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, body);
    },
    async getObjectBuffer(bucket, key) {
      return readFile(path.join(dirFor(bucket, rootDir), key));
    },
    async getUploadUrl(bucket, key) {
      // Pas de vraie URL signée en local (pas de stockage objet à côté) —
      // pointe vers une route de dev qui écrit directement sur disque, pour
      // que le même code client (PUT direct) fonctionne dans les deux
      // environnements. Voir app/api/dev-upload/route.ts.
      return `/api/dev-upload?bucket=${bucket}&key=${encodeURIComponent(key)}`;
    },
    async getPreviewUrl(key) {
      return `/dev-previews/${key}`;
    },
    async getDownloadUrl(key) {
      // Même-origine en local : l'attribut `download` d'un <a> suffit,
      // pas besoin d'un en-tête Content-Disposition dédié.
      return `/dev-previews/${key}`;
    },
    async deleteObject(bucket, key) {
      await unlink(path.join(dirFor(bucket, rootDir), key)).catch(() => {
        // Suppression idempotente : un fichier déjà absent n'est pas une erreur.
      });
    },
  };
}
