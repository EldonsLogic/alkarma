import { prisma } from "./prisma";

export interface CouponValidationResult {
  valid: boolean;
  error?: string;
  discount: number;        // monetary discount in the given currency
  freeShipping: boolean;
  code?: string;
  discountType?: string;
}

/**
 * Single source of truth for coupon validation + discount calculation.
 * Used by both /api/cart/coupon (preview) and /api/checkout (authoritative).
 *
 * `subtotal` MUST be the server-computed subtotal, never a client value.
 */
export async function validateCoupon(
  rawCode: string,
  subtotal: number
): Promise<CouponValidationResult> {
  const base = { valid: false, discount: 0, freeShipping: false };

  if (!rawCode || typeof rawCode !== "string") {
    return { ...base, error: "Code required" };
  }

  const coupon = await prisma.coupon.findUnique({
    where: { code: rawCode.toUpperCase().trim() },
  });

  if (!coupon || !coupon.isActive) {
    return { ...base, error: "Invalid or expired coupon code" };
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { ...base, error: "This coupon has expired" };
  }

  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return { ...base, error: "This coupon has reached its usage limit" };
  }

  const minOrder = Number(coupon.minOrderEgp ?? 0);
  if (subtotal < minOrder) {
    return { ...base, error: `Minimum order of ${minOrder} EGP required for this code` };
  }

  let discount = 0;
  switch (coupon.discountType) {
    case "PERCENTAGE":
      discount = (subtotal * Number(coupon.discountValue)) / 100;
      break;
    case "FIXED_EGP":
      discount = Number(coupon.discountValue);
      break;
    case "FREE_SHIPPING":
      discount = 0;
      break;
  }

  // Never let a discount exceed the subtotal
  discount = Math.min(discount, subtotal);
  discount = Math.round(discount * 100) / 100;

  return {
    valid: true,
    discount,
    freeShipping: coupon.discountType === "FREE_SHIPPING" || coupon.freeShipping,
    code: coupon.code,
    discountType: coupon.discountType,
  };
}
