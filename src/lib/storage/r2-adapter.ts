import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageAdapter, StorageBucket } from "./types";

// Cloudflare R2 est compatible S3 — voir PROJECT_CONTEXT.md §2 pour le
// choix (10 Go gratuits en permanence, zéro frais de sortie). Pas encore
// testé contre un vrai compte R2 dans cet environnement (aucun compte
// provisionné) — voir PROJECT_CONTEXT.md §7/§8. Structurellement écrit
// comme le client Prisma+Neon (même approche que src/lib/db.ts).

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketOriginals: string;
  bucketPreviews: string;
};

function bucketName(bucket: StorageBucket, config: R2Config): string {
  return bucket === "originals" ? config.bucketOriginals : config.bucketPreviews;
}

export function createR2StorageAdapter(config: R2Config): StorageAdapter {
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return {
    async putObject(bucket, key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucketName(bucket, config),
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    },

    async getObjectBuffer(bucket, key) {
      const response = await client.send(
        new GetObjectCommand({ Bucket: bucketName(bucket, config), Key: key }),
      );
      const bytes = await response.Body?.transformToByteArray();
      if (!bytes) {
        throw new Error(`Objet introuvable dans R2 : ${bucket}/${key}`);
      }
      return Buffer.from(bytes);
    },

    async getPreviewUrl(key) {
      // URL signée temporaire (1h) plutôt qu'un bucket public — voir brief
      // §21 ("URLs signées/temporaires si pertinent").
      return getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: config.bucketPreviews, Key: key }),
        { expiresIn: 60 * 60 },
      );
    },

    async getDownloadUrl(key, filename) {
      // ResponseContentDisposition force le téléchargement même
      // cross-origin (l'attribut `download` d'un <a> est ignoré par les
      // navigateurs pour une URL d'un autre domaine sans cet en-tête).
      return getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: config.bucketPreviews,
          Key: key,
          ResponseContentDisposition: `attachment; filename="${filename.replace(/"/g, "")}"`,
        }),
        { expiresIn: 60 * 60 },
      );
    },

    async deleteObject(bucket, key) {
      await client.send(
        new DeleteObjectCommand({ Bucket: bucketName(bucket, config), Key: key }),
      );
    },
  };
}
