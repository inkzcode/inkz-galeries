"use client";

import { useActionState, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  PRICING_MODES,
  PRICING_MODE_LABELS,
  WATERMARK_LEVELS,
  WATERMARK_LEVEL_LABELS,
  type PricingModeValue,
  type WatermarkLevelValue,
} from "@/lib/domain/gallery-form";
import type { GalleryFormState } from "./actions";

export type GalleryFormDefaults = {
  title: string;
  clientName: string;
  clientEmail: string;
  description: string;
  shootingType: string;
  shootingDate: string;
  watermarkLevel: WatermarkLevelValue;
  pricingMode: PricingModeValue;
  includedPhotosCount: string;
  extraPhotoPriceEuros: string;
  retouchPhilosophyEnabled: boolean;
  selfImageMessagesEnabled: boolean;
  beforeAfterEnabled: boolean;
};

const EMPTY_DEFAULTS: GalleryFormDefaults = {
  title: "",
  clientName: "",
  clientEmail: "",
  description: "",
  shootingType: "",
  shootingDate: "",
  watermarkLevel: "NONE",
  pricingMode: "DISABLED",
  includedPhotosCount: "",
  extraPhotoPriceEuros: "",
  retouchPhilosophyEnabled: false,
  selfImageMessagesEnabled: false,
  beforeAfterEnabled: false,
};

const inputClass =
  "rounded-md border border-border bg-paper px-3 py-2.5 text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent-tint";
const labelClass = "text-sm text-ink-soft";

export function GalleryForm({
  action,
  defaults = EMPTY_DEFAULTS,
  submitLabel,
}: {
  action: (state: GalleryFormState, formData: FormData) => Promise<GalleryFormState>;
  defaults?: GalleryFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [pricingMode, setPricingMode] = useState<PricingModeValue>(defaults.pricingMode);

  const showIncludedCount = pricingMode === "INCLUDED_PLUS_EXTRA";
  const showExtraPrice = pricingMode === "INCLUDED_PLUS_EXTRA" || pricingMode === "PER_PHOTO";

  const fieldError = (field: string) => state?.fieldErrors?.[field]?.[0];

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className={labelClass}>
          Titre du shooting *
        </label>
        <input
          id="title"
          name="title"
          defaultValue={defaults.title}
          required
          className={inputClass}
          placeholder="Ex. Portrait Julie — été 2026"
        />
        {fieldError("title") && (
          <p className="text-sm text-danger">{fieldError("title")}</p>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="clientName" className={labelClass}>
            Client (facultatif)
          </label>
          <input
            id="clientName"
            name="clientName"
            defaultValue={defaults.clientName}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="clientEmail" className={labelClass}>
            Email du client (facultatif)
          </label>
          <input
            id="clientEmail"
            name="clientEmail"
            type="email"
            defaultValue={defaults.clientEmail}
            className={inputClass}
          />
          {fieldError("clientEmail") && (
            <p className="text-sm text-danger">{fieldError("clientEmail")}</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="shootingDate" className={labelClass}>
            Date (facultatif)
          </label>
          <input
            id="shootingDate"
            name="shootingDate"
            type="date"
            defaultValue={defaults.shootingDate}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="shootingType" className={labelClass}>
            Type de photographie (facultatif)
          </label>
          <input
            id="shootingType"
            name="shootingType"
            defaultValue={defaults.shootingType}
            list="shooting-type-suggestions"
            className={inputClass}
            placeholder="Portrait, événement, culinaire…"
          />
          <datalist id="shooting-type-suggestions">
            <option value="Portrait" />
            <option value="Événement" />
            <option value="Modèle" />
            <option value="Entreprise" />
            <option value="Culinaire" />
            <option value="Projet créatif" />
          </datalist>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className={labelClass}>
          Description (facultatif)
        </label>
        <textarea
          id="description"
          name="description"
          defaultValue={defaults.description}
          rows={3}
          className={inputClass}
        />
      </div>

      <details className="rounded-md border border-border p-4">
        <summary className="cursor-pointer text-sm font-medium text-ink">
          Réglages avancés (facultatifs)
        </summary>

        <div className="mt-6 flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="watermarkLevel" className={labelClass}>
              Protection des aperçus (watermark)
            </label>
            <select
              id="watermarkLevel"
              name="watermarkLevel"
              defaultValue={defaults.watermarkLevel}
              className={inputClass}
            >
              {WATERMARK_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {WATERMARK_LEVEL_LABELS[level]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="pricingMode" className={labelClass}>
              Tarification
            </label>
            <select
              id="pricingMode"
              name="pricingMode"
              value={pricingMode}
              onChange={(event) => setPricingMode(event.target.value as PricingModeValue)}
              className={inputClass}
            >
              {PRICING_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {PRICING_MODE_LABELS[mode]}
                </option>
              ))}
            </select>
            {fieldError("pricingMode") && (
              <p className="text-sm text-danger">{fieldError("pricingMode")}</p>
            )}
          </div>

          {showIncludedCount && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="includedPhotosCount" className={labelClass}>
                Nombre de photos incluses
              </label>
              <input
                id="includedPhotosCount"
                name="includedPhotosCount"
                inputMode="numeric"
                defaultValue={defaults.includedPhotosCount}
                className={inputClass}
              />
              {fieldError("includedPhotosCount") && (
                <p className="text-sm text-danger">{fieldError("includedPhotosCount")}</p>
              )}
            </div>
          )}

          {showExtraPrice && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="extraPhotoPriceEuros" className={labelClass}>
                Prix par photo supplémentaire (€)
              </label>
              <input
                id="extraPhotoPriceEuros"
                name="extraPhotoPriceEuros"
                inputMode="decimal"
                defaultValue={defaults.extraPhotoPriceEuros}
                className={inputClass}
                placeholder="7"
              />
              {fieldError("extraPhotoPriceEuros") && (
                <p className="text-sm text-danger">{fieldError("extraPhotoPriceEuros")}</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-border pt-6">
            <p className={labelClass}>
              Fonctionnalités optionnelles côté client — à activer selon le
              type de shooting (sans objet pour de la nourriture ou un
              produit, par exemple).
            </p>
            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="retouchPhilosophyEnabled"
                defaultChecked={defaults.retouchPhilosophyEnabled}
                className="mt-1"
              />
              Afficher le message sur la philosophie de retouche
            </label>
            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="selfImageMessagesEnabled"
                defaultChecked={defaults.selfImageMessagesEnabled}
                className="mt-1"
              />
              Afficher des messages sur l&apos;image de soi en parcourant les
              photos
            </label>
            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="beforeAfterEnabled"
                defaultChecked={defaults.beforeAfterEnabled}
                className="mt-1"
              />
              Montrer des exemples avant/après post-production
            </label>
          </div>
        </div>
      </details>

      <AnimatePresence>
        {state?.error && (
          <motion.p
            role="alert"
            className="text-sm text-danger"
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            {state.error}
          </motion.p>
        )}
      </AnimatePresence>

      <motion.button
        type="submit"
        disabled={pending}
        whileHover={pending ? undefined : { scale: 1.03, y: -2 }}
        whileTap={pending ? undefined : { scale: 0.97 }}
        className="inline-flex w-fit items-center justify-center rounded-md bg-accent px-6 py-3 text-sm font-medium text-paper shadow-sm hover:shadow-md disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
      >
        {pending ? "Enregistrement…" : submitLabel}
      </motion.button>
    </form>
  );
}
