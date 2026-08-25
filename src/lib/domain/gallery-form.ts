import { z } from "zod";

// Validation du formulaire de création/modification d'un shooting — logique
// métier pure (voir README.md de ce dossier), aucune dépendance à Next.js ou
// Prisma. Les valeurs des enums sont dupliquées ici volontairement plutôt que
// réimportées depuis le client Prisma généré, pour que ce fichier reste
// indépendant de l'ORM ; elles doivent rester synchronisées avec
// prisma/schema.prisma (`WatermarkLevel`, `PricingMode`).

export const WATERMARK_LEVELS = ["NONE", "LIGHT", "STANDARD", "STRONG"] as const;
export type WatermarkLevelValue = (typeof WATERMARK_LEVELS)[number];

export const PRICING_MODES = [
  "DISABLED",
  "FREE",
  "INCLUDED_PLUS_EXTRA",
  "PER_PHOTO",
] as const;
export type PricingModeValue = (typeof PRICING_MODES)[number];

export const WATERMARK_LEVEL_LABELS: Record<WatermarkLevelValue, string> = {
  NONE: "Aucune",
  LIGHT: "Légère",
  STANDARD: "Standard",
  STRONG: "Renforcée",
};

export const PRICING_MODE_LABELS: Record<PricingModeValue, string> = {
  DISABLED: "Paiement désactivé",
  FREE: "Shooting entièrement gratuit",
  INCLUDED_PLUS_EXTRA: "Photos incluses + supplément par photo",
  PER_PHOTO: "Aucune photo incluse, prix par photo",
};

// `null` arrive quand un champ n'existe même pas dans le FormData — c'est
// le cas normal pour les champs conditionnels du formulaire (ex.
// includedPhotosCount/extraPhotoPriceEuros, masqués tant que pricingMode
// n'est pas INCLUDED_PLUS_EXTRA/PER_PHOTO, voir gallery-form.tsx) :
// formData.get() renvoie alors null, pas une chaîne vide.
const emptyToUndefined = (value: unknown) =>
  value === null || (typeof value === "string" && value.trim() === "")
    ? undefined
    : value;

const optionalText = z.preprocess(emptyToUndefined, z.string().trim().optional());

const optionalEmail = z.preprocess(
  emptyToUndefined,
  z.email("Adresse email invalide.").optional(),
);

// Champs numériques saisis en euros dans le formulaire (plus lisible pour le
// photographe), convertis en centimes avant d'atteindre la base — voir
// PROJECT_CONTEXT.md §6 ("Argent en centimes").
const optionalEuros = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .regex(/^\d+([.,]\d{1,2})?$/, "Montant invalide (ex. 7 ou 7,50).")
    .optional(),
);

const optionalCount = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .regex(/^\d+$/, "Doit être un nombre entier.")
    .optional(),
);

export const GalleryFormSchema = z
  .object({
    title: z.string().trim().min(1, "Le titre est requis."),
    clientName: optionalText,
    clientEmail: optionalEmail,
    description: optionalText,
    shootingType: optionalText,
    shootingDate: optionalText, // "YYYY-MM-DD" (input type="date")
    watermarkLevel: z.enum(WATERMARK_LEVELS),
    pricingMode: z.enum(PRICING_MODES),
    includedPhotosCount: optionalCount,
    extraPhotoPriceEuros: optionalEuros,
    retouchPhilosophyEnabled: z.boolean(),
    selfImageMessagesEnabled: z.boolean(),
    beforeAfterEnabled: z.boolean(),
    portfolioEnabled: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (
      data.pricingMode === "INCLUDED_PLUS_EXTRA" &&
      (data.includedPhotosCount === undefined ||
        data.extraPhotoPriceEuros === undefined)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["pricingMode"],
        message:
          "Ce mode nécessite un nombre de photos incluses et un prix par photo supplémentaire.",
      });
    }
    if (data.pricingMode === "PER_PHOTO" && data.extraPhotoPriceEuros === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["pricingMode"],
        message: "Ce mode nécessite un prix par photo.",
      });
    }
  });

export type GalleryFormInput = z.infer<typeof GalleryFormSchema>;

// Conversion euros (saisie) → centimes (stockage), voir PROJECT_CONTEXT.md §6.
export function eurosToCents(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const normalized = value.replace(",", ".");
  return Math.round(parseFloat(normalized) * 100);
}
