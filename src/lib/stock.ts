import { prisma } from "./prisma";
import { sendBackInStock, sendLowStockAlert } from "./email";

/** A book at or below this quantity shows the low-stock alert + alerts managers. */
export const LOW_STOCK_THRESHOLD = 3;

/** Store-manager address(es) for stock alerts (comma-separated env, else the store inbox). */
function managerEmails(): string[] {
  const raw = process.env.ADMIN_ALERT_EMAIL || process.env.SMTP_FROM || "info@alkarmabooks.com";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * A book was restocked (0 → in stock): email everyone waiting on it, then clear
 * those sign-ups (so they can re-subscribe if it sells out again). Fire-and-forget,
 * never throws.
 */
export async function notifyBackInStock(bookId: string): Promise<void> {
  try {
    const subs = await prisma.stockNotification.findMany({
      where: { bookId, notifiedAt: null },
      select: { id: true, email: true, locale: true },
    });
    if (subs.length === 0) return;

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { title: true, titleAr: true, slug: true },
    });
    if (!book) return;

    for (const s of subs) {
      try {
        await sendBackInStock(s.email, book);
      } catch {
        /* skip a single failed send */
      }
    }
    // Clear the notified sign-ups
    await prisma.stockNotification.deleteMany({ where: { id: { in: subs.map((s) => s.id) } } });
  } catch {
    /* never break the caller's flow */
  }
}

/** Email store manager(s) that a book is low/out of stock. Fire-and-forget. */
export async function alertLowStock(book: { title: string; slug: string; stock: number }): Promise<void> {
  try {
    for (const to of managerEmails()) {
      try {
        await sendLowStockAlert(to, book);
      } catch {
        /* skip */
      }
    }
  } catch {
    /* ignore */
  }
}
