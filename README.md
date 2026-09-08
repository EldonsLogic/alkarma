# دار الكرمة — Alkarma Books

Storefront and admin panel for [alkarmabooks.com](https://alkarmabooks.com) —
an Arabic-only, EGP-only bookstore for the Cairo publishing house دار الكرمة.

Next.js 14 (App Router) · TypeScript · Tailwind · Prisma · PostgreSQL (Supabase)
· NextAuth · Vercel Blob.

> Ported from the Jee Bookstore codebase. This is a separate, independent
> business with its own database, domain, credentials and catalogue — the two
> projects share nothing except the Vercel Blob store (see "Images" below).

## Getting started

```bash
npm install
cp .env.example .env.local     # then fill in the values
npx prisma generate
npx prisma db push             # creates the schema on a fresh database
npm run dev
```

## Conventions that matter

**Arabic-only, RTL-only.** There is no locale switcher, no `next-intl`, and no
English storefront copy. `<html lang="ar" dir="rtl">` is hardcoded in the root
layout. Use logical CSS properties (`start`/`end`, `ms-`/`me-`, `ps-`/`pe-`)
rather than `left`/`right` so RTL stays correct. The **admin panel is English**
by design.

**EGP is the only currency.** There is no second currency, no geo currency
detection and no currency switching. Pricing helpers in `src/lib/currency.ts`
take no currency argument. `formatPrice()` renders the product style
(`350.00 EGP`); `formatPriceAr()` renders the cart/checkout style (`٥٤٠ ج.م`).

**Brand strings live in one place.** `src/lib/brand.ts` is the single source of
truth for the store name, domain, canonical URL, contact details and the order
prefix. Never hardcode the brand name or domain anywhere else.

**Every page sets its own canonical.** Use the `canonical()` helper from
`src/lib/seo.ts`. Relying on the root layout's default canonical silently
de-indexes the whole site — this was a real, live bug on the codebase this was
ported from.

**Page titles must be bare.** The root layout's metadata template appends
`| دار الكرمة`. A page that also appends the brand produces a doubled title.

**Listing queries need an explicit `select`.** Use the pattern in
`src/lib/bookSummarySelect.ts` rather than bare `findMany()`/`include()` —
this was a deliberate fix for real database cost and performance problems.

**Data shared with a client component must not live in a `"use client"`
module** if the server also reads it. `src/app/(storefront)/faq/faq-items.ts`
is a plain module for exactly this reason: the server page maps over it to emit
FAQPage JSON-LD, and having it in the client module broke prerendering.

## Images

Uploads go to a **Vercel Blob store shared with the sibling bookstore project**
— this is intentional, not an oversight. Both projects sit on the same Vercel
Pro plan, so shared usage bills together instead of risking a pause. Connect
via Vercel → Storage → the existing Blob store → "Connect Project"; Vercel then
injects `BLOB_READ_WRITE_TOKEN` automatically.

## Scripts

```bash
npm run dev                                            # dev server
npm run build                                          # prisma generate + next build
npm run db:seed                                        # baseline settings + admin user
npx tsx --env-file .env.local scripts/seed-menu-items.ts   # header/footer navigation
npx tsx --env-file .env.local scripts/seed-pages.ts        # CMS page copy
npx tsx --env-file .env.local scripts/seed-stationery.ts   # stationery categories
node scripts/recompress-blobs.mjs --dry                # re-compress oversized blobs
```

`npm run db:seed` needs `SEED_ADMIN_PASSWORD` set; no credential is committed.

## Outstanding

- **`/privacy` and `/terms` still carry copy inherited from the ported
  codebase.** The live site publishes full legal documents for both. These must
  be migrated verbatim and signed off — do not launch without replacing them.
- **`/distributors` (موزعينا) does not exist yet.** It is a top-level nav item
  on the live site and needs building.
- **301 redirects are required before launch.** The live site is WordPress
  (`/product/…`, `/book-category/…`); this app uses `/book/…`, `/category/…`.
  Every changed URL needs a redirect via the `Redirect` model or existing
  indexed pages will 404.
