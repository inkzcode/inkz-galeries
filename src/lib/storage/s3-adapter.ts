import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageAdapter, StorageBucket } from "./types";

// Client S3 générique — fonctionne avec n'importe quel stockage objet
// compatible S3 (Cloudflare R2, Backblaze B2, ...), pas seulement R2.
// Renommé depuis r2-adapter.ts le 2026-08-23 : R2 impose une carte
// bancaire pour activer le service (même sous le palier gratuit, jamais
// débité — vérifié en pratique par Enzo, pas juste documentation), ce
// qu'il ne voulait pas donner. Backblaze B2 propose le même principe (10
// Go gratuits en permanence) sans jamais demander de carte, et expose
// aussi une API compatible S3 — seul l'endpoint/la région changent, le
// reste du code est identique.

export type S3StorageConfig = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketOriginals: string;
  bucketPreviews: string;
};

function bucketName(bucket: StorageBucket, config: S3StorageConfig): string {
  return bucket === "originals" ? config.bucketOriginals : config.bucketPreviews;
}

export function createS3StorageAdapter(config: S3StorageConfig): StorageAdapter {
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
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
        throw new Error(`Objet introuvable dans le stockage : ${bucket}/${key}`);
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
