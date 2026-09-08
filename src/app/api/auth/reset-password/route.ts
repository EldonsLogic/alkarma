export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { enforceRateLimit } from "@/lib/rate-limit";

/** Strong-ish password policy: 8+ chars, at least one letter and one number. */
function isStrongPassword(pw: string): boolean {
  return pw.length >= 8 && /[A-Za-z]/.test(pw) && /[0-9]/.test(pw);
}

export async function POST(req: NextRequest) {
  // Throttle brute-force token guessing
  const limited = await enforceRateLimit(req, "reset-password", { limit: 10, windowMs: 60 * 60 * 1000 });
  if (limited) return limited;

  try {
    const { token, password } = await req.json();

    if (!token || !password || typeof token !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Token and password are required." }, { status: 400 });
    }

    if (!isStrongPassword(password)) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters and include a letter and a number." },
        { status: 400 }
      );
    }

    // Look up the cryptographically-random token issued by forgot-password.
    // This is the ONLY accepted token format — no client-derivable tokens.
    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!record || record.expires < new Date()) {
      // Clean up an expired record if present
      if (record) {
        await prisma.passwordResetToken.delete({ where: { id: record.id } }).catch(() => {});
      }
      return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Update password and consume the token atomically (one-time use)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.delete({ where: { id: record.id } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
