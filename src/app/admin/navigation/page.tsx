import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const metadata = { title: "Navigation — Admin" };

async function saveItem(formData: FormData) {
  "use server";
  const id = formData.get("id") as string | null;
  const data = {
    menu: formData.get("menu") as string,
    label: formData.get("label") as string,
    labelAr: (formData.get("labelAr") as string)?.trim() || null,
    href: formData.get("href") as string,
    sortOrder: Number(formData.get("sortOrder") || "0"),
    openNew: formData.get("openNew") === "on",
  };
  const session = await auth();
  if (id) {
    await prisma.menuItem.update({ where: { id }, data });
    await audit(session?.user?.email, "navigation.item_updated", "Settings", id, { label: data.label });
  } else {
    const created = await prisma.menuItem.create({ data });
    await audit(session?.user?.email, "navigation.item_created", "Settings", created.id, { label: data.label });
  }
  revalidatePath("/admin/navigation");
  redirect("/admin/navigation");
}

async function deleteItem(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  await prisma.menuItem.delete({ where: { id } });
  const session = await auth();
  await audit(session?.user?.email, "navigation.item_deleted", "Settings", id);
  revalidatePath("/admin/navigation");
}

const MENUS = [
  { key: "footer_shop", label: "Footer — Shop Column" },
  { key: "footer_help", label: "Footer — Help Column" },
  { key: "footer_legal", label: "Footer Legal (bottom bar)" },
];

export default async function NavigationPage({ searchParams }: { searchParams: { add?: string; edit?: string; menu?: string } }) {
  const items = await prisma.menuItem.findMany({ orderBy: [{ menu: "asc" }, { sortOrder: "asc" }] });
  const byMenu = Object.fromEntries(MENUS.map((m) => [m.key, items.filter((i) => i.menu === m.key)]));

  const editing = searchParams.edit ? items.find((i) => i.id === searchParams.edit) : null;
  const showForm = searchParams.add === "1" || !!editing;
  const defaultMenu = searchParams.menu || editing?.menu || "header";

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-black text-[#1e293b]">Navigation Menus</h1>
          <p className="text-[13px] text-[#64748b] mt-1">
            The header category nav is auto-generated from{" "}
            <a href="/admin/categories" className="text-[#3b82f6] hover:underline">Categories</a>.
            Use the footer columns below to manage footer links — changes go live immediately.
          </p>
        </div>
        {!showForm && (
          <a href="?add=1" className="px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm">+ Add Item</a>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-[#e2e8f0] rounded-sm p-5 mb-6">
          <h2 className="text-[15px] font-black text-[#1e293b] mb-4">{editing ? "Edit Item" : "New Menu Item"}</h2>
          <form action={saveItem} className="space-y-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1">Menu *</label>
                <select name="menu" defaultValue={defaultMenu}
                  className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm bg-white outline-none focus:border-[#3b82f6]">
                  {MENUS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1">Sort Order</label>
                <input type="number" name="sortOrder" defaultValue={editing?.sortOrder ?? 0} min="0"
                  className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
              </div>
              <div>
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1">Label *</label>
                <input name="label" required defaultValue={editing?.label ?? ""}
                  className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
              </div>
              <div>
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1">Label (Arabic)</label>
                <input name="labelAr" defaultValue={editing?.labelAr ?? ""}
                  className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
              </div>
              <div>
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1">URL *</label>
                <input name="href" required defaultValue={editing?.href ?? ""} placeholder="/category/fiction"
                  className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] font-mono rounded-sm outline-none focus:border-[#3b82f6]" />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="openNew" defaultChecked={editing?.openNew ?? false} className="accent-[#3b82f6] w-4 h-4" />
                  <span className="text-[13px] text-[#64748b]">Open in new tab</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="px-5 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm">Save Item</button>
              <a href="/admin/navigation" className="px-5 py-2.5 border border-[#e2e8f0] text-[#64748b] text-[13px] font-bold rounded-sm hover:border-[#3b82f6]">Cancel</a>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-6">
        {MENUS.map((menu) => (
          <div key={menu.key} className="bg-white border border-[#e2e8f0] rounded-sm overflow-hidden">
            <div className="px-4 py-3 bg-[#f8fafc] border-b border-[#e2e8f0] flex items-center justify-between">
              <h2 className="text-[13px] font-black text-[#1e293b]">{menu.label}</h2>
              <a href={`?add=1&menu=${menu.key}`} className="text-[12px] text-[#3b82f6] font-bold hover:underline">+ Add</a>
            </div>
            {byMenu[menu.key].length === 0 ? (
              <p className="px-4 py-6 text-[13px] text-[#94a3b8] text-center">No items</p>
            ) : (
              <table className="w-full text-[13px]">
                <tbody className="divide-y divide-[#f1f5f9]">
                  {byMenu[menu.key].map((item) => (
                    <tr key={item.id} className="hover:bg-[#f8fafc]">
                      <td className="px-4 py-3 w-8 text-[#94a3b8]">{item.sortOrder}</td>
                      <td className="px-4 py-3 font-bold text-[#1e293b]">{item.label}</td>
                      {item.labelAr && <td className="px-4 py-3 text-[#64748b]">{item.labelAr}</td>}
                      <td className="px-4 py-3 font-mono text-[12px] text-[#64748b]">{item.href}</td>
                      {item.openNew && <td className="px-4 py-3 text-[11px] text-[#94a3b8]">new tab</td>}
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-3 justify-end">
                          <a href={`?edit=${item.id}`} className="text-[12px] text-[#3b82f6] font-bold hover:underline">Edit</a>
                          <form action={deleteItem} className="inline">
                            <input type="hidden" name="id" value={item.id} />
                            <button type="submit" className="text-[12px] text-red-500 font-bold hover:underline">Delete</button>
                          </form>
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
