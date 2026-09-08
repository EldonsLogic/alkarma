import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { displayPrice } from "@/lib/currency";
import { redirect } from "next/navigation";
import { ImageUpload } from "@/components/admin/ImageUpload";

interface Props {
  params: { id: string };
  searchParams: { saved?: string };
}

export const metadata = { title: "Edit Bundle — Admin" };

async function saveBundle(id: string, formData: FormData) {
  "use server";
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const bookIds = formData.getAll("bookIds") as string[];

  await prisma.bundleItem.deleteMany({ where: { bundleId: id } });

  await prisma.bundle.update({
    where: { id },
    data: {
      name,
      nameAr: (formData.get("nameAr") as string)?.trim() || null,
      description: (formData.get("description") as string)?.trim() || null,
      descAr: (formData.get("descAr") as string)?.trim() || null,
      coverUrl: (formData.get("coverUrl") as string)?.trim() || null,
      priceEgp: parseFloat(formData.get("priceEgp") as string) || 0,
      compareEgp: formData.get("compareEgp") ? parseFloat(formData.get("compareEgp") as string) : null,
      stock: parseInt(formData.get("stock") as string, 10) || 0,
      isActive: formData.get("isActive") === "true",
      items: {
        create: bookIds.map((bookId) => ({ bookId, quantity: 1 })),
      },
    },
  });

  redirect(`/admin/bundles/${id}?saved=1`);
}

async function deleteBundle(id: string) {
  "use server";
  await prisma.bundle.delete({ where: { id } });
  redirect("/admin/bundles");
}

export default async function AdminBundleEditPage({ params, searchParams }: Props) {
  const bundle = await prisma.bundle.findUnique({
    where: { id: params.id },
    include: { items: { select: { bookId: true } } },
  });

  if (!bundle) notFound();

  const books = await prisma.book.findMany({
    where: { isActive: true },
    orderBy: { title: "asc" },
    select: { id: true, title: true, author: true, priceEgp: true },
  });

  const selectedBookIds = new Set(bundle.items.map((i) => i.bookId));
  const saved = searchParams.saved === "1";

  const saveBundleAction = saveBundle.bind(null, bundle.id);
  const deleteBundleAction = deleteBundle.bind(null, bundle.id);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Link href="/admin/bundles" className="text-[13px] text-[#64748b] hover:text-[#1e293b]">← Bundles</Link>
        <span className="text-[#e2e8f0]">/</span>
        <h1 className="text-[22px] font-black text-[#1e293b]">Edit Bundle</h1>
      </div>

      {saved && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-[13px] px-4 py-3">
          ✓ Bundle saved successfully.
        </div>
      )}

      <form action={saveBundleAction}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

          <div className="space-y-5">
            <Sec title="Bundle Details">
              <div className="space-y-4">
                <BF label="Bundle Name (English) *" name="name" required defaultValue={bundle.name} />
                <BF label="Bundle Name (Arabic) — الاسم" name="nameAr" defaultValue={bundle.nameAr ?? ""} dir="rtl" />
                <div className="space-y-3">
                  <div>
                    <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">Description (English)</label>
                    <textarea name="description" rows={3} defaultValue={bundle.description ?? ""}
                      className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6] resize-y" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">
                      Description (Arabic) — الوصف <span className="normal-case font-normal text-[#cbd5e1]">(fallback: English)</span>
                    </label>
                    <textarea name="descAr" rows={3} defaultValue={(bundle as any).descAr ?? ""} dir="rtl"
                      className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6] resize-y" />
                  </div>
                </div>
                <ImageUpload
                  name="coverUrl"
                  label="Bundle Cover Image"
                  defaultValue={bundle.coverUrl ?? ""}
                  shape="cover"
                  dimensions="400 × 600 px"
                  dimensionsNote="(2 : 3 ratio — portrait)"
                />
              </div>
            </Sec>

            <Sec title="Pricing & Stock">
              <div className="grid grid-cols-2 gap-4">
                <BF label="Price (EGP) *" name="priceEgp" type="number" step="0.01" required defaultValue={displayPrice(bundle.priceEgp)} />
                <BF label="Compare-at (EGP)" name="compareEgp" type="number" step="0.01" defaultValue={displayPrice(bundle.compareEgp)} />
                <BF label="Stock" name="stock" type="number" defaultValue={String(bundle.stock)} />
              </div>
            </Sec>

            <Sec title={`Books in Bundle (${books.length} available)`}>
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                {books.map((book) => (
                  <label key={book.id} className="flex items-center gap-3 py-2 px-3 hover:bg-[#f8fafc] rounded cursor-pointer border border-transparent hover:border-[#e2e8f0]">
                    <input
                      type="checkbox"
                      name="bookIds"
                      value={book.id}
                      defaultChecked={selectedBookIds.has(book.id)}
                      className="w-4 h-4 accent-[#3b82f6] flex-shrink-0"
                    />
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
              <select name="isActive" defaultValue={bundle.isActive ? "true" : "false"}
                className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm bg-white outline-none focus:border-[#3b82f6]">
                <option value="true">Active</option>
                <option value="false">Draft</option>
              </select>
            </Sec>

            <Sec title="Info">
              <div className="space-y-1 text-[12px] text-[#64748b]">
                <p><span className="font-bold">Slug:</span> {bundle.slug}</p>
                <p><span className="font-bold">Books:</span> {bundle.items.length} selected</p>
              </div>
            </Sec>

            <div className="flex flex-col gap-2">
              <button type="submit"
                className="w-full py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-[14px] rounded-sm">
                Save Changes
              </button>
              <Link href="/admin/bundles"
                className="w-full py-3 border border-[#e2e8f0] text-[#64748b] font-bold text-[14px] rounded-sm text-center hover:border-[#3b82f6]">
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </form>

      {/* Delete */}
      <div className="mt-8 pt-6 border-t border-[#e2e8f0]">
        <h3 className="text-[14px] font-black text-red-600 mb-2">Danger Zone</h3>
        <p className="text-[12px] text-[#64748b] mb-3">
          Deleting a bundle is permanent and cannot be undone.
        </p>
        <form action={deleteBundleAction}>
          <button type="submit"
            className="px-4 py-2 text-[13px] font-bold text-red-600 border border-red-200 hover:bg-red-50 transition-colors rounded-sm">
            Delete Bundle
          </button>
        </form>
      </div>
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

function BF({ label, name, type = "text", required, defaultValue, placeholder, step, dir }: {
  label: string; name: string; type?: string; required?: boolean; defaultValue?: string; placeholder?: string; step?: string; dir?: string;
}) {
  return (
    <div>
      <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">{label}</label>
      <input type={type} name={name} required={required} defaultValue={defaultValue} placeholder={placeholder} step={step} dir={dir}
        className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
    </div>
  );
}
