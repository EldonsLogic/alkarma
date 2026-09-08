import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const metadata = { title: "Returns — Admin" };

const STATUSES = ["REQUESTED", "APPROVED", "RECEIVED", "REFUNDED", "REJECTED"] as const;

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-blue-100 text-blue-700",
  RECEIVED: "bg-purple-100 text-purple-700",
  REFUNDED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-600",
};

const fmt = (n: number, ccy = "EGP") => `${new Intl.NumberFormat("en-EG").format(Math.round(n))} ${ccy}`;

async function updateReturn(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  const adminNote = formData.get("adminNote") as string;
  const refundAmount = formData.get("refundAmount") ? Number(formData.get("refundAmount")) : null;

  const ret = await prisma.return.update({
    where: { id },
    data: { status, adminNote: adminNote || null, refundAmount },
  });

  // Keep the order in sync with the return's status.
  if (status === "REFUNDED") {
    await prisma.order.update({
      where: { id: ret.orderId },
      data: {
        status: "REFUNDED",
        refundedAt: new Date(),
        refundAmount: refundAmount ?? undefined,
        refundReason: "Return refunded",
      },
    }).catch(() => {});
  } else if (status === "RECEIVED" || status === "APPROVED") {
    // Goods are back (or on their way back) — mark the order as returned.
    await prisma.order.update({ where: { id: ret.orderId }, data: { status: "RETURNED" } }).catch(() => {});
  }

  const session = await auth();
  await audit(session?.user?.email, "return.updated", "Return", id, { status, refundAmount });
  revalidatePath("/admin/returns");
  revalidatePath(`/admin/orders/${ret.orderId}`);
  redirect("/admin/returns");
}

export default async function ReturnsPage({ searchParams }: { searchParams: { status?: string; manage?: string } }) {
  const where = searchParams.status ? { status: searchParams.status } : {};

  const [returns, grouped, refundAgg] = await Promise.all([
    prisma.return.findMany({
      where,
      include: { order: { select: { orderNumber: true, currency: true, guestName: true, guestEmail: true, user: { select: { firstName: true, lastName: true, email: true } } } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.return.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.return.aggregate({ _sum: { refundAmount: true }, where: { status: "REFUNDED" } }),
  ]);

  const countOf = (s: string) => grouped.find((g) => g.status === s)?._count._all ?? 0;
  const totalAll = grouped.reduce((sum, g) => sum + g._count._all, 0);
  const pending = countOf("REQUESTED") + countOf("APPROVED") + countOf("RECEIVED");
  const refundedCount = countOf("REFUNDED");
  const totalRefunded = refundAgg._sum.refundAmount ?? 0;

  const managing = searchParams.manage ? returns.find((r) => r.id === searchParams.manage) ?? null : null;

  const cards = [
    { label: "Total returns", value: String(totalAll), sub: "all time" },
    { label: "Pending action", value: String(pending), sub: "requested · approved · received" },
    { label: "Refunded", value: String(refundedCount), sub: "completed" },
    { label: "Total refunded", value: fmt(totalRefunded), sub: "across refunded returns" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[22px] font-black text-[#1e293b]">Returns &amp; RMA</h1>
        <p className="text-[13px] text-[#64748b] mt-1">
          Populated automatically — from customer return requests and from marking an order <b>Returned</b> or <b>Refunded</b> in Orders.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border border-[#e2e8f0] rounded-sm p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">{c.label}</p>
            <p className="text-[24px] font-black text-[#0f172a] mt-1 leading-none">{c.value}</p>
            <p className="text-[11px] text-[#94a3b8] mt-1.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <a href="/admin/returns"
          className={`px-3 py-1.5 text-[12px] font-bold rounded-sm border transition-colors ${!searchParams.status ? "bg-[#1e293b] text-white border-[#1e293b]" : "border-[#e2e8f0] text-[#64748b] hover:border-[#1e293b]"}`}>
          All ({totalAll})
        </a>
        {STATUSES.map((s) => (
          <a key={s} href={`?status=${s}`}
            className={`px-3 py-1.5 text-[12px] font-bold rounded-sm border transition-colors ${searchParams.status === s ? "bg-[#1e293b] text-white border-[#1e293b]" : "border-[#e2e8f0] text-[#64748b] hover:border-[#1e293b]"}`}>
            {s} ({countOf(s)})
          </a>
        ))}
      </div>

      {managing && (
        <div className="bg-white border border-[#e2e8f0] rounded-sm p-5 mb-6">
          <h2 className="text-[15px] font-black text-[#1e293b] mb-4">Manage Return — {managing.order.orderNumber}</h2>
          <form action={updateReturn} className="space-y-4">
            <input type="hidden" name="id" value={managing.id} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1">Status</label>
                <select name="status" defaultValue={managing.status}
                  className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm bg-white outline-none focus:border-[#3b82f6]">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1">Refund Amount</label>
                <input type="number" name="refundAmount" defaultValue={managing.refundAmount ?? ""} step="0.01" placeholder="0.00"
                  className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
              </div>
              <div>
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1">Internal Note</label>
                <input name="adminNote" defaultValue={managing.adminNote ?? ""}
                  className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
              </div>
            </div>
            <p className="text-[11px] text-[#94a3b8]">Setting the status to <b>REFUNDED</b> also marks the order as refunded.</p>
            <div className="flex gap-3">
              <button type="submit" className="px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm">Save Changes</button>
              <a href="/admin/returns" className="px-4 py-2 border border-[#e2e8f0] text-[#64748b] text-[13px] font-bold rounded-sm hover:border-[#3b82f6]">Cancel</a>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-[#e2e8f0] rounded-sm overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
            <tr>
              {["Order", "Customer", "Reason", "Items", "Status", "Refund", "Requested", "Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-bold uppercase text-[#64748b] tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1f5f9]">
            {returns.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-[#94a3b8]">
                No returns yet. They appear here when a customer requests one, or when you mark an order <b>Returned</b> / <b>Refunded</b> in Orders.
              </td></tr>
            ) : returns.map((r) => {
              let items: { title: string; qty: number }[] = [];
              try { items = JSON.parse(r.items as string); } catch {}
              return (
                <tr key={r.id} className="hover:bg-[#f8fafc]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${r.orderId}`} className="text-[#3b82f6] hover:underline font-bold">{r.order.orderNumber}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-[#1e293b]">{r.order.user ? `${r.order.user.firstName} ${r.order.user.lastName}` : (r.order.guestName || "Guest")}</p>
                    <p className="text-[#94a3b8]">{r.order.user?.email ?? r.order.guestEmail ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-[#64748b] max-w-[200px] truncate">{r.reason}</td>
                  <td className="px-4 py-3 text-[#64748b] max-w-[220px] truncate">{items.map((i) => `${i.title} ×${i.qty}`).join(", ")}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-500"}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-[#64748b]">{r.refundAmount != null ? fmt(Number(r.refundAmount), r.order.currency) : "—"}</td>
                  <td className="px-4 py-3 text-[#94a3b8]">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <a href={`?manage=${r.id}`} className="text-[#3b82f6] hover:underline text-[12px] font-bold">Manage</a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
