import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "Body required" }, { status: 400 });

  const note = await prisma.customerNote.create({
    data: {
      customerId: params.id,
      body: body.trim(),
      authorEmail: session.user?.email ?? null,
    },
  });
  return NextResponse.json(note);
}
