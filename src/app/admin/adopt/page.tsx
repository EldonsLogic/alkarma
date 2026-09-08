import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { displayPrice } from "@/lib/currency";

export const metadata = { title: "Adopt a Book — Admin" };

async function deleteAdopt(formData: FormData) {
  "use server";
  await prisma.book.delete({ where: { id: formData.get("id") as string } });
  revalidatePath("/admin/adopt");
  revalidatePath("/");
}

export default async function AdoptListPage() {
  const books = await prisma.book.findMany({
    where: { type: "ADOPT" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-black text-[#1e293b]">Adopt a Book ({books.length})</h1>
          <p className="text-[13px] text-[#64748b] mt-1 max-w-2xl">
            Slightly damaged / second-hand copies at a special price. They appear <strong>only</strong> in the
            &quot;Adopt a Book&quot; homepage section (which is hidden automatically when there are none).
          </p>
        </div>
        <Link href="/admin/adopt/new" className="px-5 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm">+ Add a Book</Link>
      </div>

      {books.length === 0 ? (
        <div className="bg-white border border-[#e2e8f0] rounded-sm py-12 text-center text-[#94a3b8]">
          No adopt-a-book items yet. Add one and the homepage section appears automatically.
        </div>
      ) : (
        <div className="bg-white border border-[#e2e8f0] rounded-sm overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#f8fafc] text-[#64748b] text-[11px] uppercase tracking-wide border-b border-[#e2e8f0]">
                {["Title", "ISBN", "Price EGP", "Stock", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {books.map((b) => (
                <tr key={b.id} className={`border-t border-[#f1f5f9] hover:bg-[#f8fafc] ${!b.isActive ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-bold text-[#1e293b]">{b.title}</td>
                  <td className="px-4 py-3 font-mono text-[#64748b]">{b.isbn ?? "—"}</td>
                  <td className="px-4 py-3 text-[#64748b]">
                    {displayPrice(b.priceEgp)} EGP
                    {b.compareAtEgp ? <span className="line-through text-[#cbd5e1] ml-1">{displayPrice(b.compareAtEgp)}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-[#64748b]">{b.stock}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${b.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {b.isActive ? "Active" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link href={`/admin/adopt/${b.id}`} className="text-[#3b82f6] hover:underline font-bold text-[12px]">Edit</Link>
                      <form action={deleteAdopt}>
                        <input type="hidden" name="id" value={b.id} />
                        <button type="submit" className="text-[12px] text-red-400 hover:underline">Delete</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
