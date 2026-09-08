/**
 * Seed Alkarma's shipping zones and rates (EGP).
 *
 * Model shape: ONE ShippingZone per country ("Egypt", countries: ["EG"]) with
 * one ShippingRate per delivery band. Each rate lists the governorate codes it
 * covers; at checkout, getRatesForCountry() narrows to the rate that explicitly
 * lists the customer's selected governorate.
 *
 * Idempotent — re-running updates the rates in place rather than duplicating.
 *
 * Run:  npx tsx --env-file .env.local scripts/seed-shipping.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Every rate quotes the same published delivery window: 5–6 working days.
const MIN_DAYS = 5;
const MAX_DAYS = 6;

const BANDS = [
  {
    name: "Cairo & Giza",
    nameAr: "القاهرة والجيزة",
    priceEgp: 100,
    governorates: ["cairo", "giza"],
  },
  {
    name: "Alexandria & Beheira",
    nameAr: "الإسكندرية والبحيرة",
    priceEgp: 110,
    governorates: ["alexandria", "beheira"],
  },
  {
    name: "Delta & Canal",
    nameAr: "الدلتا والقناة",
    priceEgp: 115,
    governorates: [
      "dakahlia", "qalyubia", "gharbia", "kafr_el_sheikh", "monufia",
      "sharqia", "damietta", "ismailia", "port_said", "suez",
    ],
  },
  {
    name: "North Upper Egypt",
    nameAr: "شمال الصعيد",
    priceEgp: 130,
    governorates: ["fayoum", "beni_suef", "minya", "assiut", "sohag"],
  },
  {
    // Also carries New Valley and the two Sinai governorates. Labelled
    // "and remote governorates" rather than plain "South Upper Egypt" so a
    // customer in Sinai isn't shown a shipping method named after a region
    // they're not in.
    name: "South Upper Egypt & remote governorates",
    nameAr: "جنوب الصعيد والمحافظات النائية",
    priceEgp: 150,
    governorates: [
      "qena", "luxor", "aswan", "red_sea", "matrouh",
      "new_valley", "north_sinai", "south_sinai",
    ],
  },
];

async function main() {
  console.log("Seeding shipping zones and rates…\n");

  let zone = await prisma.shippingZone.findFirst({ where: { name: "Egypt" } });
  if (!zone) {
    zone = await prisma.shippingZone.create({
      data: { name: "Egypt", countries: ["EG"], isActive: true, sortOrder: 1 },
    });
    console.log(`  ✔ Created zone: ${zone.name}`);
  } else {
    zone = await prisma.shippingZone.update({
      where: { id: zone.id },
      data: { countries: ["EG"], isActive: true, sortOrder: 1 },
    });
    console.log(`  ↺ Updated zone: ${zone.name}`);
  }

  for (let i = 0; i < BANDS.length; i++) {
    const band = BANDS[i];
    const existing = await prisma.shippingRate.findFirst({
      where: { zoneId: zone.id, name: band.name },
    });
    const data = {
      zoneId: zone.id,
      name: band.name,
      nameAr: band.nameAr,
      priceEgp: band.priceEgp,
      minDays: MIN_DAYS,
      maxDays: MAX_DAYS,
      // Flat rate per band — no free-shipping threshold applies.
      freeAboveEgp: null,
      governorates: band.governorates,
      sortOrder: i + 1,
      isActive: true,
    };
    if (existing) {
      await prisma.shippingRate.update({ where: { id: existing.id }, data });
      console.log(`  ↺ Updated rate: ${band.nameAr} — ${band.priceEgp} EGP (${band.governorates.length} gov.)`);
    } else {
      await prisma.shippingRate.create({ data });
      console.log(`  ✔ Created rate: ${band.nameAr} — ${band.priceEgp} EGP (${band.governorates.length} gov.)`);
    }
  }

  // Prune rates that are no longer in BANDS. Without this, renaming a band
  // leaves the old row behind and the customer is offered two identical
  // shipping options for the same governorate.
  const keep = BANDS.map((b) => b.name);
  const stale = await prisma.shippingRate.findMany({
    where: { zoneId: zone.id, name: { notIn: keep } },
  });
  for (const r of stale) {
    await prisma.shippingRate.delete({ where: { id: r.id } });
    console.log(`  ✖ Removed stale rate: ${r.name}`);
  }

  // Coverage check — a governorate with no rate cannot complete checkout.
  const { EG_GOVERNORATES } = await import("../src/lib/governorates");
  const covered = new Set(BANDS.flatMap((b) => b.governorates));
  const uncovered = EG_GOVERNORATES.filter((g) => !covered.has(g.code));
  console.log(`\n  Coverage: ${covered.size}/${EG_GOVERNORATES.length} governorates`);
  if (uncovered.length) {
    console.warn(
      "  ⚠️  NO SHIPPING RATE for: " +
        uncovered.map((g) => `${g.ar} (${g.code})`).join(", ") +
        "\n     Customers in these governorates cannot complete checkout."
    );
  }

  console.log("\n✅ Shipping zones and rates seeded.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
