export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendOrderConfirmation, sendAdminNewOrder } from "@/lib/email";
import { resolveRateById } from "@/lib/shipping";
import { getPrice } from "@/lib/currency";
import { alertLowStock, LOW_STOCK_THRESHOLD } from "@/lib/stock";
import { validateCoupon } from "@/lib/coupon";
import { validateGiftCard } from "@/lib/gift-card";
import { enforceRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const checkoutSchema = z.object({
  shippingAddress: z.object({
    fullName: z.string().min(2).max(120),
    phone: z.string().min(6).max(30),
    line1: z.string().min(3).max(200),
    line2: z.string().max(200).optional(),
    city: z.string().min(2).max(100),
    state: z.string().max(100).optional(),
    governorate: z.string().max(40).optional(), // EG governorate code
    postcode: z.string().max(20).optional(),
    country: z.string().length(2),
  }),
  paymentMethod: z.enum(["ONLINE", "COD"]),
  email: z.string().email().max(254).optional(), // required for guest checkout
  couponCode: z.string().max(40).optional(),
  giftCardCode: z.string().max(40).optional(),
  shippingRateId: z.string().optional(),
  // Client sends only WHAT they want and HOW MANY — never the price.
  items: z
    .array(
      z.object({
        bookId: z.string().optional(),
        bundleId: z.string().optional(),
        quantity: z.number().int().positive().max(99),
      })
    )
    .min(1)
    .max(100),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? null; // null → guest checkout

  // Throttle order spam / card-testing (keyed by account, or by IP for guests)
  const limited = await enforceRateLimit(req, "checkout", { limit: 10, windowMs: 60 * 1000 }, userId ?? undefined);
  if (limited) return limited;

  const body = await req.json();
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { shippingAddress, paymentMethod, email, couponCode, giftCardCode, shippingRateId, items } = parsed.data;

  // Customer email: the account's when logged in, otherwise the guest's.
  const userEmail = session?.user?.email ?? email ?? null;
  if (!userEmail) {
    return NextResponse.json({ error: "An email address is required to place your order." }, { status: 400 });
  }
  const isGuest = !userId;

  // Checkout is currently available inside Egypt only (browsing stays open).
  // Enforce by the visitor's real location (Vercel edge header); if absent
  // (e.g. local dev), fall back to the submitted country.
  const ipCountry = (req.headers.get("x-vercel-ip-country") ?? "").toUpperCase();
  const effectiveCountry = ipCountry || shippingAddress.country;
  if (effectiveCountry !== "EG") {
    return NextResponse.json(
      { error: "Checkout is currently available inside Egypt only." },
      { status: 403 },
    );
  }

  // COD only for Egypt
  if (paymentMethod === "COD" && shippingAddress.country !== "EG") {
    return NextResponse.json({ error: "Pay on Delivery is only available for Egypt" }, { status: 400 });
  }

  // ── Resolve REAL prices from the database (never trust the client) ──────────
  const bookIds = items.filter((i) => i.bookId).map((i) => i.bookId!) as string[];
  const bundleIds = items.filter((i) => i.bundleId).map((i) => i.bundleId!) as string[];

  const [books, bundles] = await Promise.all([
    bookIds.length
      ? prisma.book.findMany({ where: { id: { in: bookIds }, isActive: true } })
      : Promise.resolve([]),
    bundleIds.length
      ? prisma.bundle.findMany({ where: { id: { in: bundleIds }, isActive: true } })
      : Promise.resolve([]),
  ]);

  const bookMap = new Map(books.map((b) => [b.id, b]));
  const bundleMap = new Map(bundles.map((b) => [b.id, b]));

  // Build authoritative line items with server-side prices + stock validation
  const lineItems: {
    bookId: string | null;
    bundleId: string | null;
    title: string;
    quantity: number;
    unitPrice: number;
  }[] = [];

  for (const item of items) {
    if (item.bookId) {
      const book = bookMap.get(item.bookId);
      if (!book) {
        return NextResponse.json({ error: "One or more items are no longer available." }, { status: 409 });
      }
      if (book.stock < item.quantity) {
        return NextResponse.json(
          { error: `"${book.title}" only has ${book.stock} in stock.` },
          { status: 409 }
        );
      }
      lineItems.push({
        bookId: book.id,
        bundleId: null,
        title: book.title,
        quantity: item.quantity,
        // effective price = discounted when on sale, else regular
        unitPrice: getPrice(book),
      });
    } else if (item.bundleId) {
      const bundle = bundleMap.get(item.bundleId);
      if (!bundle) {
        return NextResponse.json({ error: "One or more items are no longer available." }, { status: 409 });
      }
      if (bundle.stock < item.quantity) {
        return NextResponse.json(
          { error: `"${bundle.name}" only has ${bundle.stock} in stock.` },
          { status: 409 }
        );
      }
      lineItems.push({
        bookId: null,
        bundleId: bundle.id,
        title: bundle.name,
        quantity: item.quantity,
        unitPrice: Number(bundle.priceEgp),
      });
    } else {
      return NextResponse.json({ error: "Each item must reference a book or bundle." }, { status: 400 });
    }
  }

  const subtotal = lineItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  // ── Server-computed shipping (never trust the client) ───────────────────────
  const rate = await resolveRateById(
    shippingRateId ?? "",
    shippingAddress.country,
    subtotal,
    shippingAddress.governorate
  );
  let shippingFee = rate?.price ?? 0;

  // ── Server-validated coupon ─────────────────────────────────────────────────
  let discount = 0;
  let appliedCoupon: string | null = null;
  if (couponCode) {
    const result = await validateCoupon(couponCode, subtotal);
    if (result.valid) {
      discount = result.discount;
      appliedCoupon = result.code ?? null;
      if (result.freeShipping) shippingFee = 0;
    }
    // Invalid coupon → silently ignored (no discount), order still proceeds
  }

  // ── Server-validated gift card (prepaid balance applied after the coupon) ────
  const dueBeforeGiftCard = Math.max(0, subtotal + shippingFee - discount);
  let giftCardDiscount = 0;
  let appliedGiftCardId: string | null = null;
  let appliedGiftCardCode: string | null = null;
  if (giftCardCode) {
    const gc = await validateGiftCard(giftCardCode);
    if (gc.valid && gc.id && gc.balance) {
      giftCardDiscount = Math.min(gc.balance, dueBeforeGiftCard);
      appliedGiftCardId = gc.id;
      appliedGiftCardCode = gc.code ?? null;
    }
    // Invalid gift card → silently ignored, order still proceeds
  }

  const total = Math.max(0, dueBeforeGiftCard - giftCardDiscount);

  // ── Persist order + decrement stock atomically (retry on the rare
  //    order-number collision under concurrent checkouts) ──────────────────────
  let order;
  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
   try {
    order = await prisma.$transaction(async (tx) => {
      // Sequential order number starting at ALK-100001
      const count = await tx.order.count();
      const orderNumber = `ALK-${100000 + count + 1}`;

      const created = await tx.order.create({
        data: {
          orderNumber,
          userId: userId ?? null,
          guestEmail: isGuest ? userEmail : null,
          guestName: isGuest ? shippingAddress.fullName : null,
          subtotal,
          shippingFee,
          discount,
          giftCardDiscount,
          giftCardCode: appliedGiftCardCode,
          total,
          couponCode: appliedCoupon,
          paymentMethod,
          paymentStatus: "UNPAID",
          shippingAddress: JSON.stringify(shippingAddress),
          items: {
            create: lineItems.map((i) => ({
              bookId: i.bookId,
              bundleId: i.bundleId,
              title: i.title,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
            })),
          },
        },
      });

      // Decrement stock with a guard so it can never go negative
      for (const i of lineItems) {
        if (i.bookId) {
          const res = await tx.book.updateMany({
            where: { id: i.bookId, stock: { gte: i.quantity } },
            data: { stock: { decrement: i.quantity }, salesCount: { increment: i.quantity } },
          });
          if (res.count === 0) {
            // Stock changed between read and write — abort the whole order
            throw new Error("OUT_OF_STOCK");
          }
        } else if (i.bundleId) {
          const res = await tx.bundle.updateMany({
            where: { id: i.bundleId, stock: { gte: i.quantity } },
            data: { stock: { decrement: i.quantity } },
          });
          if (res.count === 0) throw new Error("OUT_OF_STOCK");
        }
      }

      // Increment coupon usage only on a successful order
      if (appliedCoupon) {
        await tx.coupon.update({
          where: { code: appliedCoupon },
          data: { usedCount: { increment: 1 } },
        }).catch(() => {});
      }

      // Redeem the gift card: decrement its balance (guarded so it can't go
      // negative under concurrent use) and record the redemption.
      if (appliedGiftCardId && giftCardDiscount > 0) {
        const res = await tx.giftCard.updateMany({
          where: { id: appliedGiftCardId, balance: { gte: giftCardDiscount } },
          data: { balance: { decrement: giftCardDiscount } },
        });
        if (res.count === 0) throw new Error("GIFT_CARD_CHANGED");
        await tx.giftCardRedemption.create({
          data: { giftCardId: appliedGiftCardId, orderId: created.id, amount: giftCardDiscount },
        });
      }

      return created;
    });
    break; // success — leave the retry loop
   } catch (err) {
    if ((err as Error).message === "OUT_OF_STOCK") {
      return NextResponse.json({ error: "Sorry, an item just went out of stock. Please review your basket." }, { status: 409 });
    }
    if ((err as Error).message === "GIFT_CARD_CHANGED") {
      return NextResponse.json({ error: "Your gift card balance just changed. Please re-apply it and try again." }, { status: 409 });
    }
    // Duplicate order number under a concurrent checkout → retry with a new one
    if ((err as { code?: string })?.code === "P2002" && attempt < MAX_ATTEMPTS - 1) continue;
    console.error("[checkout]", err);
    return NextResponse.json({ error: "Could not place order. Please try again." }, { status: 500 });
   }
  }
  if (!order) {
    return NextResponse.json({ error: "Could not place order. Please try again." }, { status: 500 });
  }

  // Clear the saved cart for logged-in customers (guests have none server-side)
  if (userId) {
    await prisma.cartItem.deleteMany({ where: { userId } }).catch(() => {});
  }

  // Send confirmation email (non-critical)
  try {
    await sendOrderConfirmation(
      userEmail!,
      order.orderNumber,
      lineItems.map((i) => ({ title: i.title, quantity: i.quantity, unitPrice: i.unitPrice })),
      total,
      "EGP"
    );
  } catch { /* email is non-critical */ }

  // Notify the store's admin inbox that a new order arrived
  try {
    await sendAdminNewOrder({
      orderNumber: order.orderNumber,
      orderId: order.id,
      customerEmail: userEmail ?? "",
      items: lineItems.map((i) => ({ title: i.title, quantity: i.quantity })),
      total,
      paymentMethod,
    });
  } catch { /* non-critical */ }

  // Alert store manager(s) about any book that just crossed the low-stock line
  for (const i of lineItems) {
    if (!i.bookId) continue;
    const b = bookMap.get(i.bookId);
    if (!b) continue;
    const newStock = b.stock - i.quantity;
    if (b.stock > LOW_STOCK_THRESHOLD && newStock <= LOW_STOCK_THRESHOLD) {
      await alertLowStock({ title: b.title, slug: b.slug, stock: newStock });
    }
  }

  return NextResponse.json({ orderId: order.id, orderNumber: order.orderNumber }, { status: 201 });
}
