"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { markPaymentReceived } from "@/lib/services/payment-service";

export async function markPaymentReceivedAction(galleryId: string) {
  await verifySession();
  await markPaymentReceived(galleryId);
  revalidatePath(`/admin/galleries/${galleryId}`);
}
