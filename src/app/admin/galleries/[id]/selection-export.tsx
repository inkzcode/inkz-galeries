"use client";

import { useState } from "react";

// Export de la sélection confirmée (brief §17) : copier la liste ou
// télécharger un CSV, pour retrouver les fichiers dans Lightroom. Pas
// d'intégration directe avec Lightroom — juste les noms de fichiers.
export function SelectionExport({
  filenameList,
  csv,
}: {
  filenameList: string;
  csv: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(filenameList);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadCsv() {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "selection.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center justify-center rounded-md border border-ink px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-paper"
      >
        {copied ? "Copié !" : "Copier la liste"}
      </button>
      <button
        type="button"
        onClick={handleDownloadCsv}
        className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm text-ink-soft transition-colors hover:border-ink hover:text-ink"
      >
        Télécharger le CSV
      </button>
    </div>
  );
}
