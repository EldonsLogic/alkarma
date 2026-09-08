import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { tag } = await req.json();
  if (!tag?.trim()) return NextResponse.json({ error: "Tag required" }, { status: 400 });

  const clean = tag.trim().toLowerCase().replace(/\s+/g, "-");

  // upsert (ignore if already exists)
  await prisma.customerTag.upsert({
    where: { customerId_tag: { customerId: params.id, tag: clean } },
    update: {},
    create: { customerId: params.id, tag: clean },
  });

  return NextResponse.json({ tag: clean });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { tag } = await req.json();
  if (!tag) return NextResponse.json({ error: "Tag required" }, { status: 400 });

  await prisma.customerTag.delete({
    where: { customerId_tag: { customerId: params.id, tag } },
  });

  return NextResponse.json({ ok: true });
}
