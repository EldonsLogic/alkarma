import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { slug, title, titleAr, body: pageBody, bodyAr, metaTitle, metaDesc, isPublished } = body;

  const finalSlug = slug || params.slug;
  const page = await prisma.page.upsert({
    where: { slug: finalSlug },
    update: { title, titleAr, body: pageBody, bodyAr, metaTitle, metaDesc, isPublished: !!isPublished },
    create: { slug: finalSlug, title, titleAr, body: pageBody, bodyAr, metaTitle, metaDesc, isPublished: !!isPublished },
  });
  await audit((session as { user?: { email?: string } })?.user?.email, "page.saved", "Settings", finalSlug, { title, published: !!isPublished });
  revalidatePath(`/${finalSlug}`);
  return NextResponse.json(page);
}

export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { title, titleAr, body: pageBody, bodyAr, metaTitle, metaDesc, isPublished } = body;

  const page = await prisma.page.update({
    where: { slug: params.slug },
    data: { title, titleAr, body: pageBody, bodyAr, metaTitle, metaDesc, isPublished: !!isPublished },
  });
  await audit((session as { user?: { email?: string } })?.user?.email, "page.updated", "Settings", params.slug, { title, published: !!isPublished });
  revalidatePath(`/${params.slug}`);
  return NextResponse.json(page);
}
