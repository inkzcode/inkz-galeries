"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { uploadPortfolioItem } from "./upload-portfolio-item";

const inputClass =
  "rounded-md border border-border bg-paper px-3 py-2.5 text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent-tint";
const labelClass = "text-sm text-ink-soft";

// Ajout direct au portfolio, sans passer par un shooting (retour d'Enzo,
// 2026-08-25 : "un bouton [...] où je peux ajouter des trucs dans mon
// portfolio sans passer par inkz.fr ni par un shooting quelconque").
export function PortfolioUploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setFile(null);
    setTitle("");
    setDescription("");
    setCategory("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file || title.trim() === "") {
      setError("Une image et un titre sont nécessaires.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await uploadPortfolioItem({ file, title, description, category });
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
      <div className="flex flex-col gap-1.5">
        <label htmlFor="portfolio-file" className={labelClass}>
          Image *
        </label>
        <input
          ref={fileInputRef}
          id="portfolio-file"
          type="file"
          accept="image/*"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className={`${inputClass} file:mr-3 file:rounded file:border-0 file:bg-accent-tint file:px-3 file:py-1.5 file:text-ink`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="portfolio-title" className={labelClass}>
            Titre *
          </label>
          <input
            id="portfolio-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={inputClass}
            placeholder="Ex. Iris"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="portfolio-category" className={labelClass}>
            Catégorie (facultatif)
          </label>
          <input
            id="portfolio-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className={inputClass}
            placeholder="Portrait, Abstrait, Street…"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="portfolio-description" className={labelClass}>
          Description (facultatif)
        </label>
        <textarea
          id="portfolio-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          className={inputClass}
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
        {pending ? "Envoi…" : "Ajouter au portfolio"}
      </motion.button>
    </form>
  );
}
