export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { saveUpload } from "@/lib/upload";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  try {
    const { url, size } = await saveUpload(file);

    // Record in media library (best-effort — don't fail the upload if this errors)
    try {
      await prisma.mediaFile.upsert({
        where: { url },
        update: {},
        create: {
          url,
          filename: file.name,
          mimeType: "image/webp", // saveUpload always outputs webp
          size,                   // ACTUAL stored (compressed) size
          uploadedBy: (session as any).user?.email ?? null,
        },
      });
    } catch { /* non-fatal */ }

    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
