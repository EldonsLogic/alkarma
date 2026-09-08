export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/rate-limit";
import { enforceTurnstile } from "@/lib/turnstile";

const schema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email().max(254),
  // 8+ chars with at least one letter and one number
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200)
    .regex(/[A-Za-z]/, "Password must contain a letter")
    .regex(/[0-9]/, "Password must contain a number"),
  country: z.string().length(2).default("EG"),
});

export async function POST(req: NextRequest) {
  // Block bot mass-registration: max 5 accounts per IP per 10 min
  const limited = await enforceRateLimit(req, "register", { limit: 5, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  // Bot protection (Cloudflare Turnstile) — no-op until keys are configured
  const captchaFail = await enforceTurnstile(req, body.turnstileToken);
  if (captchaFail) return captchaFail;

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: first }, { status: 400 });
  }

  const { firstName, lastName, password, country } = parsed.data;
  const email = parsed.data.email.toLowerCase().trim(); // normalize to prevent case-variant dupes

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { firstName, lastName, email, passwordHash, country, role: "CUSTOMER" },
  });

  // Claim any guest orders placed with this email so they appear in the account.
  await prisma.order
    .updateMany({
      where: { userId: null, guestEmail: email },
      data: { userId: user.id, guestEmail: null, guestName: null },
    })
    .catch(() => {});

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}
