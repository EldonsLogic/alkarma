/**
 * One-off catalogue copy: source (Jee) Supabase -> target (Alkarma) Supabase.
 *
 * Generic rather than hand-written per table: the column list for each model is
 * the INTERSECTION of the target's Prisma DMMF scalar fields and the columns the
 * source table actually has. That matters because the two schemas have drifted —
 * the target dropped eight USD columns and added dimensions/coverType/language,
 * so a naive SELECT * would fail in both directions. Columns only the target has
 * simply fall back to their schema defaults.
 *
 * coverUrl is copied verbatim on purpose: those URLs already point at the Vercel
 * Blob store both projects share, so covers resolve with no download or re-upload.
 *
 * Writes run inside one transaction with session_replication_role = replica, so
 * foreign keys are not enforced mid-copy and the table order cannot cause a
 * spurious failure. Idempotent: re-running skips rows that already exist.
 *
 *   --only=Book,Author   restrict to certain models
 *   --dry                report what would be copied, write nothing
 */
import { PrismaClient, Prisma } from "@prisma/client";

const src = new PrismaClient({ datasources: { db: { url: process.env.JEE_DIRECT_URL } } });
const dst = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });

/** Parents before children. Category/BookCategory are deliberately absent. */
const ORDER = ["Author", "Tag", "Book", "BookAuthor", "BookTag"];

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const only = args.find((a) => a.startsWith("--only="))?.slice(7).split(",").map((s) => s.trim());
const CHUNK = 500;

async function sourceColumns(table: string): Promise<Set<string>> {
  const rows: any = await src.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1`, table,
  );
  return new Set(rows.map((r: any) => r.column_name));
}

(async () => {
  const models = Prisma.dmmf.datamodel.models;
  const targets = ORDER.filter((m) => !only || only.includes(m));
  const summary: string[] = [];

  for (const name of targets) {
    const model = models.find((m) => m.name === name);
    if (!model) { console.log(`skip ${name}: not in target schema`); continue; }

    const table = model.dbName ?? model.name;
    const srcCols = await sourceColumns(table);
    if (!srcCols.size) { console.log(`skip ${name}: no such table in source`); continue; }

    const scalars = model.fields.filter((f) => f.kind === "scalar" || f.kind === "enum");
    const shared = scalars.filter((f) => srcCols.has(f.dbName ?? f.name));
    const missing = scalars.filter((f) => !srcCols.has(f.dbName ?? f.name)).map((f) => f.name);
    const cols = shared.map((f) => `"${f.dbName ?? f.name}"`).join(", ");

    const rows: any[] = await src.$queryRawUnsafe(`SELECT ${cols} FROM "${table}"`);
    const before = await (dst as any)[lower(name)].count();

    console.log(`\n${name}: ${rows.length} source rows | ${shared.length} shared columns` +
      (missing.length ? ` | target-only (defaulted): ${missing.join(", ")}` : ""));

    if (DRY) { summary.push(`${name}: would copy ${rows.length} (target has ${before})`); continue; }

    let written = 0;
    await dst.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET session_replication_role = replica`);
      for (let i = 0; i < rows.length; i += CHUNK) {
        const batch = rows.slice(i, i + CHUNK);
        const r = await (tx as any)[lower(name)].createMany({ data: batch, skipDuplicates: true });
        written += r.count;
        process.stdout.write(`  ${Math.min(i + CHUNK, rows.length)}/${rows.length}\r`);
      }
    }, { timeout: 120_000 });

    const after = await (dst as any)[lower(name)].count();
    const ok = after === rows.length;
    console.log(`  wrote ${written} · target ${before} -> ${after} · source ${rows.length} · ${ok ? "MATCH" : "MISMATCH"}`);
    summary.push(`${name.padEnd(12)} source ${String(rows.length).padStart(5)} · target ${String(after).padStart(5)} · ${ok ? "match" : "MISMATCH"}`);
  }

  console.log("\n=== summary ===");
  summary.forEach((s) => console.log("  " + s));
  await src.$disconnect(); await dst.$disconnect();
})();

function lower(s: string) { return s.charAt(0).toLowerCase() + s.slice(1); }
