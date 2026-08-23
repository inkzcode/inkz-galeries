import { z } from "zod";

export const LoginFormSchema = z.object({
  email: z.string().trim().min(1, "Adresse email requise."),
  password: z.string().min(1, "Mot de passe requis."),
});

export type LoginFormState = { error?: string } | undefined;
