// Export de la liste des fichiers sélectionnés pour retrouver rapidement
// les originaux dans Lightroom (brief §17). Pas d'intégration directe avec
// Lightroom (rien de tel n'est raisonnablement possible sans plugin
// propriétaire) — juste une liste de noms de fichiers, à copier ou
// exporter en CSV, que le photographe recherche lui-même dans son
// catalogue.

export type ExportablePhoto = {
  filename: string;
};

export function buildFilenameList(photos: ExportablePhoto[]): string {
  return photos.map((photo) => photo.filename).join("\n");
}

export function buildFilenameCsv(photos: ExportablePhoto[]): string {
  const header = "filename";
  const rows = photos.map((photo) => escapeCsvField(photo.filename));
  return [header, ...rows].join("\r\n");
}

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
