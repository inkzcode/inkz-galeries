import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/dal";
import { createLocalStorageAdapter } from "@/lib/storage/local-adapter";
import type { StorageBucket } from "@/lib/storage/types";

// Cible locale du "PUT direct" (voir local-adapter.ts::getUploadUrl) —
// simule, pour le développement, ce qu'une vraie URL signée S3/B2 fait en
// production : écrire le corps de la requête tel quel dans le bucket
// donné. N'existe QUE pour donner le même chemin de code client (PUT
// direct) dans les deux environnements — jamais utilisée en production
// (getStorageAdapter() y bascule toujours sur le stockage objet réel, qui
// a sa propre URL signée, jamais celle-ci). Garde explicite ci-dessous en
// défense en profondeur : cette route ne doit jamais écrire quoi que ce
// soit en production, même si elle était atteinte par erreur.
export async function PUT(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Route de développement uniquement." }, { status: 403 });
  }

  await verifySession();

  const { searchParams } = new URL(request.url);
  const bucket = searchParams.get("bucket");
  const key = searchParams.get("key");
  if (bucket !== "originals" && bucket !== "previews") {
    return NextResponse.json({ error: "Bucket invalide." }, { status: 400 });
  }
  if (!key) {
    return NextResponse.json({ error: "Clé manquante." }, { status: 400 });
  }

  const body = Buffer.from(await request.arrayBuffer());
  const contentType = request.headers.get("content-type") || "application/octet-stream";

  const storage = createLocalStorageAdapter();
  await storage.putObject(bucket as StorageBucket, key, body, contentType);

  return NextResponse.json({ ok: true });
}
