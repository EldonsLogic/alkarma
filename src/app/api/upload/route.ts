export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { saveUpload } from "@/lib/upload";
import { prisma } from "@/lib/prisma";
import { attachCoverByFilename } from "@/lib/coverMatch";

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

    // Attach to the book straight away when the filename names one (ISBN,
    // slug or title). This used to wait for the Media Library's bulk button —
    // and that button never replaces an existing cover, so swapping a cover
    // meant delete → upload → button and still didn't take. Best-effort: a
    // file that names no book is simply a library file.
    let book: { id: string; title: string; replaced: boolean } | null = null;
    try { book = await attachCoverByFilename(file.name, url); } catch { /* non-fatal */ }

    return NextResponse.json({ url, book });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
