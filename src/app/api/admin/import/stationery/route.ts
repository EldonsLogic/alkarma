export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/slug";
import { syncTags } from "@/lib/product-admin";
import * as XLSX from "xlsx";

// Blank bilingual template
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const headers = [
    "title", "titleAr",
    "subtitle", "subtitleAr",
    "description", "descriptionAr",
    "coverUrl",
    "priceEgp", "compareAtEgp",
    "stock", "lowStockAt",
    "isActive", "isFeatured",
    "categories", "tags",
  ];
  const example = [
    "A5 Dotted Notebook", "دفتر منقط A5",
    "120 gsm, 160 pages", "١٢٠ جرام، ١٦٠ صفحة",
    "Premium dotted notebook for journaling.", "دفتر منقط فاخر للتدوين.",
    "",
    "180", "6", "", "",
    "40", "5",
    "true", "false",
    "Notebooks & Journals|دفاتر ومفكرات", "Imported",
  ];
  const csv = [headers.join(","), example.join(",")].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"stationery-import-template.csv\"",
    },
  });
}

function normalise(s: string): string {
  return s.toLowerCase().replace(/[-\s.]/g, "");
}

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

  // Stationery category resolver (slug / EN name / AR name)
  const cats = await prisma.category.findMany({
    where: { kind: "STATIONERY" },
    select: { id: true, slug: true, name: true, nameAr: true },
  });
  const lookup = new Map<string, string>();
  for (const c of cats) {
    lookup.set(normalise(c.slug), c.id);
    lookup.set(normalise(c.name), c.id);
    if (c.nameAr) lookup.set(normalise(c.nameAr), c.id);
  }
  const resolveCat = (t: string) => lookup.get(normalise(t)) ?? null;

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer", raw: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  if (rows.length === 0) return NextResponse.json({ error: "File is empty." }, { status: 400 });

  const results = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    const title = String(row.title ?? "").trim();
    const titleAr = String(row.titleAr ?? "").trim() || null;
    const priceEgp = parseFloat(String(row.priceEgp ?? ""));

    if (!title && !titleAr) { results.errors.push(`Row ${rowNum}: a name (EN or AR) is required.`); results.skipped++; continue; }
    if (isNaN(priceEgp)) { results.errors.push(`Row ${rowNum}: priceEgp must be a number.`); results.skipped++; continue; }

    const slug = toSlug(title || titleAr || "stationery");
    const data = {
      type: "STATIONERY",
      title: title || titleAr || "",
      titleAr,
      subtitle: String(row.subtitle ?? "").trim() || null,
      subtitleAr: String(row.subtitleAr ?? "").trim() || null,
      synopsis: String(row.description ?? "").trim() || "",
      synopsisAr: String(row.descriptionAr ?? "").trim() || null,
      author: "",
      coverUrl: String(row.coverUrl ?? "").trim() || "/covers/placeholder.jpg",
      priceEgp,
      compareAtEgp: row.compareAtEgp ? parseFloat(String(row.compareAtEgp)) : null,
      stock: parseInt(String(row.stock ?? "0")) || 0,
      lowStockAt: parseInt(String(row.lowStockAt ?? "5")) || 5,
      isActive: String(row.isActive ?? "true").toLowerCase() !== "false",
      isFeatured: String(row.isFeatured ?? "false").toLowerCase() === "true",
    };

    try {
      const existing = await prisma.book.findUnique({ where: { slug } });
      let id: string;
      if (existing) {
        await prisma.book.update({ where: { slug }, data });
        id = existing.id;
        results.updated++;
      } else {
        let finalSlug = slug; let n = 1;
        while (await prisma.book.findUnique({ where: { slug: finalSlug } })) finalSlug = `${slug}-${n++}`;
        const created = await prisma.book.create({ data: { ...data, slug: finalSlug } });
        id = created.id;
        results.created++;
      }

      await syncTags(id, String(row.tags ?? ""));

      const tokens = String(row.categories ?? "").split("|").map((s) => s.trim()).filter(Boolean);
      if (tokens.length) {
        const ids = new Set<string>(); const unmatched: string[] = [];
        tokens.forEach((t) => { const cid = resolveCat(t); if (cid) ids.add(cid); else unmatched.push(t); });
        await prisma.bookCategory.deleteMany({ where: { bookId: id } });
        if (ids.size) await prisma.bookCategory.createMany({ data: Array.from(ids).map((categoryId) => ({ bookId: id, categoryId })) });
        if (unmatched.length) results.errors.push(`Row ${rowNum} (${data.title}): unknown stationery categor${unmatched.length === 1 ? "y" : "ies"} skipped — ${unmatched.join(", ")}.`);
      }
    } catch (err) {
      results.errors.push(`Row ${rowNum} (${data.title}): ${(err as Error).message}`);
      results.skipped++;
    }
  }

  return NextResponse.json({
    ok: true,
    message: `Imported: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped.`,
    ...results,
  });
}
