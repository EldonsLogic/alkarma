import { prisma } from "@/lib/prisma";

export interface GiftCardValidation {
  valid: boolean;
  id?: string;
  code?: string;
  balance?: number;
  currency?: string;
  error?: string;
}

/**
 * Validate a gift-card code for the given currency. A gift card is a prepaid
 * balance — unlike a coupon it can be used partially across several orders.
 */
export async function validateGiftCard(
  rawCode: string | undefined | null,
): Promise<GiftCardValidation> {
  const code = rawCode?.toUpperCase().trim();
  if (!code) return { valid: false, error: "Code required" };

  const gc = await prisma.giftCard.findUnique({ where: { code } });
  if (!gc || !gc.isActive) return { valid: false, error: "Invalid or inactive gift card" };
  if (gc.expiresAt && gc.expiresAt < new Date()) return { valid: false, error: "This gift card has expired" };
  if (gc.balance <= 0) return { valid: false, error: "This gift card has no balance left" };

  return { valid: true, id: gc.id, code: gc.code, balance: Number(gc.balance), currency: gc.currency };
}
