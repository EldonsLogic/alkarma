import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { toSlug } from "@/lib/slug";

export const metadata = { title: "Categories — Admin" };

async function saveCategory(formData: FormData) {
  "use server";
  const id = formData.get("id") as string | null;
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  // Arabic-safe slug (keeps Arabic letters instead of producing an empty slug)
  const slug = toSlug(name);
  const parentId = (formData.get("parentId") as string) || null;

  // A child inherits its parent's kind; otherwise use the chosen kind
  let kind = (formData.get("kind") as string) === "STATIONERY" ? "STATIONERY" : "BOOK";
  if (parentId) {
    const parent = await prisma.category.findUnique({ where: { id: parentId }, select: { kind: true } });
    if (parent) kind = parent.kind;
  }

  const data = {
    kind,
    name,
    nameAr: (formData.get("nameAr") as string)?.trim() || null,
    imageUrl: (formData.get("imageUrl") as string)?.trim() || null,
    parentId,
    sortOrder: parseInt(formData.get("sortOrder") as string, 10) || 0,
    isActive: formData.get("isActive") !== "false",
  };

  const session = await auth();
  if (id) {
    await prisma.category.update({ where: { id }, data });
    await audit(session?.user?.email, "category.updated", "Category", id, { name });
  } else {
    let finalSlug = slug;
    let s = 1;
    while (await prisma.category.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${slug}-${s++}`;
    }
    const created = await prisma.category.create({ data: { ...data, slug: finalSlug } });
    await audit(session?.user?.email, "category.created", "Category", created.id, { name });
  }
  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}

async function toggleActive(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const current = formData.get("isActive") === "true";
  await prisma.category.update({ where: { id }, data: { isActive: !current } });
  revalidatePath("/admin/categories");
}

export default async function AdminCategoriesPage({ searchParams }: { searchParams: { edit?: string; add?: string } }) {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { books: true, children: true } },
      parent: { select: { name: true } },
    },
  });

  const roots = categories.filter((c) => !c.parentId);
  const editing = searchParams.edit ? categories.find((c) => c.id === searchParams.edit) : null;
  const showForm = searchParams.add === "1" || !!editing;

  // Order roots: English (Latin) before Arabic, then by sortOrder
  const isLatin = (s: string) => /^[A-Za-z]/.test(s.trim());
  const sortRoots = (list: typeof categories) =>
    [...list].sort((a, b) => {
      const la = isLatin(a.name), lb = isLatin(b.name);
      if (la !== lb) return la ? -1 : 1;
      return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
    });

  // Build a flat, tree-ordered list (parent immediately followed by its children)
  type Cat = (typeof categories)[number];
  function orderedTree(kind: string): { cat: Cat; depth: number }[] {
    const kinded = categories.filter((c) => c.kind === kind);
    const out: { cat: Cat; depth: number }[] = [];
    for (const r of sortRoots(kinded.filter((c) => !c.parentId))) {
      out.push({ cat: r, depth: 0 });
      kinded
        .filter((c) => c.parentId === r.id)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
        .forEach((ch) => out.push({ cat: ch, depth: 1 }));
    }
    return out;
  }

  const SECTIONS = [
    { kind: "BOOK", label: "📚 Book Categories", rows: orderedTree("BOOK") },
    { kind: "STATIONERY", label: "✏️ Stationery Categories", rows: orderedTree("STATIONERY") },
  ];

  // Parent dropdown options grouped by kind (only top-level categories)
  const bookRoots = sortRoots(roots.filter((c) => c.kind === "BOOK" && c.id !== editing?.id));
  const stationeryRoots = sortRoots(roots.filter((c) => c.kind === "STATIONERY" && c.id !== editing?.id));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-black text-[#1e293b]">Categories ({categories.length})</h1>
        {!showForm && (
          <a href="?add=1"
            className="px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm transition-colors">
            + Add Category
          </a>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-[#e2e8f0] rounded-sm p-6 mb-6">
          <h2 className="text-[15px] font-black text-[#1e293b] mb-4">{editing ? "Edit Category" : "New Category"}</h2>
          <form action={saveCategory} className="space-y-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CF label="Name *" name="name" required defaultValue={editing?.name ?? ""} />
              <CF label="Name (Arabic)" name="nameAr" defaultValue={editing?.nameAr ?? ""} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">Catalogue *</label>
                <select name="kind" defaultValue={editing?.kind ?? "BOOK"}
                  className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm bg-white outline-none focus:border-[#3b82f6]">
                  <option value="BOOK">Books</option>
                  <option value="STATIONERY">Stationery</option>
                </select>
                <p className="text-[10px] text-[#94a3b8] mt-1">Ignored if a parent is chosen (inherits parent&apos;s catalogue).</p>
              </div>
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">Parent Category</label>
                <select name="parentId" defaultValue={editing?.parentId ?? ""}
                  className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm bg-white outline-none focus:border-[#3b82f6]">
                  <option value="">— Top Level —</option>
                  <optgroup label="Book categories">
                    {bookRoots.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                  <optgroup label="Stationery categories">
                    {stationeryRoots.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                </select>
              </div>
              <CF label="Sort Order" name="sortOrder" type="number" defaultValue={(editing?.sortOrder ?? 0).toString()} />
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">Status</label>
                <select name="isActive" defaultValue={editing ? (editing.isActive ? "true" : "false") : "true"}
                  className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm bg-white outline-none focus:border-[#3b82f6]">
                  <option value="true">Active</option>
                  <option value="false">Hidden</option>
                </select>
              </div>
            </div>
            <ImageUpload
              name="imageUrl"
              label="Category Image"
              defaultValue={editing?.imageUrl ?? ""}
              shape="banner"
              dimensions="600 × 400 px"
              dimensionsNote="(3 : 2 ratio — landscape tile)"
            />
            <div className="flex gap-3 pt-1">
              <button type="submit"
                className="px-5 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm transition-colors">
                {editing ? "Save Changes" : "Create Category"}
              </button>
              <a href="/admin/categories"
                className="px-5 py-2.5 border border-[#e2e8f0] text-[#64748b] text-[13px] font-bold rounded-sm hover:border-[#3b82f6]">
                Cancel
              </a>
            </div>
          </form>
        </div>
      )}

      {/* Kind-grouped tree tables */}
      {categories.length === 0 ? (
        <div className="bg-white border border-[#e2e8f0] rounded-sm py-10 text-center text-[#94a3b8]">No categories yet.</div>
      ) : (
        <div className="space-y-6">
          {SECTIONS.filter((s) => s.rows.length > 0).map((section) => (
            <div key={section.kind} className="bg-white border border-[#e2e8f0] rounded-sm overflow-hidden">
              <div className="px-5 py-3 bg-[#1e293b] text-white text-[13px] font-black">{section.label} ({section.rows.length})</div>
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#f8fafc] text-[#64748b] text-[11px] uppercase tracking-wide border-b border-[#e2e8f0]">
                    {["Name", "Products", "Order", "Status", "Actions"].map((h) => (
                      <th key={h} className="text-left px-5 py-2.5 font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map(({ cat, depth }) => (
                    <tr key={cat.id} className={`border-t border-[#f1f5f9] hover:bg-[#f8fafc] ${!cat.isActive ? "opacity-50" : ""} ${depth === 0 ? "bg-[#fbfcfe]" : ""}`}>
                      <td className="px-5 py-3" style={{ paddingLeft: depth ? 40 : 20 }}>
                        <p className={`text-[#1e293b] ${depth === 0 ? "font-black" : "font-medium"}`}>
                          {depth ? "↳ " : ""}{cat.name}
                        </p>
                        {cat.nameAr && <p className="text-[11px] text-[#94a3b8]">{cat.nameAr}</p>}
                        <p className="text-[11px] text-[#94a3b8] font-mono">{cat.slug}</p>
                      </td>
                      <td className="px-5 py-3 text-[#64748b]">{cat._count.books}</td>
                      <td className="px-5 py-3 text-[#64748b]">{cat.sortOrder}</td>
                      <td className="px-5 py-3">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cat.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {cat.isActive ? "Active" : "Hidden"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <a href={`?edit=${cat.id}`} className="text-[#3b82f6] hover:underline font-bold text-[12px]">Edit</a>
                          <form action={toggleActive}>
                            <input type="hidden" name="id" value={cat.id} />
                            <input type="hidden" name="isActive" value={cat.isActive.toString()} />
                            <button type="submit" className="text-[12px] text-[#64748b] hover:text-[#1e293b] underline">
                              {cat.isActive ? "Hide" : "Show"}
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CF({ label, name, type = "text", required, defaultValue, placeholder }: {
  label: string; name: string; type?: string; required?: boolean; defaultValue?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">{label}</label>
      <input type={type} name={name} required={required} defaultValue={defaultValue} placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
    </div>
  );
}
