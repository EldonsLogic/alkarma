import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const metadata = { title: "Bundles — Admin" };

async function toggleBundle(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const current = formData.get("isActive") === "true";
  const bundle = await prisma.bundle.update({ where: { id }, data: { isActive: !current } });
  const session = await auth();
  await audit(session?.user?.email, current ? "bundle.deactivated" : "bundle.activated", "Bundle", id, { name: bundle.name });
  revalidatePath("/admin/bundles");
}

export default async function AdminBundlesPage() {
  const bundles = await prisma.bundle.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      items: { include: { book: { select: { title: true } } } },
      _count: { select: { orderItems: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-black text-[#1e293b]">Bundles ({bundles.length})</h1>
        <Link href="/admin/bundles/new"
          className="px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm transition-colors">
          + Create Bundle
        </Link>
      </div>

      {bundles.length === 0 ? (
        <div className="bg-white border border-[#e2e8f0] rounded-sm p-12 text-center">
          <p className="text-[18px] font-bold text-[#1e293b] mb-2">No bundles yet</p>
          <p className="text-[14px] text-[#64748b] mb-6">Create book bundles with special pricing to boost sales.</p>
          <Link href="/admin/bundles/new"
            className="inline-block px-6 py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-[13px] rounded-sm">
            Create First Bundle
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bundles.map((bundle) => (
            <div key={bundle.id} className={`bg-white border rounded-sm p-5 ${bundle.isActive ? "border-[#e2e8f0]" : "border-[#e2e8f0] opacity-60"}`}>
              {bundle.coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bundle.coverUrl} alt={bundle.name}
                  className="w-full h-[160px] object-cover mb-4 rounded-sm bg-[#f1f5f9]" />
              )}
              <div className="flex items-start justify-between gap-2 mb-2">
                <h2 className="text-[15px] font-black text-[#1e293b] leading-snug">{bundle.name}</h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${bundle.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {bundle.isActive ? "Active" : "Hidden"}
                </span>
              </div>
              <p className="text-[13px] font-black text-brand mb-1">
                {Number(bundle.priceEgp).toLocaleString()} EGP
                {bundle.compareEgp && <span className="ml-2 text-[12px] text-[#94a3b8] line-through font-normal">{Number(bundle.compareEgp).toLocaleString()}</span>}
              </p>
              <p className="text-[12px] text-[#64748b] mb-3">
                {bundle.items.length} books · {bundle._count.orderItems} sold · Stock: {bundle.stock}
              </p>
              <ul className="text-[12px] text-[#94a3b8] space-y-0.5 mb-4">
                {bundle.items.slice(0, 3).map((item) => (
                  <li key={item.bookId} className="truncate">• {item.book.title}</li>
                ))}
                {bundle.items.length > 3 && (
                  <li className="text-[#94a3b8]">+ {bundle.items.length - 3} more</li>
                )}
              </ul>
              <div className="flex gap-3 pt-3 border-t border-[#f1f5f9]">
                <Link href={`/admin/bundles/${bundle.id}`}
                  className="text-[12px] text-[#3b82f6] hover:underline font-bold">Edit</Link>
                <form action={toggleBundle}>
                  <input type="hidden" name="id" value={bundle.id} />
                  <input type="hidden" name="isActive" value={bundle.isActive.toString()} />
                  <button type="submit" className="text-[12px] text-[#64748b] hover:text-[#1e293b] underline">
                    {bundle.isActive ? "Hide" : "Activate"}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
