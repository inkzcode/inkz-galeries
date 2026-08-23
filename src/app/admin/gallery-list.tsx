"use client";

import Link from "next/link";
import { motion, type Variants } from "motion/react";
import { GALLERY_STATUS_LABELS } from "@/lib/domain/gallery-status";
import type { listGalleries } from "@/lib/services/gallery-service";

type Gallery = Awaited<ReturnType<typeof listGalleries>>[number];

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function GalleryList({ galleries }: { galleries: Gallery[] }) {
  return (
    <motion.ul
      className="mt-8 divide-y divide-border border-t border-border"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {galleries.map((gallery) => (
        <motion.li key={gallery.id} variants={item}>
          <motion.div whileHover={{ x: 6 }} transition={{ duration: 0.2, ease: "easeOut" }}>
            <Link
              href={`/admin/galleries/${gallery.id}`}
              className="-mx-3 flex flex-col gap-1 rounded-md px-3 py-4 hover:bg-surface sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-ink">{gallery.title}</p>
                {gallery.clientName && (
                  <p className="text-sm text-muted">{gallery.clientName}</p>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted">
                <span>
                  {gallery._count.photos} photo
                  {gallery._count.photos > 1 ? "s" : ""}
                </span>
                <span className="rounded-full bg-accent-tint px-3 py-1 text-ink-soft">
                  {GALLERY_STATUS_LABELS[gallery.status]}
                </span>
              </div>
            </Link>
          </motion.div>
        </motion.li>
      ))}
    </motion.ul>
  );
}
