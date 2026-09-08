import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const metadata = { title: "Coupons — Admin" };

async function saveCoupon(formData: FormData) {
  "use server";
  const id = formData.get("id") as string | null;
  const code = (formData.get("code") as string)?.trim().toUpperCase();
  if (!code) return;

  const data = {
    code,
    discountType: formData.get("discountType") as string,
    discountValue: parseFloat(formData.get("discountValue") as string) || 0,
    minOrderEgp: formData.get("minOrderEgp") ? parseFloat(formData.get("minOrderEgp") as string) : null,
    maxUses: formData.get("maxUses") ? parseInt(formData.get("maxUses") as string, 10) : null,
    expiresAt: formData.get("expiresAt") ? new Date(formData.get("expiresAt") as string) : null,
    isActive: formData.get("isActive") !== "false",
  };

  const session = await auth();
  if (id) {
    await prisma.coupon.update({ where: { id }, data });
    await audit(session?.user?.email, "coupon.updated", "Coupon", id, { code });
  } else {
    const created = await prisma.coupon.create({ data });
    await audit(session?.user?.email, "coupon.created", "Coupon", created.id, { code });
  }
  revalidatePath("/admin/coupons");
  redirect("/admin/coupons");
}

async function toggleCoupon(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const current = formData.get("isActive") === "true";
  await prisma.coupon.update({ where: { id }, data: { isActive: !current } });
  const session = await auth();
  await audit(session?.user?.email, current ? "coupon.disabled" : "coupon.enabled", "Coupon", id);
  revalidatePath("/admin/coupons");
}

const DISCOUNT_TYPES = [
  { value: "PERCENTAGE", label: "Percentage (%)" },
  { value: "FIXED_EGP", label: "Fixed Amount (EGP)" },
  { value: "FREE_SHIPPING", label: "Free Shipping" },
];

export default async function AdminCouponsPage({ searchParams }: { searchParams: { edit?: string; add?: string } }) {
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });

  const editing = searchParams.edit ? coupons.find((c) => c.id === searchParams.edit) : null;
  const showForm = searchParams.add === "1" || !!editing;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-black text-[#1e293b]">Coupons ({coupons.length})</h1>
        {!showForm && (
          <a href="?add=1"
            className="px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm">
            + Create Coupon
          </a>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-[#e2e8f0] rounded-sm p-6 mb-6">
          <h2 className="text-[15px] font-black text-[#1e293b] mb-4">{editing ? "Edit Coupon" : "New Coupon"}</h2>
          <form action={saveCoupon} className="space-y-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <GF label="Code *" name="code" required defaultValue={editing?.code ?? ""}
                placeholder="e.g. SAVE20" />
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">Discount Type *</label>
                <select name="discountType" defaultValue={editing?.discountType ?? "PERCENTAGE"}
                  className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm bg-white outline-none focus:border-[#3b82f6]">
                  {DISCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <GF label="Discount Value *" name="discountValue" type="number" step="0.01" required
                defaultValue={editing?.discountValue.toString() ?? "0"} placeholder="e.g. 20" />
              <GF label="Min Order (EGP)" name="minOrderEgp" type="number" step="0.01"
                defaultValue={editing?.minOrderEgp?.toString() ?? ""} placeholder="Optional" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <GF label="Max Uses" name="maxUses" type="number"
                defaultValue={editing?.maxUses?.toString() ?? ""} placeholder="Unlimited" />
              <GF label="Expires At" name="expiresAt" type="date"
                defaultValue={editing?.expiresAt ? editing.expiresAt.toISOString().split("T")[0] : ""} />
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">Status</label>
                <select name="isActive" defaultValue={editing ? (editing.isActive ? "true" : "false") : "true"}
                  className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm bg-white outline-none focus:border-[#3b82f6]">
                  <option value="true">Active</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit"
                className="px-5 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm">
                {editing ? "Save Changes" : "Create Coupon"}
              </button>
              <a href="/admin/coupons"
                className="px-5 py-2.5 border border-[#e2e8f0] text-[#64748b] text-[13px] font-bold rounded-sm hover:border-[#3b82f6]">
                Cancel
              </a>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-[#e2e8f0] rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#f8fafc] text-[#64748b] text-[11px] uppercase tracking-wide border-b border-[#e2e8f0]">
                {["Code", "Type", "Value", "Min Order", "Used / Max", "Expires", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-3 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => {
                const expired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
                return (
                  <tr key={coupon.id} className={`border-t border-[#f1f5f9] hover:bg-[#f8fafc] ${!coupon.isActive || expired ? "opacity-60" : ""}`}>
                    <td className="px-5 py-3 font-black font-mono text-[14px] text-[#1e293b]">{coupon.code}</td>
                    <td className="px-5 py-3 text-[#64748b]">{DISCOUNT_TYPES.find((t) => t.value === coupon.discountType)?.label ?? coupon.discountType}</td>
                    <td className="px-5 py-3 font-bold text-[#1e293b]">
                      {coupon.discountType === "PERCENTAGE" ? `${coupon.discountValue}%`
                        : coupon.discountType === "FREE_SHIPPING" ? "Free"
                        : `${coupon.discountValue} EGP`}
                    </td>
                    <td className="px-5 py-3 text-[#64748b]">
                      {coupon.minOrderEgp ? `${coupon.minOrderEgp} EGP` : "—"}
                    </td>
                    <td className="px-5 py-3 text-[#64748b]">
                      {coupon.usedCount} / {coupon.maxUses ?? "∞"}
                    </td>
                    <td className="px-5 py-3 text-[#64748b]">
                      {coupon.expiresAt
                        ? <span className={expired ? "text-red-500 font-bold" : ""}>{new Date(coupon.expiresAt).toLocaleDateString("en-EG", { day: "numeric", month: "short", year: "numeric" })}</span>
                        : "Never"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${expired ? "bg-red-100 text-red-600" : coupon.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {expired ? "Expired" : coupon.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-3">
                        <a href={`?edit=${coupon.id}`} className="text-[#3b82f6] hover:underline font-bold text-[12px]">Edit</a>
                        <form action={toggleCoupon}>
                          <input type="hidden" name="id" value={coupon.id} />
                          <input type="hidden" name="isActive" value={coupon.isActive.toString()} />
                          <button type="submit" className="text-[12px] text-[#64748b] hover:text-[#1e293b] underline">
                            {coupon.isActive ? "Disable" : "Enable"}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {coupons.length === 0 && <div className="py-12 text-center text-[#94a3b8]">No coupons yet.</div>}
        </div>
      </div>
    </div>
  );
}

function GF({ label, name, type = "text", required, defaultValue, placeholder, step }: {
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
