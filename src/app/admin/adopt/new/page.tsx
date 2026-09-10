import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { toSlug } from "@/lib/slug";

export const metadata = { title: "Add Adopt-a-Book — Admin" };

async function createAdopt(formData: FormData) {
  "use server";
  const title = (formData.get("title") as string)?.trim();
  const priceEgp = parseFloat(formData.get("priceEgp") as string);
  if (!title || isNaN(priceEgp)) return;

  const isbn = (formData.get("isbn") as string)?.trim() || null;
  const base = toSlug(title, isbn ?? "");
  let slug = base, n = 1;
  while (await prisma.book.findUnique({ where: { slug } })) slug = `${base}-${n++}`;

  const book = await prisma.book.create({
    data: {
      type: "ADOPT",
      slug,
      title,
      synopsis: (formData.get("synopsis") as string)?.trim() || "",
      isbn,
      author: (formData.get("author") as string)?.trim() || "",
      coverUrl: (formData.get("coverUrl") as string)?.trim() || "",
      priceEgp,
      compareAtEgp: formData.get("compareAtEgp") ? parseFloat(formData.get("compareAtEgp") as string) : null,
      stock: parseInt(formData.get("stock") as string, 10) || 1,
      isActive: formData.get("isActive") !== "false",
    },
  });

  const session = await auth();
  await audit(session?.user?.email, "adopt.created", "Book", book.id, { title });
  redirect("/admin/adopt");
}

export default function AdoptNewPage() {
  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/adopt" className="text-[13px] text-[#64748b] hover:text-[#1e293b]">← Adopt a Book</Link>
        <span className="text-[#e2e8f0]">/</span>
        <h1 className="text-[22px] font-black text-[#1e293b]">Add an Adopt-a-Book</h1>
      </div>
      <p className="text-[13px] text-[#64748b] mb-5">
        Slightly damaged / second-hand copies. These show <strong>only</strong> in the &quot;Adopt a Book&quot; homepage
        section — never under normal categories, carousels or search. Give each its own warehouse ISBN.
      </p>

      <form action={createAdopt} className="bg-white border border-[#e2e8f0] rounded-sm p-6 space-y-4">
        <F label="Title *" name="title" required placeholder="e.g. The Alchemist (used)" />
        <div className="grid grid-cols-2 gap-4">
          <F label="Author" name="author" />
          <F label="ISBN (warehouse) *" name="isbn" placeholder="unique per copy" />
        </div>
        <div>
          <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">Description / Condition note</label>
          <textarea name="synopsis" rows={4} placeholder="e.g. Minor cover wear, pages intact."
            className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6] resize-y" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <F label="Price (EGP) *" name="priceEgp" type="number" step="0.01" required />
          <F label="Original price (EGP)" name="compareAtEgp" type="number" step="0.01" placeholder="shown struck-through" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <F label="Stock" name="stock" type="number" defaultValue="1" />
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">Status</label>
            <select name="isActive" defaultValue="true"
              className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm bg-white outline-none focus:border-[#3b82f6]">
              <option value="true">Active (visible)</option>
              <option value="false">Hidden</option>
            </select>
          </div>
        </div>
        <ImageUpload name="coverUrl" label="Cover Image" shape="cover" dimensions="400 × 600 px" dimensionsNote="(2 : 3 portrait)" />
        <div className="flex gap-3 pt-1">
          <button type="submit" className="px-5 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm">Create</button>
          <Link href="/admin/adopt" className="px-5 py-2.5 border border-[#e2e8f0] text-[#64748b] text-[13px] font-bold rounded-sm">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

function F({ label, name, type = "text", required, placeholder, defaultValue, step }: {
  label: string; name: string; type?: string; required?: boolean; placeholder?: string; defaultValue?: string; step?: string;
}) {
  return (
    <div>
      <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">{label}</label>
      <input type={type} name={name} required={required} placeholder={placeholder} defaultValue={defaultValue} step={step}
        className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
    </div>
  );
}
