export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordReset } from "@/lib/email";
import { enforceRateLimit } from "@/lib/rate-limit";
import { enforceTurnstile } from "@/lib/turnstile";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  // Prevent reset-email bombing: max 3 requests per IP per 15 min
  const limited = await enforceRateLimit(req, "forgot-password", { limit: 3, windowMs: 15 * 60 * 1000 });
  if (limited) return limited;

  try {
    const { email, turnstileToken } = await req.json();

    // Bot protection — no-op until keys are configured
    const captchaFail = await enforceTurnstile(req, turnstileToken);
    if (captchaFail) return captchaFail;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (user) {
      // Cryptographically secure token stored in DB with 1-hour expiry
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.upsert({
        where: { userId: user.id },
        update: { token, expires },
        create: { userId: user.id, token, expires },
      });

      const resetUrl = `${process.env.AUTH_URL ?? "https://alkarmabooks.com"}/reset-password?token=${token}`;
      await sendPasswordReset(user.email, resetUrl);
    }

    // Always 200 — don't reveal whether the account exists
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
