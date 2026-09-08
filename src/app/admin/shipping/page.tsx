import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EG_GOVERNORATES } from "@/lib/governorates";
import { ConfirmForm } from "@/components/admin/ConfirmForm";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const metadata = { title: "Shipping — Admin" };

async function saveZone(formData: FormData) {
  "use server";
  const id = formData.get("id") as string | null;
  const name = formData.get("name") as string;
  const countries = (formData.get("countries") as string).split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);
  const session = await auth();
  if (id) {
    await prisma.shippingZone.update({ where: { id }, data: { name, countries } });
    await audit(session?.user?.email, "shipping.zone_updated", "Shipping", id, { name });
  } else {
    const created = await prisma.shippingZone.create({ data: { name, countries } });
    await audit(session?.user?.email, "shipping.zone_created", "Shipping", created.id, { name });
  }
  revalidatePath("/admin/shipping");
  redirect("/admin/shipping");
}

async function saveRate(formData: FormData) {
  "use server";
  const id = formData.get("id") as string | null;
  const data = {
    zoneId: formData.get("zoneId") as string,
    name: formData.get("name") as string,
    nameAr: (formData.get("nameAr") as string)?.trim() || null,
    priceEgp: Number(formData.get("priceEgp")),
    minDays: Number(formData.get("minDays") || 1),
    maxDays: Number(formData.get("maxDays") || 5),
    freeAboveEgp: formData.get("freeAboveEgp") ? Number(formData.get("freeAboveEgp")) : null,
    governorates: formData.getAll("governorates").map((g) => String(g)).filter(Boolean),
    sortOrder: Number(formData.get("sortOrder") || 0),
  };
  const session = await auth();
  if (id) {
    await prisma.shippingRate.update({ where: { id }, data });
    await audit(session?.user?.email, "shipping.rate_updated", "Shipping", id, { name: data.name });
  } else {
    const created = await prisma.shippingRate.create({ data });
    await audit(session?.user?.email, "shipping.rate_created", "Shipping", created.id, { name: data.name });
  }
  revalidatePath("/admin/shipping");
  redirect("/admin/shipping");
}

async function deleteZone(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  await prisma.shippingZone.delete({ where: { id } });
  const session = await auth();
  await audit(session?.user?.email, "shipping.zone_deleted", "Shipping", id);
  revalidatePath("/admin/shipping");
}

async function deleteRate(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  await prisma.shippingRate.delete({ where: { id } });
  const session = await auth();
  await audit(session?.user?.email, "shipping.rate_deleted", "Shipping", id);
  revalidatePath("/admin/shipping");
}

export default async function ShippingPage({ searchParams }: { searchParams: { addZone?: string; addRate?: string; editRate?: string; editZone?: string; zone?: string } }) {
  const zones = await prisma.shippingZone.findMany({
    include: { rates: true },
    orderBy: { sortOrder: "asc" },
  });

  const editingRate = searchParams.editRate
    ? zones.flatMap((z) => z.rates).find((r) => r.id === searchParams.editRate)
    : null;

  const editingZone = searchParams.editZone
    ? zones.find((z) => z.id === searchParams.editZone)
    : null;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-black text-[#1e293b]">Shipping Zones & Rates</h1>
          <p className="text-[13px] text-[#64748b] mt-1 max-w-2xl">
            A <strong>zone</strong> groups countries (e.g. Egypt = <code>EG</code>; for the rest of the
            world use <code>*</code>). Inside each zone, add <strong>rates</strong> — for Egypt these can be
            governorate/area prices (Cairo, Alexandria…), for international a flat rate.
          </p>
        </div>
        {!searchParams.addZone && (
          <a href="?addZone=1" className="px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm">+ Add Zone</a>
        )}
      </div>

      {(searchParams.addZone || editingZone) && (
        <div className="bg-white border border-[#e2e8f0] rounded-sm p-5 mb-6">
          <h2 className="text-[15px] font-black text-[#1e293b] mb-4">{editingZone ? "Edit Shipping Zone" : "New Shipping Zone"}</h2>
          <form action={saveZone} className="space-y-4">
            {editingZone && <input type="hidden" name="id" value={editingZone.id} />}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1">Zone Name *</label>
                <input name="name" required defaultValue={editingZone?.name ?? ""} placeholder="e.g. Egypt, Gulf, Worldwide"
                  className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
              </div>
              <div>
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1">Countries (ISO codes, comma-separated)</label>
                <input name="countries" defaultValue={editingZone?.countries.join(", ") ?? ""} placeholder="EG, SA, AE, KW"
                  className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] font-mono rounded-sm outline-none focus:border-[#3b82f6]" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="px-5 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm">
                {editingZone ? "Save Zone" : "Create Zone"}
              </button>
              <a href="/admin/shipping" className="px-5 py-2.5 border border-[#e2e8f0] text-[#64748b] text-[13px] font-bold rounded-sm">Cancel</a>
            </div>
          </form>
        </div>
      )}

      {(searchParams.addRate || editingRate) && (
        <div className="bg-white border border-[#e2e8f0] rounded-sm p-5 mb-6">
          <h2 className="text-[15px] font-black text-[#1e293b] mb-4">{editingRate ? "Edit Rate" : "New Shipping Rate"}</h2>
          <form action={saveRate} className="space-y-4">
            {editingRate && <input type="hidden" name="id" value={editingRate.id} />}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1">Zone *</label>
                <select name="zoneId" defaultValue={editingRate?.zoneId ?? searchParams.zone ?? ""}
                  className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm bg-white outline-none focus:border-[#3b82f6]">
                  {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1">Rate / Area Name *</label>
                <input name="name" required defaultValue={editingRate?.name ?? ""} placeholder="e.g. Cairo & Giza / Standard"
                  className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
              </div>
              <div>
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1">Name (Arabic)</label>
                <input name="nameAr" defaultValue={editingRate?.nameAr ?? ""} placeholder="القاهرة والجيزة" dir="rtl"
                  className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
              </div>
              <div>
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1">Price (EGP)</label>
                <input type="number" name="priceEgp" defaultValue={editingRate?.priceEgp ?? ""} step="0.01"
                  className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
              </div>
              <div>
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1">Delivery (Min Days)</label>
                <input type="number" name="minDays" defaultValue={editingRate?.minDays ?? 1} min="0"
                  className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
              </div>
              <div>
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1">Delivery (Max Days)</label>
                <input type="number" name="maxDays" defaultValue={editingRate?.maxDays ?? 5} min="0"
                  className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
              </div>
              <div>
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1">Sort Order</label>
                <input type="number" name="sortOrder" defaultValue={(editingRate as any)?.sortOrder ?? 0} step="1"
                  className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1">
                  Egypt Governorates covered by this rate
                </label>
                <p className="text-[11px] text-[#94a3b8] mb-2">
                  Tick the governorates this rate applies to. At checkout, the customer&apos;s selected
                  governorate auto-picks the matching rate. (Ignore for international rates.)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 max-h-56 overflow-y-auto border border-[#e2e8f0] rounded-sm p-3">
                  {EG_GOVERNORATES.map((g) => (
                    <label key={g.code} className="flex items-center gap-2 text-[12px] text-[#334155]">
                      <input
                        type="checkbox"
                        name="governorates"
                        value={g.code}
                        defaultChecked={(editingRate as any)?.governorates?.includes(g.code) ?? false}
                        className="accent-[#3b82f6]"
                      />
                      {g.en}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="px-5 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm">Save Rate</button>
              <a href="/admin/shipping" className="px-5 py-2.5 border border-[#e2e8f0] text-[#64748b] text-[13px] font-bold rounded-sm">Cancel</a>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-5">
        {zones.length === 0 ? (
          <div className="bg-white border border-[#e2e8f0] rounded-sm py-12 text-center text-[#94a3b8]">No shipping zones yet — add one above.</div>
        ) : zones.map((zone) => (
          <div key={zone.id} className="bg-white border border-[#e2e8f0] rounded-sm overflow-hidden">
            <div className="px-4 py-3 bg-[#f8fafc] border-b border-[#e2e8f0] flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-black text-[#1e293b]">{zone.name}</h2>
                <p className="text-[11px] font-mono text-[#94a3b8]">{zone.countries.join(", ") || "All countries"}</p>
              </div>
              <div className="flex gap-3">
                <a href={`?addRate=1&zone=${zone.id}`} className="text-[12px] text-[#3b82f6] font-bold hover:underline">+ Rate</a>
                <a href={`?editZone=${zone.id}`} className="text-[12px] text-[#64748b] font-bold hover:underline">Edit</a>
                <ConfirmForm action={deleteZone} className="inline"
                  message={`Delete zone "${zone.name}" and all its rates?`}>
                  <input type="hidden" name="id" value={zone.id} />
                  <button type="submit" className="text-[12px] text-red-500 font-bold hover:underline">Delete</button>
                </ConfirmForm>
              </div>
            </div>
            {zone.rates.length === 0 ? (
              <p className="px-4 py-4 text-[13px] text-[#94a3b8]">No rates yet</p>
            ) : (
              <table className="w-full text-[13px]">
                <thead className="border-b border-[#f1f5f9]">
                  <tr>
                    {["Name", "EGP", "Delivery", ""].map((h) => (
                      <th key={h} className="text-left px-4 py-2 text-[11px] font-bold uppercase text-[#94a3b8]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {zone.rates.map((rate) => (
                    <tr key={rate.id} className="hover:bg-[#f8fafc]">
                      <td className="px-4 py-3 font-bold">{rate.name}</td>
                      <td className="px-4 py-3">{rate.priceEgp} EGP</td>
                      <td className="px-4 py-3 text-[#64748b]">{rate.minDays}–{rate.maxDays} days</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-3">
                          <a href={`?editRate=${rate.id}`} className="text-[12px] text-[#3b82f6] font-bold hover:underline">Edit</a>
                          <ConfirmForm action={deleteRate} className="inline" message="Delete this rate?">
                            <input type="hidden" name="id" value={rate.id} />
                            <button type="submit" className="text-[12px] text-red-500 font-bold hover:underline">Delete</button>
                          </ConfirmForm>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
