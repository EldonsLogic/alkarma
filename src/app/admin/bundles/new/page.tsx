import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { displayPrice } from "@/lib/currency";
import { redirect } from "next/navigation";
import { ImageUpload } from "@/components/admin/ImageUpload";

export const metadata = { title: "New Bundle — Admin" };

async function createBundle(formData: FormData) {
  "use server";
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const slug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80);
  let finalSlug = slug;
  let s = 1;
  while (await prisma.bundle.findUnique({ where: { slug: finalSlug } })) {
    finalSlug = `${slug}-${s++}`;
  }

  const bookIds = formData.getAll("bookIds") as string[];

  const bundle = await prisma.bundle.create({
    data: {
      slug: finalSlug,
      name,
      nameAr: (formData.get("nameAr") as string)?.trim() || null,
      description: (formData.get("description") as string)?.trim() || null,
      coverUrl: (formData.get("coverUrl") as string)?.trim() || null,
      priceEgp: parseFloat(formData.get("priceEgp") as string) || 0,
      compareEgp: formData.get("compareEgp") ? parseFloat(formData.get("compareEgp") as string) : null,
      stock: parseInt(formData.get("stock") as string, 10) || 0,
      isActive: formData.get("isActive") !== "false",
      items: {
        create: bookIds.map((bookId) => ({ bookId, quantity: 1 })),
      },
    },
  });

  redirect(`/admin/bundles`);
}

export default async function AdminBundleNewPage() {
  const books = await prisma.book.findMany({
    where: { isActive: true },
    orderBy: { title: "asc" },
    select: { id: true, title: true, author: true, priceEgp: true },
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/bundles" className="text-[13px] text-[#64748b] hover:text-[#1e293b]">← Bundles</Link>
        <span className="text-[#e2e8f0]">/</span>
        <h1 className="text-[22px] font-black text-[#1e293b]">Create Bundle</h1>
      </div>

      <form action={createBundle}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

          <div className="space-y-5">
            <Sec title="Bundle Details">
              <div className="space-y-4">
                <BF label="Bundle Name *" name="name" required placeholder="e.g. Summer Reading Pack" />
                <BF label="Name (Arabic)" name="nameAr" />
                <div>
                  <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">Description</label>
                  <textarea name="description" rows={3}
                    className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6] resize-y" />
                </div>
                <ImageUpload
                  name="coverUrl"
                  label="Bundle Cover Image"
                  shape="cover"
                  dimensions="400 × 600 px"
                  dimensionsNote="(2 : 3 ratio — portrait)"
                />
              </div>
            </Sec>

            <Sec title="Pricing & Stock">
              <div className="grid grid-cols-2 gap-4">
                <BF label="Price (EGP) *" name="priceEgp" type="number" step="0.01" required defaultValue="0" />
                <BF label="Compare-at (EGP)" name="compareEgp" type="number" step="0.01" />
                <BF label="Stock" name="stock" type="number" defaultValue="0" />
              </div>
            </Sec>

            <Sec title={`Select Books (${books.length} available)`}>
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                {books.map((book) => (
                  <label key={book.id} className="flex items-center gap-3 py-2 px-3 hover:bg-[#f8fafc] rounded cursor-pointer border border-transparent hover:border-[#e2e8f0]">
                    <input type="checkbox" name="bookIds" value={book.id} className="w-4 h-4 accent-[#3b82f6] flex-shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-bold text-[#1e293b] truncate">{book.title}</span>
                      <span className="block text-[11px] text-[#94a3b8]">{book.author} · {displayPrice(book.priceEgp)} EGP</span>
                    </span>
                  </label>
                ))}
              </div>
            </Sec>
          </div>

          <div className="space-y-5">
            <Sec title="Status">
              <select name="isActive" defaultValue="true"
                className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm bg-white outline-none focus:border-[#3b82f6]">
                <option value="true">Active</option>
                <option value="false">Draft</option>
              </select>
            </Sec>
            <div className="flex flex-col gap-2">
              <button type="submit"
                className="w-full py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-[14px] rounded-sm">
                Create Bundle
              </button>
              <Link href="/admin/bundles"
                className="w-full py-3 border border-[#e2e8f0] text-[#64748b] font-bold text-[14px] rounded-sm text-center hover:border-[#3b82f6]">
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-[#e2e8f0] bg-[#f8fafc]">
        <h2 className="text-[12px] font-black text-[#1e293b] uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function BF({ label, name, type = "text", required, defaultValue, placeholder, step }: {
  label: string; name: string; type?: string; required?: boolean; defaultValue?: string; placeholder?: string; step?: string;
}) {
  return (
    <div>
      <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">{label}</label>
      <input type={type} name={name} required={required} defaultValue={defaultValue} placeholder={placeholder} step={step}
        className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
    </div>
  );
}
