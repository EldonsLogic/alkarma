/**
 * Import historical customers and orders from the previous site.
 *
 * Format is defined by import-templates/README.md — the CSVs are shaped to fit
 * this schema, not the other way round.
 *
 * Run:
 *   npx tsx --env-file .env.local scripts/import-history.ts \
 *     --customers ./import-templates/customers.csv \
 *     --orders ./import-templates/orders.csv [--dry]
 *
 * --dry validates and writes the report without touching the database.
 *
 * Idempotent: customers are matched on email, orders on orderNumber, so a
 * re-run updates rather than duplicating.
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { EG_GOVERNORATES } from "../src/lib/governorates";

const prisma = new PrismaClient();

// ─── CSV parsing (RFC 4180: quoted fields, embedded commas/newlines) ────────
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", inQuotes = false;
  const src = text.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const header = (rows.shift() ?? []).map((h) => h.trim());
  return rows
    .filter((r) => r.some((c) => c.trim() !== ""))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

// ─── Normalisers ───────────────────────────────────────────────────────────
const GOV_BY_CODE = new Map(EG_GOVERNORATES.map((g) => [g.code, g]));
const GOV_BY_NAME = new Map<string, string>();
for (const g of EG_GOVERNORATES) {
  GOV_BY_NAME.set(g.ar.trim(), g.code);
  GOV_BY_NAME.set(g.en.trim().toLowerCase(), g.code);
}
/** Accept a code, or an Arabic/English name, else null. */
function normGovernorate(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  if (GOV_BY_CODE.has(s)) return s;
  return GOV_BY_NAME.get(s) ?? GOV_BY_NAME.get(s.toLowerCase()) ?? null;
}

const STATUSES = ["PENDING","PAID","PROCESSING","SHIPPED","DELIVERED","CANCELLED","REFUNDED"];
const STATUS_ALIASES: Record<string, string> = {
  complete: "DELIVERED", completed: "DELIVERED", done: "DELIVERED", delivered: "DELIVERED",
  shipped: "SHIPPED", dispatched: "SHIPPED",
  processing: "PROCESSING", "on-hold": "PENDING", pending: "PENDING",
  cancelled: "CANCELLED", canceled: "CANCELLED", refunded: "REFUNDED", failed: "CANCELLED",
  "تم التسليم": "DELIVERED", "ملغي": "CANCELLED", "قيد التنفيذ": "PROCESSING",
};
function normStatus(v: string): { status: string; guessed: boolean } {
  const s = v.trim();
  if (!s) return { status: "DELIVERED", guessed: true };
  const up = s.toUpperCase();
  if (STATUSES.includes(up)) return { status: up, guessed: false };
  const alias = STATUS_ALIASES[s.toLowerCase()];
  if (alias) return { status: alias, guessed: false };
  return { status: "DELIVERED", guessed: true };
}

function normDate(v: string, fallback = new Date()): { date: Date; ok: boolean } {
  const s = v.trim();
  if (!s) return { date: fallback, ok: false };
  const d = new Date(s);
  return isNaN(d.getTime()) ? { date: fallback, ok: false } : { date: d, ok: true };
}

const money = (v: string): number | null => {
  const n = parseFloat((v || "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Report ────────────────────────────────────────────────────────────────
type Issue = { kind: string; ref: string; detail: string };
const issues: Issue[] = [];
const flag = (kind: string, ref: string, detail: string) => issues.push({ kind, ref, detail });

async function main() {
  const argv = process.argv.slice(2);
  const arg = (n: string) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const dry = argv.includes("--dry");
  const customersPath = arg("--customers");
  const ordersPath = arg("--orders");

  if (!customersPath && !ordersPath) {
    console.error("Usage: --customers <csv> --orders <csv> [--dry]");
    process.exit(1);
  }
  console.log(dry ? "DRY RUN — nothing will be written\n" : "IMPORTING\n");

  // ── Customers ────────────────────────────────────────────────────────────
  const emailToUserId = new Map<string, string>();
  let custCreated = 0, custUpdated = 0, custSkipped = 0;

  if (customersPath) {
    const rows = parseCsv(fs.readFileSync(customersPath, "utf8"));
    console.log(`customers.csv: ${rows.length} row(s)`);
    for (const r of rows) {
      const email = (r.email || "").trim().toLowerCase();
      const ref = r.legacy_customer_id || email || "(no id)";
      if (!EMAIL_RE.test(email)) {
        flag("customer.missing_email", ref, `invalid or missing email: "${r.email ?? ""}"`);
        custSkipped++;
        continue;
      }
      const gov = r.governorate ? normGovernorate(r.governorate) : null;
      if (r.governorate && !gov) flag("customer.unknown_governorate", email, `"${r.governorate}" not recognised — address saved without it`);

      const created = normDate(r.created_at);
      if (r.created_at && !created.ok) flag("customer.bad_date", email, `unparseable created_at "${r.created_at}"`);

      if (dry) { emailToUserId.set(email, "dry"); custCreated++; continue; }

      const existing = await prisma.user.findUnique({ where: { email } });
      const data = {
        firstName: r.first_name || "",
        lastName: r.last_name || "",
        phone: r.phone || null,
        country: r.country || "EG",
        legacyRef: r.legacy_customer_id || null,
      };
      const user = existing
        ? await prisma.user.update({ where: { email }, data })
        : await prisma.user.create({
            data: {
              email,
              ...data,
              // No password hash at all — sign-in must divert this account into
              // the set-your-password flow rather than accepting a password.
              passwordHash: null,
              isImported: true,
              role: "CUSTOMER",
              createdAt: created.date,
            },
          });
      existing ? custUpdated++ : custCreated++;
      emailToUserId.set(email, user.id);

      if (r.address_line1) {
        const already = await prisma.address.findFirst({ where: { userId: user.id, line1: r.address_line1 } });
        if (!already) {
          await prisma.address.create({
            data: {
              userId: user.id,
              fullName: [r.first_name, r.last_name].filter(Boolean).join(" ") || email,
              phone: r.phone || "",
              line1: r.address_line1,
              line2: r.address_line2 || null,
              city: r.city || "",
              governorate: gov,
              postcode: r.postcode || null,
              country: r.country || "EG",
              isDefault: true,
            },
          });
        }
      }
    }
    console.log(`  → ${custCreated} created, ${custUpdated} updated, ${custSkipped} skipped\n`);
  }

  // ── Orders (one row per line item; group by order_number) ────────────────
  let ordCreated = 0, ordUpdated = 0, ordSkipped = 0, linesTotal = 0, linesUnmatched = 0;

  if (ordersPath) {
    const rows = parseCsv(fs.readFileSync(ordersPath, "utf8"));
    const grouped = new Map<string, Record<string, string>[]>();
    for (const r of rows) {
      const num = (r.order_number || "").trim();
      if (!num) { flag("order.missing_number", "(row)", `line "${r.item_title ?? ""}" has no order_number`); continue; }
      (grouped.get(num) ?? grouped.set(num, []).get(num)!).push(r);
    }
    console.log(`orders.csv: ${rows.length} line(s) across ${grouped.size} order(s)`);

    for (const [orderNumber, lines] of Array.from(grouped.entries())) {
      const head = lines[0];
      const email = (head.customer_email || "").trim().toLowerCase();
      const userId = emailToUserId.get(email) ?? null;
      if (!userId && email) flag("order.customer_not_found", orderNumber, `no customer row for ${email} — imported as a guest order`);
      if (!email) flag("order.no_customer_email", orderNumber, "no customer_email — imported as a guest order");

      const placed = normDate(head.order_date);
      if (!placed.ok) flag("order.bad_date", orderNumber, `unparseable order_date "${head.order_date ?? ""}" — used today's date`);

      const st = normStatus(head.status || "");
      if (st.guessed && head.status) flag("order.unknown_status", orderNumber, `"${head.status}" not recognised — defaulted to DELIVERED`);

      // line items
      const items: { title: string; quantity: number; unitPrice: number; bookId: string | null }[] = [];
      for (const l of lines) {
        linesTotal++;
        const title = (l.item_title || "").trim();
        const qty = parseInt(l.item_quantity || "1", 10);
        const price = money(l.item_unit_price);
        if (!title) { flag("line.missing_title", orderNumber, "line skipped: no item_title"); continue; }
        if (!Number.isFinite(qty) || qty < 1) { flag("line.bad_quantity", orderNumber, `"${title}": quantity "${l.item_quantity}"`); continue; }
        if (price == null) { flag("line.bad_price", orderNumber, `"${title}": unit price "${l.item_unit_price}"`); continue; }

        let bookId: string | null = null;
        if (!dry) {
          const book =
            (l.item_isbn ? await prisma.book.findUnique({ where: { isbn: l.item_isbn.trim() }, select: { id: true } }) : null) ??
            (await prisma.book.findFirst({ where: { title }, select: { id: true } }));
          bookId = book?.id ?? null;
        }
        if (!bookId) {
          linesUnmatched++;
          flag("line.product_unmatched", orderNumber, `"${title}"${l.item_isbn ? ` (ISBN ${l.item_isbn})` : ""} — kept with title and price, not linked to a catalogue book`);
        }
        items.push({ title, quantity: qty, unitPrice: price, bookId });
      }
      if (!items.length) { flag("order.no_valid_lines", orderNumber, "order skipped — no usable line items"); ordSkipped++; continue; }

      const computedSub = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      const subtotal = money(head.order_subtotal) ?? computedSub;
      const shippingFee = money(head.order_shipping_fee) ?? 0;
      const discount = money(head.order_discount) ?? 0;
      const computedTotal = subtotal + shippingFee - discount;
      const givenTotal = money(head.order_total);
      if (givenTotal != null && Math.abs(givenTotal - computedTotal) > 0.01) {
        flag("order.total_mismatch", orderNumber,
          `file says ${givenTotal.toFixed(2)}, lines compute to ${computedTotal.toFixed(2)} — kept the file's figure`);
      }
      const total = givenTotal ?? computedTotal;

      const gov = head.shipping_governorate ? normGovernorate(head.shipping_governorate) : null;
      if (head.shipping_governorate && !gov) flag("order.unknown_governorate", orderNumber, `"${head.shipping_governorate}" not recognised`);

      const shippingAddress = JSON.stringify({
        fullName: head.shipping_full_name || "",
        phone: head.shipping_phone || "",
        line1: head.shipping_line1 || "",
        line2: head.shipping_line2 || "",
        city: head.shipping_city || "",
        governorate: gov,
        postcode: head.shipping_postcode || "",
        country: "EG",
      });

      if (dry) { ordCreated++; continue; }

      const existing = await prisma.order.findUnique({ where: { orderNumber } });
      if (existing) {
        await prisma.orderItem.deleteMany({ where: { orderId: existing.id } });
        await prisma.order.update({
          where: { orderNumber },
          data: {
            userId, guestEmail: userId ? null : email || null,
            guestName: head.shipping_full_name || null,
            status: st.status,
            paymentMethod: head.payment_method || "COD",
            paymentStatus: head.payment_status || (st.status === "DELIVERED" ? "PAID" : "UNPAID"),
            subtotal, shippingFee, discount, total,
            shippingAddress, notes: head.notes || null,
            createdAt: placed.date,
            legacyRef: orderNumber, importedAt: new Date(),
            items: { create: items.map(({ bookId, ...i }) => ({ ...i, bookId })) },
          },
        });
        ordUpdated++;
      } else {
        await prisma.order.create({
          data: {
            orderNumber,
            userId, guestEmail: userId ? null : email || null,
            guestName: head.shipping_full_name || null,
            status: st.status,
            currency: "EGP",
            paymentMethod: head.payment_method || "COD",
            paymentStatus: head.payment_status || (st.status === "DELIVERED" ? "PAID" : "UNPAID"),
            subtotal, shippingFee, discount, total,
            shippingAddress, notes: head.notes || null,
            createdAt: placed.date,
            legacyRef: orderNumber, importedAt: new Date(),
            items: { create: items.map(({ bookId, ...i }) => ({ ...i, bookId })) },
          },
        });
        ordCreated++;
      }
    }
    console.log(`  → ${ordCreated} created, ${ordUpdated} updated, ${ordSkipped} skipped`);
    console.log(`  → ${linesTotal} line(s), ${linesUnmatched} not linked to a catalogue book\n`);
  }

  // ── Report ───────────────────────────────────────────────────────────────
  const dir = path.dirname(ordersPath ?? customersPath!);
  const reportPath = path.join(dir, "import-report.md");
  const byKind = new Map<string, Issue[]>();
  for (const i of issues) (byKind.get(i.kind) ?? byKind.set(i.kind, []).get(i.kind)!).push(i);

  const lines: string[] = [
    `# Import report`,
    ``,
    `${dry ? "**DRY RUN** — nothing was written." : "Import completed."}`,
    ``,
    `- customers: ${custCreated} created, ${custUpdated} updated, ${custSkipped} skipped`,
    `- orders: ${ordCreated} created, ${ordUpdated} updated, ${ordSkipped} skipped`,
    `- order lines: ${linesTotal} total, ${linesUnmatched} unlinked to a catalogue book`,
    `- issues flagged: **${issues.length}**`,
    ``,
  ];
  if (!issues.length) lines.push(`Everything mapped cleanly.`);
  for (const [kind, list] of Array.from(byKind.entries()).sort((a, b) => b[1].length - a[1].length)) {
    lines.push(`## ${kind} (${list.length})`, ``, `| ref | detail |`, `|---|---|`);
    for (const i of list) lines.push(`| ${i.ref} | ${i.detail.replace(/\|/g, "\\|")} |`);
    lines.push(``);
  }
  fs.writeFileSync(reportPath, lines.join("\n"));

  console.log(`${issues.length} issue(s) flagged → ${reportPath}`);
  if (issues.length) {
    const top = Array.from(byKind.entries()).sort((a, b) => b[1].length - a[1].length).slice(0, 6);
    for (const [k, l] of top) console.log(`   ${String(l.length).padStart(4)}  ${k}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
