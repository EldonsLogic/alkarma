/**
 * Baseline seed for a fresh Alkarma database.
 *
 * Deliberately seeds ONLY store-level scaffolding — settings and the initial
 * admin account. It does NOT seed a catalogue: books, authors, categories and
 * tags all come from the store's real catalogue import, and inventing
 * placeholder titles here would just have to be deleted again.
 *
 * (The Jee Bookstore codebase this was ported from seeded ~700 lines of demo
 * English titles, reviews, banners and bundles. All of that was specific to
 * that store's data and has been removed rather than rebranded.)
 *
 * Run:  npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Alkarma baseline…");

  // ─── Store settings ────────────────────────────────────────────────────────
  // EGP is the store's only currency, so there are no second-currency rows.
  const settingsData = [
    { key: "store_name", value: "دار الكرمة" },
    { key: "store_email", value: "info@alkarmabooks.com" },
    { key: "shipping_flat_egp", value: "50" },
    { key: "cod_enabled", value: "true" },
    { key: "maintenance_mode", value: "false" },
  ];
  for (const s of settingsData) {
    await prisma.storeSetting.upsert({ where: { key: s.key }, update: {}, create: s });
  }
  console.log("✅ Store settings");

  // ─── Initial admin ─────────────────────────────────────────────────────────
  // The password is read from SEED_ADMIN_PASSWORD so no credential is ever
  // committed to the repo. Set it when running the seed, then change it from
  // the admin panel after first sign-in.
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "info@alkarmabooks.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminPassword) {
    console.warn(
      "⚠️  SEED_ADMIN_PASSWORD not set — skipping admin user.\n" +
        "   Re-run with:  SEED_ADMIN_PASSWORD='…' npm run db:seed"
    );
  } else {
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 12),
        firstName: "الكرمة",
        lastName: "أدمن",
        role: "ADMIN",
        staffRole: "SUPER_ADMIN",
        country: "EG",
        emailVerified: true,
      },
    });
    console.log(`✅ Admin user (${adminEmail})`);
  }

  console.log("🌱 Done. Catalogue data comes from the real import, not this seed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
