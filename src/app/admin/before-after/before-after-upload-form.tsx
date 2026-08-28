"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { uploadBeforeAfterExample } from "./upload-before-after-example";

const inputClass =
  "rounded-md border border-border bg-paper px-3 py-2.5 text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent-tint";
const labelClass = "text-sm text-ink-soft";
const fileInputClass = `${inputClass} w-full file:mr-3 file:rounded file:border-0 file:bg-accent-tint file:px-3 file:py-1.5 file:text-ink`;

// Un aperçu miniature par fichier, dès sa sélection — se tromper entre
// "avant" et "après" avec deux champs de fichier anonymes est un vrai
// risque, l'aperçu visuel l'élimine (aucun autre formulaire admin n'en a
// besoin, celui-ci est le premier avec deux fichiers à ne pas confondre).
function FilePicker({
  id,
  label,
  file,
  onChange,
}: {
  id: string;
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);

  // Gère l'URL d'aperçu de façon impérative (via ref) plutôt que de la
  // stocker en état React — évite un setState synchrone dans l'effet
  // (react-hooks/set-state-in-effect) pour ce qui est fondamentalement une
  // synchronisation avec une ressource navigateur externe (createObjectURL),
  // pas un état à dériver pendant le rendu.
  useEffect(() => {
    if (!file || !imgRef.current) return;
    const url = URL.createObjectURL(file);
    imgRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelClass}>
        {label} *
      </label>
      {file && (
        // eslint-disable-next-line @next/next/no-img-element -- aperçu local avant envoi, jamais une URL de stockage
        <img
          ref={imgRef}
          alt=""
          className="aspect-[4/5] w-full rounded-md border border-border object-cover"
        />
      )}
      <input
        id={id}
        type="file"
        accept="image/*"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        className={fileInputClass}
      />
    </div>
  );
}

export function BeforeAfterUploadForm() {
  const router = useRouter();
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setBeforeFile(null);
    setAfterFile(null);
    setCaption("");
    if (beforeInputRef.current) beforeInputRef.current.value = "";
    if (afterInputRef.current) afterInputRef.current.value = "";
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!beforeFile || !afterFile) {
      setError("Les deux photos (avant et après) sont nécessaires.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await uploadBeforeAfterExample({ beforeFile, afterFile, caption });
      if (!result.success) {
        setError(result.error);
        return;
      }
      reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FilePicker id="before-after-before" label="Avant" file={beforeFile} onChange={setBeforeFile} />
        <FilePicker id="before-after-after" label="Après" file={afterFile} onChange={setAfterFile} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="before-after-caption" className={labelClass}>
          Légende (facultatif)
        </label>
        <input
          id="before-after-caption"
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          className={inputClass}
          placeholder="Ex. Retouche lumière et peau"
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <motion.button
        type="submit"
        disabled={pending}
        whileHover={pending ? undefined : { scale: 1.03, y: -2 }}
        whileTap={pending ? undefined : { scale: 0.97 }}
        className="inline-flex w-fit items-center justify-center rounded-md bg-accent px-6 py-3 text-sm font-medium text-paper shadow-sm hover:shadow-md disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
      >
        {pending ? "Envoi…" : "Ajouter la paire"}
      </motion.button>
    </form>
  );
}
