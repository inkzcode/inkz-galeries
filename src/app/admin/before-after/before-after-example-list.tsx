"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "motion/react";
import { deleteExampleAction } from "./actions";

export type BeforeAfterExampleRow = {
  id: string;
  beforeUrl: string;
  afterUrl: string;
  caption: string | null;
};

const grid: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const tile: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// Les deux vignettes côte à côte par entrée (pas juste une) — pour
// qu'Enzo distingue les paires d'un coup d'œil dans la liste, même
// principe de lisibilité que les aperçus du formulaire d'ajout.
export function BeforeAfterExampleList({ items }: { items: BeforeAfterExampleRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteExampleAction(id);
      router.refresh();
    });
  }

  return (
    <motion.ul
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
      variants={grid}
      initial="hidden"
      animate="show"
    >
      {items.map((item) => (
        <motion.li
          key={item.id}
          variants={tile}
          className="group overflow-hidden rounded-md border border-border bg-surface"
        >
          <div className="grid grid-cols-2 gap-0.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- URL de preview signée/locale, voir storage/README.md */}
            <img src={item.beforeUrl} alt="Avant" className="aspect-[3/4] w-full object-cover" />
            {/* eslint-disable-next-line @next/next/no-img-element -- URL de preview signée/locale, voir storage/README.md */}
            <img src={item.afterUrl} alt="Après" className="aspect-[3/4] w-full object-cover" />
          </div>
          <div className="p-2.5">
            {item.caption && <p className="truncate text-sm text-ink">{item.caption}</p>}
            <button
              type="button"
              disabled={pending}
              onClick={() => handleDelete(item.id)}
              className="mt-1.5 text-xs text-muted underline decoration-border underline-offset-2 hover:text-danger disabled:opacity-50"
            >
              Retirer
            </button>
          </div>
        </motion.li>
      ))}
    </motion.ul>
  );
}
