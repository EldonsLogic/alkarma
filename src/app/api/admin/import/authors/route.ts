export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

// Returns a blank template CSV
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const headers = ["slug", "name", "nameAr", "bio", "bioAr", "photoUrl"];

  const example = [
    "",
    "Paulo Coelho",
    "باولو كويلو",
    "Paulo Coelho is a Brazilian lyricist and novelist.",
    "",
    "https://covers.example.com/paulo-coelho.jpg",
  ];

  const csv = [headers.join(","), example.join(",")].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="authors-import-template.csv"',
    },
  });
}

// Import authors from CSV or XLSX
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!["csv", "xlsx", "xls"].includes(ext ?? "")) {
    return NextResponse.json({ error: "Only CSV, XLS, and XLSX files are supported." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer", raw: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (rawRows.length === 0) {
    return NextResponse.json({ error: "File is empty or has no data rows." }, { status: 400 });
  }

  const results = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowNum = i + 2;

    const name = String(row.name ?? "").trim();
    if (!name) {
      results.errors.push(`Row ${rowNum}: name is required.`);
      results.skipped++;
      continue;
    }

    // Build slug from provided value or from name
    let slug = String(row.slug ?? "").trim();
    if (!slug) {
      slug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80);
    }

    const data = {
      name,
      nameAr: String(row.nameAr ?? "").trim() || null,
      bio: String(row.bio ?? "").trim() || null,
      bioAr: String(row.bioAr ?? "").trim() || null,
      photoUrl: String(row.photoUrl ?? "").trim() || null,
    };

    try {
      const existing = await prisma.author.findUnique({ where: { slug } });

      if (existing) {
        await prisma.author.update({ where: { slug }, data });
        results.updated++;
      } else {
        // Ensure unique slug
        let finalSlug = slug;
        let suffix = 1;
        while (await prisma.author.findUnique({ where: { slug: finalSlug } })) {
          finalSlug = `${slug}-${suffix++}`;
        }
        await prisma.author.create({ data: { ...data, slug: finalSlug } });
        results.created++;
      }
    } catch (err) {
      results.errors.push(`Row ${rowNum} (${name}): ${(err as Error).message}`);
      results.skipped++;
    }
  }

  return NextResponse.json({
    message: `Import complete. ${results.created} created, ${results.updated} updated, ${results.skipped} skipped.`,
    ...results,
  });
}
