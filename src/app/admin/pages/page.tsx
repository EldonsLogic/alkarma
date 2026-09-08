import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const metadata = { title: "Pages — Admin" };

const BUILT_IN = [
  { slug: "about", title: "About Us" },
  { slug: "faq", title: "FAQ" },
  { slug: "shipping", title: "Shipping Policy" },
  { slug: "contact", title: "Contact" },
  { slug: "privacy", title: "Privacy Policy" },
  { slug: "terms", title: "Terms & Conditions" },
];

export default async function AdminPagesPage() {
  const pages = await prisma.page.findMany({ orderBy: { slug: "asc" } });
  const pageMap = Object.fromEntries(pages.map((p) => [p.slug, p]));

  const allPages = [
    ...BUILT_IN.map((b) => ({ ...b, existing: pageMap[b.slug] ?? null })),
    ...pages.filter((p) => !BUILT_IN.find((b) => b.slug === p.slug))
      .map((p) => ({ slug: p.slug, title: p.title, existing: p })),
  ];

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-black text-[#1e293b]">Content Pages</h1>
          <p className="text-[13px] text-[#64748b] mt-1">Rich text content for About, FAQ, Shipping, and custom pages.</p>
        </div>
        <Link href="/admin/pages/new" className="px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm transition-colors">
          + New Page
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {allPages.map((page) => (
          <div key={page.slug} className="bg-white border border-[#e2e8f0] rounded-sm p-5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-bold text-[#1e293b] text-[14px]">{page.title}</h3>
                <p className="font-mono text-[11px] text-[#94a3b8]">/{page.slug}</p>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                page.existing?.isPublished ? "bg-green-100 text-green-700" :
                page.existing ? "bg-gray-100 text-gray-500" :
                "bg-blue-50 text-blue-500"
              }`}>
                {page.existing ? (page.existing.isPublished ? "Live" : "Draft") : "In Code"}
              </span>
            </div>
            {page.existing && (
              <p className="text-[12px] text-[#94a3b8] mb-3">
                Updated {new Date(page.existing.updatedAt).toLocaleDateString()}
              </p>
            )}
            <div className="flex gap-3 mt-3">
              <Link href={`/admin/pages/${page.slug}`}
                className="text-[12px] text-[#3b82f6] hover:underline font-bold">
                {page.existing ? "Edit" : "Override"}
              </Link>
              <a href={`/${page.slug}`} target="_blank" className="text-[12px] text-[#64748b] hover:underline">View ↗</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
