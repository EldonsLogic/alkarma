import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { uniqueBookSlug, syncTags } from "@/lib/product-admin";

export const metadata = { title: "Add Stationery — Admin" };

async function createStationery(formData: FormData) {
  "use server";

  const title = (formData.get("title") as string)?.trim();
  const titleAr = (formData.get("titleAr") as string)?.trim() || null;
  const priceEgp = parseFloat(formData.get("priceEgp") as string);

  if ((!title && !titleAr) || isNaN(priceEgp)) return;

  const slug = await uniqueBookSlug(title || titleAr || "stationery");

  const item = await prisma.book.create({
    data: {
      type: "STATIONERY",
      slug,
      title: title || titleAr || "",
      titleAr,
      subtitle: (formData.get("subtitle") as string)?.trim() || null,
      subtitleAr: (formData.get("subtitleAr") as string)?.trim() || null,
      synopsis: (formData.get("synopsis") as string)?.trim() || "",
      synopsisAr: (formData.get("synopsisAr") as string)?.trim() || null,
      author: "",
      coverUrl: (formData.get("coverUrl") as string)?.trim() || "",
      priceEgp,
      compareAtEgp: formData.get("compareAtEgp") ? parseFloat(formData.get("compareAtEgp") as string) : null,
      stock: parseInt(formData.get("stock") as string, 10) || 0,
      lowStockAt: parseInt(formData.get("lowStockAt") as string, 10) || 5,
      isActive: formData.get("isActive") === "true",
      isFeatured: formData.get("isFeatured") === "on",
    },
  });

  const categoryIds = formData.getAll("categoryIds") as string[];
  if (categoryIds.length > 0) {
    await prisma.bookCategory.createMany({
      data: categoryIds.map((categoryId) => ({ bookId: item.id, categoryId })),
    });
  }
  await syncTags(item.id, formData.get("tags") as string);

  const session = await auth();
  await audit(session?.user?.email, "stationery.created", "Book", item.id, { title: title || titleAr });
  redirect("/admin/stationery");
}

export default async function AdminStationeryNewPage() {
  const allCats = await prisma.category.findMany({
    where: { isActive: true, kind: "STATIONERY" },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, nameAr: true, parentId: true },
  });
  // Tree order: each top-level category immediately followed by its children
  const categories = allCats.filter((c) => !c.parentId).flatMap((r) => [r, ...allCats.filter((c) => c.parentId === r.id)]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/stationery" className="text-[13px] text-[#64748b] hover:text-[#1e293b]">← Stationery</Link>
        <span className="text-[#e2e8f0]">/</span>
        <h1 className="text-[22px] font-black text-[#1e293b]">Add Stationery Item</h1>
      </div>

      <form action={createStationery}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-5">
            <Section title="Name (bilingual)">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SField label="Name (English) *" name="title" placeholder="e.g. A5 Notebook" />
                  <SField label="Name (Arabic) — الاسم *" name="titleAr" placeholder="مثال: دفتر A5" dir="rtl" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SField label="Subtitle (English)" name="subtitle" />
                  <SField label="Subtitle (Arabic)" name="subtitleAr" dir="rtl" />
                </div>
              </div>
            </Section>

            <Section title="Description (bilingual)">
              <div className="space-y-3">
                <div>
                  <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">English</label>
                  <textarea name="synopsis" rows={4} className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6] resize-y" />
                </div>
                <div>
                  <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">Arabic — الوصف</label>
                  <textarea name="synopsisAr" rows={4} dir="rtl" className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6] resize-y" />
                </div>
              </div>
            </Section>

            <Section title="Pricing">
              <div className="grid grid-cols-2 gap-4">
                <SField label="Price EG (EGP) *" name="priceEgp" type="number" step="0.01" />
                <SField label="Compare-at (EGP)" name="compareAtEgp" type="number" step="0.01" />
              </div>
            </Section>

            <Section title="Inventory">
              <div className="grid grid-cols-2 gap-4">
                <SField label="Stock Quantity" name="stock" type="number" defaultValue="0" />
                <SField label="Low Stock Alert At" name="lowStockAt" type="number" defaultValue="5" />
              </div>
            </Section>

            <Section title="Image">
              <ImageUpload name="coverUrl" label="Product Image" shape="cover" dimensions="600 × 600 px" dimensionsNote="(square works best for stationery)" />
            </Section>
          </div>

          <div className="space-y-5">
            <Section title="Status">
              <select name="isActive" defaultValue="true" className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm bg-white outline-none focus:border-[#3b82f6] mb-3">
                <option value="true">Active (visible)</option>
                <option value="false">Draft (hidden)</option>
              </select>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" name="isFeatured" className="w-4 h-4 accent-[#3b82f6]" />
                <span className="text-[13px] text-[#334155]">Feature on Homepage</span>
              </label>
            </Section>

            <Section title="Categories">
              <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                {categories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2.5 cursor-pointer py-1">
                    <input type="checkbox" name="categoryIds" value={cat.id} className="w-4 h-4 accent-[#3b82f6] flex-shrink-0" />
                    <span className={`text-[13px] ${cat.parentId ? "text-[#64748b] pl-3" : "text-[#1e293b] font-bold"}`}>
                      {cat.parentId ? "↳ " : ""}{cat.name}{cat.nameAr ? ` / ${cat.nameAr}` : ""}
                    </span>
                  </label>
                ))}
                {categories.length === 0 && (
                  <p className="text-[12px] text-[#94a3b8]">No stationery categories yet. <Link href="/admin/categories" className="text-[#3b82f6] hover:underline">Add one →</Link></p>
                )}
              </div>
            </Section>

            <Section title="Tags">
              <SField label="Tags (labels…)" name="tags" placeholder="e.g. Gift, Imported" />
            </Section>

            <div className="flex flex-col gap-2">
              <button type="submit" className="w-full py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-[14px] rounded-sm transition-colors">Create Stationery</button>
              <Link href="/admin/stationery" className="w-full py-3 border border-[#e2e8f0] text-[#64748b] font-bold text-[14px] rounded-sm text-center hover:border-[#3b82f6] hover:text-[#3b82f6] transition-colors">Cancel</Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#e2e8f0] bg-[#f8fafc]">
        <h2 className="text-[13px] font-black text-[#1e293b] uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function SField({ label, name, type = "text", placeholder, defaultValue, step, dir }: {
  label: string; name: string; type?: string; placeholder?: string; defaultValue?: string; step?: string; dir?: string;
}) {
  return (
    <div>
      <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">{label}</label>
      <input type={type} name={name} placeholder={placeholder} defaultValue={defaultValue} step={step} dir={dir}
        className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
    </div>
  );
}
