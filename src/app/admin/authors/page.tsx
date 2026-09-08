import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { ImportExportBar } from "@/components/admin/ImportExportBar";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const metadata = { title: "Authors — Admin" };

async function saveAuthor(formData: FormData) {
  "use server";
  const id = formData.get("id") as string | null;
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const slug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80);

  const data = {
    name,
    nameAr: (formData.get("nameAr") as string)?.trim() || null,
    bio: (formData.get("bio") as string)?.trim() || null,
    bioAr: (formData.get("bioAr") as string)?.trim() || null,
    photoUrl: (formData.get("photoUrl") as string)?.trim() || null,
  };

  const session = await auth();
  if (id) {
    await prisma.author.update({ where: { id }, data });
    await audit(session?.user?.email, "author.updated", "Author", id, { name });
  } else {
    let finalSlug = slug;
    let s = 1;
    while (await prisma.author.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${slug}-${s++}`;
    }
    const created = await prisma.author.create({ data: { ...data, slug: finalSlug } });
    await audit(session?.user?.email, "author.created", "Author", created.id, { name });
  }
  revalidatePath("/admin/authors");
  redirect("/admin/authors");
}

export default async function AdminAuthorsPage({ searchParams }: { searchParams: { edit?: string; add?: string; q?: string } }) {
  const q = searchParams.q?.trim();

  const authors = await prisma.author.findMany({
    where: q ? { OR: [
      { name: { contains: q } },
      { nameAr: { contains: q } },
    ]} : undefined,
    orderBy: { name: "asc" },
    // "bookLinks" (the BookAuthor join) counts every co-author correctly.
    // "books" only counts via Book.authorId — the single PRIMARY author FK —
    // so a book's 2nd/3rd co-author always showed 0 books even when they
    // were genuinely linked, which is exactly the bug this fixes.
    include: { _count: { select: { bookLinks: true } } },
  });

  const editing = searchParams.edit ? authors.find((a) => a.id === searchParams.edit)
    ?? await prisma.author.findUnique({ where: { id: searchParams.edit }, include: { _count: { select: { bookLinks: true } } } })
    : null;

  const showForm = searchParams.add === "1" || !!editing;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-black text-[#1e293b]">Authors ({authors.length})</h1>
          <div className="mt-2">
            <ImportExportBar
              exportHref="/api/admin/export/authors"
              exportLabel="Export CSV"
              importAction="/api/admin/import/authors"
              templateHref="/api/admin/import/authors"
            />
          </div>
        </div>
        {!showForm && (
          <a href="?add=1"
            className="px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm transition-colors flex-shrink-0">
            + Add Author
          </a>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-[#e2e8f0] rounded-sm p-6 mb-6">
          <h2 className="text-[15px] font-black text-[#1e293b] mb-4">{editing ? `Edit: ${editing.name}` : "New Author"}</h2>
          <form action={saveAuthor} className="space-y-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AF label="Name *" name="name" required defaultValue={editing?.name ?? ""} />
              <AF label="Name (Arabic)" name="nameAr" defaultValue={editing?.nameAr ?? ""} />
            </div>
            <ImageUpload
                name="photoUrl"
                label="Author Photo"
                defaultValue={editing?.photoUrl ?? ""}
                shape="square"
                dimensions="400 × 400 px"
                dimensionsNote="(square — displayed as circle)"
              />
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">Biography (English)</label>
                <textarea name="bio" rows={4} defaultValue={editing?.bio ?? ""}
                  placeholder="Author biography..."
                  className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6] resize-y" />
              </div>
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">
                  Biography (Arabic) — السيرة الذاتية <span className="normal-case font-normal text-[#cbd5e1]">(fallback: English)</span>
                </label>
                <textarea name="bioAr" rows={4} defaultValue={(editing as any)?.bioAr ?? ""} dir="rtl"
                  placeholder="السيرة الذاتية للمؤلف..."
                  className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6] resize-y" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit"
                className="px-5 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm">
                {editing ? "Save Changes" : "Create Author"}
              </button>
              <a href="/admin/authors"
                className="px-5 py-2.5 border border-[#e2e8f0] text-[#64748b] text-[13px] font-bold rounded-sm hover:border-[#3b82f6]">
                Cancel
              </a>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <form className="bg-white border border-[#e2e8f0] rounded-sm p-4 mb-4 flex gap-3">
        <input name="q" defaultValue={q} placeholder="Search authors..."
          className="flex-1 px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
        <button type="submit" className="px-4 py-2 bg-[#1e293b] text-white text-[13px] font-bold rounded-sm">Search</button>
        {q && <a href="/admin/authors" className="px-4 py-2 text-[13px] text-[#64748b] self-center">Clear</a>}
      </form>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {authors.map((author) => (
          <div key={author.id} className="bg-white border border-[#e2e8f0] rounded-sm p-5 flex gap-4">
            {author.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={author.photoUrl} alt={author.name}
                className="w-14 h-14 rounded-full object-cover flex-shrink-0 bg-[#e2e8f0]" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-[#e2e8f0] flex items-center justify-center flex-shrink-0 text-[20px] text-[#94a3b8] font-bold">
                {author.name[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#1e293b] truncate">{author.name}</p>
              {author.nameAr && <p className="text-[12px] text-[#94a3b8]">{author.nameAr}</p>}
              <p className="text-[11px] font-mono text-[#94a3b8] mt-0.5 truncate">{author.slug}</p>
              <p className="text-[12px] text-[#64748b] mt-1">{author._count.bookLinks} book{author._count.bookLinks !== 1 ? "s" : ""}</p>
              {author.bio && (
                <p className="text-[12px] text-[#94a3b8] line-clamp-2 mt-1">{author.bio}</p>
              )}
              <div className="flex gap-3 mt-3">
                <a href={`?edit=${author.id}`} className="text-[12px] text-[#3b82f6] hover:underline font-bold">Edit</a>
                <a href={`/author/${author.slug}`} target="_blank"
                  className="text-[12px] text-[#64748b] hover:underline">View ↗</a>
              </div>
            </div>
          </div>
        ))}
        {authors.length === 0 && (
          <div className="col-span-full py-12 text-center text-[#94a3b8]">No authors found.</div>
        )}
      </div>
    </div>
  );
}

function AF({ label, name, type = "text", required, defaultValue, placeholder }: {
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
