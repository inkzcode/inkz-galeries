"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "motion/react";
import { deleteItemAction } from "./actions";

export type PortfolioItemRow = {
  id: string;
  title: string;
  category: string | null;
  imageUrl: string;
};

const grid: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const tile: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export function PortfolioItemList({ items }: { items: PortfolioItemRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteItemAction(id);
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
          {/* eslint-disable-next-line @next/next/no-img-element -- URL de preview signée/locale, voir storage/README.md */}
          <img src={item.imageUrl} alt={item.title} className="aspect-[3/2] w-full object-cover" />
          <div className="p-2.5">
            <p className="truncate text-sm text-ink">{item.title}</p>
            {item.category && <p className="truncate text-xs text-muted">{item.category}</p>}
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
