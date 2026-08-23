import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLocalStorageAdapter } from "./local-adapter";

describe("createLocalStorageAdapter", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "inkz-storage-test-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("écrit puis relit un objet identique", async () => {
    const adapter = createLocalStorageAdapter(dir);
    const body = Buffer.from("contenu de test");
    await adapter.putObject("previews", "g1/p1/preview.jpg", body, "image/jpeg");

    const read = await adapter.getObjectBuffer("previews", "g1/p1/preview.jpg");
    expect(Buffer.compare(read, body)).toBe(0);
  });

  it("sépare physiquement originals et previews", async () => {
    const adapter = createLocalStorageAdapter(dir);
    await adapter.putObject("originals", "g1/p1/original.cr3", Buffer.from("raw"), "image/x-raw");
    await adapter.putObject("previews", "g1/p1/preview.jpg", Buffer.from("jpg"), "image/jpeg");

    await expect(
      adapter.getObjectBuffer("originals", "g1/p1/preview.jpg"),
    ).rejects.toThrow();
  });

  it("getPreviewUrl retourne un chemin sous /dev-previews", async () => {
    const adapter = createLocalStorageAdapter(dir);
    const url = await adapter.getPreviewUrl("g1/p1/preview.jpg");
    expect(url).toBe("/dev-previews/g1/p1/preview.jpg");
  });

  it("getDownloadUrl retourne aussi un chemin sous /dev-previews (même origine en dev)", async () => {
    const adapter = createLocalStorageAdapter(dir);
    const url = await adapter.getDownloadUrl("g1/p1/final.jpg", "DSC_1.jpg");
    expect(url).toBe("/dev-previews/g1/p1/final.jpg");
  });

  it("deleteObject est idempotent (ne jette pas si le fichier est déjà absent)", async () => {
    const adapter = createLocalStorageAdapter(dir);
    await expect(adapter.deleteObject("previews", "inexistant.jpg")).resolves.toBeUndefined();
  });
});
