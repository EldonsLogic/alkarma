import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const metadata = { title: "Featured Lists — Admin" };

async function saveList(formData: FormData) {
  "use server";
  const id = formData.get("id") as string | null;
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const slug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60);

  const data = {
    name,
    nameAr: (formData.get("nameAr") as string)?.trim() || null,
    type: (formData.get("type") as string) || "CUSTOM",
    isActive: formData.get("isActive") !== "false",
  };

  const session = await auth();
  if (id) {
    await prisma.featuredList.update({ where: { id }, data });
    await audit(session?.user?.email, "featured.list_updated", "Settings", id, { name });
  } else {
    let finalSlug = slug;
    let s = 1;
    while (await prisma.featuredList.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${slug}-${s++}`;
    }
    const created = await prisma.featuredList.create({ data: { ...data, slug: finalSlug } });
    await audit(session?.user?.email, "featured.list_created", "Settings", created.id, { name });
  }
  revalidatePath("/admin/editorial/featured");
  redirect("/admin/editorial/featured");
}

async function addBookToList(formData: FormData) {
  "use server";
  const listId = formData.get("listId") as string;
  const bookId = formData.get("bookId") as string;
  const note = (formData.get("note") as string)?.trim() || null;
  const noteAr = (formData.get("noteAr") as string)?.trim() || null;
  // "current" = make it the top item (this month's pick); else append to the end.
  const position = (formData.get("position") as string) || "previous";
  if (!listId || !bookId) return;

  const bounds = await prisma.featuredListItem.aggregate({
    where: { listId },
    _min: { sortOrder: true },
    _max: { sortOrder: true },
  });

  const sortOrder =
    position === "current"
      ? (bounds._min.sortOrder ?? 0) - 1 // sorts first
      : (bounds._max.sortOrder ?? 0) + 1; // sorts last

  await prisma.featuredListItem.create({
    data: { listId, bookId, note, noteAr, sortOrder },
  });
  const [book, list, session] = await Promise.all([
    prisma.book.findUnique({ where: { id: bookId }, select: { title: true } }),
    prisma.featuredList.findUnique({ where: { id: listId }, select: { name: true } }),
    auth(),
  ]);
  await audit(session?.user?.email, position === "current" ? "featured.pick_set" : "featured.item_added", "Settings", listId, { list: list?.name ?? "", book: book?.title ?? "" });
  revalidatePath("/admin/editorial/featured");
  revalidatePath("/");
  revalidatePath("/book-of-the-month");
}

/** Promote an existing item to the top (this month's pick). */
async function setAsCurrent(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const listId = formData.get("listId") as string;
  if (!id || !listId) return;

  const min = await prisma.featuredListItem.aggregate({
    where: { listId },
    _min: { sortOrder: true },
  });
  const updated = await prisma.featuredListItem.update({
    where: { id },
    data: { sortOrder: (min._min.sortOrder ?? 0) - 1 },
    include: { book: { select: { title: true } }, list: { select: { name: true } } },
  });
  const session = await auth();
  await audit(session?.user?.email, "featured.pick_set", "Settings", listId, { list: updated.list.name, book: updated.book.title });
  revalidatePath("/admin/editorial/featured");
  revalidatePath("/");
  revalidatePath("/book-of-the-month");
}

async function removeFromList(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  await prisma.featuredListItem.delete({ where: { id } });
  revalidatePath("/admin/editorial/featured");
  revalidatePath("/");
  revalidatePath("/book-of-the-month");
}

const LIST_TYPES = [
  { value: "BOOK_OF_THE_MONTH", label: "Book of the Month" },
  { value: "STAFF_PICKS", label: "Staff Picks" },
  { value: "SEASONAL", label: "Seasonal" },
  { value: "CUSTOM", label: "Custom" },
];

export default async function AdminFeaturedPage({ searchParams }: { searchParams: { list?: string; add?: string } }) {
  const lists = await prisma.featuredList.findMany({
    orderBy: { name: "asc" },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: { book: { select: { id: true, title: true, author: true, coverUrl: true } }, },
      },
    },
  });

  const allBooks = await prisma.book.findMany({
    where: { isActive: true },
    orderBy: { title: "asc" },
    select: { id: true, title: true, author: true },
    take: 200,
  });

  const activeList = searchParams.list ? lists.find((l) => l.id === searchParams.list) : null;
  const showNewForm = searchParams.add === "1";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-black text-[#1e293b]">Featured Lists</h1>
        {!showNewForm && (
          <a href="?add=1"
            className="px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm">
            + New List
          </a>
        )}
      </div>

      {/* New list form */}
      {showNewForm && (
        <div className="bg-white border border-[#e2e8f0] rounded-sm p-6 mb-6">
          <h2 className="text-[15px] font-black text-[#1e293b] mb-4">Create Featured List</h2>
          <form action={saveList} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">Name *</label>
                <input name="name" required placeholder="e.g. Staff Picks — April"
                  className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
              </div>
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">Type</label>
                <select name="type" defaultValue="CUSTOM"
                  className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm bg-white outline-none focus:border-[#3b82f6]">
                  {LIST_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">Name (Arabic)</label>
              <input name="nameAr" className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="px-5 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm">
                Create List
              </button>
              <a href="/admin/editorial/featured" className="px-5 py-2.5 border border-[#e2e8f0] text-[#64748b] text-[13px] font-bold rounded-sm">
                Cancel
              </a>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Lists sidebar */}
        <div className="space-y-2">
          <p className="text-[11px] font-black text-[#64748b] uppercase tracking-wide px-1 mb-3">Lists ({lists.length})</p>
          {lists.map((list) => (
            <a key={list.id} href={`?list=${list.id}`}
              className={`flex items-center justify-between px-4 py-3 border rounded-sm transition-colors ${
                activeList?.id === list.id
                  ? "border-[#3b82f6] bg-blue-50"
                  : "bg-white border-[#e2e8f0] hover:border-[#3b82f6]"
              }`}>
              <div className="min-w-0">
                <p className={`text-[13px] font-bold truncate ${list.isActive ? "text-[#1e293b]" : "text-[#94a3b8]"}`}>{list.name}</p>
                <p className="text-[11px] text-[#94a3b8]">{list.items.length} books · {LIST_TYPES.find((t) => t.value === list.type)?.label}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${list.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {list.isActive ? "On" : "Off"}
              </span>
            </a>
          ))}
          {lists.length === 0 && <p className="text-[13px] text-[#94a3b8] px-1">No lists yet.</p>}
        </div>

        {/* Right panel */}
        {activeList ? (
          <div className="space-y-4">
            <div className="bg-white border border-[#e2e8f0] rounded-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[16px] font-black text-[#1e293b]">{activeList.name}</h2>
                <form action={saveList}>
                  <input type="hidden" name="id" value={activeList.id} />
                  <input type="hidden" name="name" value={activeList.name} />
                  <input type="hidden" name="type" value={activeList.type} />
                  <input type="hidden" name="isActive" value={(!activeList.isActive).toString()} />
                  <button type="submit"
                    className={`text-[12px] font-bold px-3 py-1.5 rounded-sm border transition-colors ${activeList.isActive ? "border-gray-300 text-gray-500 hover:bg-gray-50" : "border-green-300 text-green-600 hover:bg-green-50"}`}>
                    {activeList.isActive ? "Deactivate" : "Activate"}
                  </button>
                </form>
              </div>

              {/* Add book */}
              <form action={addBookToList} className="flex gap-2 flex-wrap mb-5 pb-5 border-b border-[#f1f5f9]">
                <input type="hidden" name="listId" value={activeList.id} />
                <select name="bookId" required
                  className="flex-1 min-w-[200px] px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm bg-white outline-none focus:border-[#3b82f6]">
                  <option value="">Select a book to add...</option>
                  {allBooks.filter((b) => !activeList.items.some((i) => i.bookId === b.id)).map((b) => (
                    <option key={b.id} value={b.id}>{b.title} — {b.author}</option>
                  ))}
                </select>
                <input name="note" placeholder="Editor's note (optional)"
                  className="flex-1 min-w-[180px] px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
                <input name="noteAr" placeholder="ملاحظة المحرر (اختياري)" dir="rtl"
                  className="flex-1 min-w-[180px] px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
                {activeList.type === "BOOK_OF_THE_MONTH" ? (
                  <div className="flex gap-2 flex-wrap">
                    <button type="submit" name="position" value="current"
                      className="px-4 py-2 bg-brand hover:bg-brand-dark text-white text-[13px] font-bold rounded-sm whitespace-nowrap">
                      ★ Set as This Month&apos;s Pick
                    </button>
                    <button type="submit" name="position" value="previous"
                      className="px-4 py-2 bg-[#334155] hover:bg-[#1e293b] text-white text-[13px] font-bold rounded-sm whitespace-nowrap">
                      Add to Previous Picks
                    </button>
                  </div>
                ) : (
                  <button type="submit" name="position" value="previous"
                    className="px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm">
                    Add
                  </button>
                )}
              </form>

              {activeList.type === "BOOK_OF_THE_MONTH" && (
                <p className="text-[11px] text-[#94a3b8] -mt-3 mb-4">
                  The <b>top</b> book is what shows on the homepage &amp; the Book of the Month page as <b>this month&apos;s pick</b>.
                  Adding a new pick pushes the old one down into <b>Previous Picks</b>. Use <b>★ Make this month&apos;s pick</b> to promote any previous title back to the top.
                </p>
              )}

              {/* Book items */}
              {activeList.type === "BOOK_OF_THE_MONTH" ? (
                <div className="space-y-5">
                  {/* This month's pick — the top item */}
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-wide text-brand mb-2">★ This Month&apos;s Pick</p>
                    {activeList.items[0] ? (
                      <FeaturedItemRow item={activeList.items[0]} listId={activeList.id} current />
                    ) : (
                      <p className="text-[12px] text-[#94a3b8] italic px-3 py-2">No pick set — add a book as this month&apos;s pick above.</p>
                    )}
                  </div>

                  {/* Previous picks — the rest */}
                  {activeList.items.length > 1 && (
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wide text-[#64748b] mb-2">Previous Picks ({activeList.items.length - 1})</p>
                      <div className="space-y-2">
                        {activeList.items.slice(1).map((item) => (
                          <FeaturedItemRow key={item.id} item={item} listId={activeList.id} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {activeList.items.map((item) => (
                    <FeaturedItemRow key={item.id} item={item} listId={activeList.id} />
                  ))}
                  {activeList.items.length === 0 && (
                    <p className="text-[13px] text-[#94a3b8] text-center py-6">No books in this list yet.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-[#e2e8f0] rounded-sm p-12 text-center text-[#94a3b8]">
            <p className="text-[14px]">Select a list from the left to manage its books.</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface RowItem {
  id: string;
  note: string | null;
  noteAr?: string | null;
  book: { title: string; author: string };
}

/** One book row inside a featured list — with promote (to current) + remove. */
function FeaturedItemRow({ item, listId, current }: { item: RowItem; listId: string; current?: boolean }) {
  return (
    <div className={`flex items-center gap-3 py-2.5 px-3 rounded-sm ${current ? "bg-brand-pale border border-brand/30" : "bg-[#f8fafc]"}`}>
      {current && (
        <span className="text-[10px] font-black uppercase tracking-wide text-brand-dark bg-white/70 px-2 py-0.5 rounded-full flex-shrink-0">Current</span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-[#1e293b] truncate">{item.book.title}</p>
        <p className="text-[11px] text-[#94a3b8]">{item.book.author}</p>
        {item.note && <p className="text-[11px] text-[#64748b] italic mt-0.5">{item.note}</p>}
        {item.noteAr && <p className="text-[11px] text-[#64748b] italic mt-0.5" dir="rtl">{item.noteAr}</p>}
      </div>
      {!current && (
        <form action={setAsCurrent}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="listId" value={listId} />
          <button type="submit" className="text-[11px] font-bold text-brand hover:text-brand-dark whitespace-nowrap px-2 py-1 border border-brand/40 rounded-sm hover:bg-brand-pale transition-colors">
            ★ Make this month&apos;s
          </button>
        </form>
      )}
      <form action={removeFromList}>
        <input type="hidden" name="id" value={item.id} />
        <button type="submit" className="text-[12px] text-red-400 hover:text-red-600 font-bold px-1">✕</button>
      </form>
    </div>
  );
}
