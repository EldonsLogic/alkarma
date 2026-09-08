import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

import { SITE_URL as BASE_URL } from "@/lib/brand";

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "", priority: 1, changeFrequency: "daily" },
  { path: "/bestsellers", priority: 0.9, changeFrequency: "daily" },
  { path: "/new-releases", priority: 0.9, changeFrequency: "daily" },
  { path: "/arabic-books", priority: 0.8, changeFrequency: "daily" },
  { path: "/book-of-the-month", priority: 0.7, changeFrequency: "monthly" },
  { path: "/bundles", priority: 0.7, changeFrequency: "weekly" },
  { path: "/category", priority: 0.6, changeFrequency: "weekly" },
  { path: "/distributors", priority: 0.5, changeFrequency: "monthly" },
  { path: "/about", priority: 0.4, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.3, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.3, changeFrequency: "monthly" },
  { path: "/shipping", priority: 0.3, changeFrequency: "monthly" },
  { path: "/returns", priority: 0.3, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [books, categories, authors, bundles, publisherRows, translatorRows] = await Promise.all([
    prisma.book.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      select: { slug: true },
    }),
    prisma.author.findMany({
      select: { slug: true },
    }),
    prisma.bundle.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.book.findMany({
      where: { isActive: true, publisher: { not: null } },
      select: { publisher: true },
      distinct: ["publisher"],
    }),
    prisma.book.findMany({
      where: { isActive: true, translator: { not: null } },
      select: { translator: true },
      distinct: ["translator"],
    }),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${BASE_URL}${r.path}`,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const bookEntries: MetadataRoute.Sitemap = books.map((b) => ({
    url: `${BASE_URL}/book/${encodeURIComponent(b.slug)}`,
    lastModified: b.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${BASE_URL}/category/${encodeURIComponent(c.slug)}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const authorEntries: MetadataRoute.Sitemap = authors.map((a) => ({
    url: `${BASE_URL}/author/${encodeURIComponent(a.slug)}`,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  const bundleEntries: MetadataRoute.Sitemap = bundles.map((b) => ({
    url: `${BASE_URL}/bundles/${encodeURIComponent(b.slug)}`,
    lastModified: b.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const publisherEntries: MetadataRoute.Sitemap = publisherRows
    .filter((r): r is { publisher: string } => !!r.publisher)
    .map((r) => ({
      url: `${BASE_URL}/publisher/${encodeURIComponent(r.publisher)}`,
      changeFrequency: "weekly",
      priority: 0.4,
    }));

  const translatorEntries: MetadataRoute.Sitemap = translatorRows
    .filter((r): r is { translator: string } => !!r.translator)
    .map((r) => ({
      url: `${BASE_URL}/translator/${encodeURIComponent(r.translator)}`,
      changeFrequency: "weekly",
      priority: 0.4,
    }));

  return [
    ...staticEntries,
    ...bookEntries,
    ...categoryEntries,
    ...authorEntries,
    ...bundleEntries,
    ...publisherEntries,
    ...translatorEntries,
  ];
}
