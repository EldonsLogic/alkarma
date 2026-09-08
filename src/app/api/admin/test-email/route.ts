import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { sendOrderConfirmation, sendPasswordReset, sendWelcomeEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { to, type } = await req.json();
  if (!to) return NextResponse.json({ error: "Recipient email required" }, { status: 400 });

  try {
    if (type === "order") {
      await sendOrderConfirmation(
        to,
        "TEST-001",
        [
          { title: "Palace Walk — Naguib Mahfouz", quantity: 1, unitPrice: 299 },
          { title: "Atomic Habits — James Clear", quantity: 2, unitPrice: 199 },
        ],
        697,
        "EGP"
      );
    } else if (type === "reset") {
      await sendPasswordReset(to, "https://alkarmabooks.com/reset-password?token=test-token-123");
    } else {
      // default: welcome
      await sendWelcomeEmail(to, "Ahmed");
    }
    return NextResponse.json({ ok: true, message: `${type ?? "welcome"} email sent to ${to}` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[test-email]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
