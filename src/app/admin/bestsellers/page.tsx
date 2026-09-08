import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const metadata = { title: "Bestsellers — Admin" };

const CAP = 10;

async function addBestseller(formData: FormData) {
  "use server";
  const bookId = formData.get("bookId") as string;
  if (!bookId) return;
  const count = await prisma.book.count({ where: { isBestseller: true } });
  if (count >= CAP) return;
  const book = await prisma.book.update({ where: { id: bookId }, data: { isBestseller: true } });
  const session = await auth();
  await audit(session?.user?.email, "bestseller.added", "Book", bookId, { title: book.title });
  revalidatePath("/admin/bestsellers");
  revalidatePath("/");
}

async function removeBestseller(formData: FormData) {
  "use server";
  const bookId = formData.get("bookId") as string;
  if (!bookId) return;
  const book = await prisma.book.update({ where: { id: bookId }, data: { isBestseller: false } });
  const session = await auth();
  await audit(session?.user?.email, "bestseller.removed", "Book", bookId, { title: book.title });
  revalidatePath("/admin/bestsellers");
  revalidatePath("/");
}

export default async function AdminBestsellersPage() {
  const [current, allBooks] = await Promise.all([
    prisma.book.findMany({
      where: { isBestseller: true },
      orderBy: { salesCount: "desc" },
      select: { id: true, title: true, author: true, coverUrl: true, salesCount: true },
    }),
    prisma.book.findMany({
      where: { isActive: true, isBestseller: false },
      orderBy: { title: "asc" },
      select: { id: true, title: true, author: true },
      take: 500,
    }),
  ]);

  const atCap = current.length >= CAP;

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-[22px] font-black text-[#1e293b]">Bestsellers</h1>
        <span className={`text-[13px] font-bold px-3 py-1 rounded-full ${
          atCap ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500"
        }`}>
          {current.length} / {CAP}
        </span>
      </div>
      <p className="text-[13px] text-[#64748b] mb-6">
        These books appear in the ranked carousel on the homepage. Rank order is determined automatically by sales count. Maximum {CAP} books.
      </p>

      {/* Add book form */}
      <div className="bg-white border border-[#e2e8f0] rounded-sm p-5 mb-6">
        <h2 className="text-[13px] font-black text-[#1e293b] uppercase tracking-wide mb-3">Add a Book</h2>
        {atCap ? (
          <p className="text-[13px] text-brand-600 font-bold">
            List is full ({CAP}/{CAP}). Remove a book before adding another.
          </p>
        ) : (
          <form action={addBestseller} className="flex gap-2 flex-wrap">
            <select
              name="bookId"
              required
              className="flex-1 min-w-[240px] px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm bg-white outline-none focus:border-[#3b82f6]"
            >
              <option value="">Select a book to add…</option>
              {allBooks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} — {b.author}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-5 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm transition-colors"
            >
              Add
            </button>
          </form>
        )}
      </div>

      {/* Current bestsellers list */}
      <div className="bg-white border border-[#e2e8f0] rounded-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#e2e8f0] bg-[#f8fafc]">
          <h2 className="text-[13px] font-black text-[#1e293b] uppercase tracking-wide">
            Current List ({current.length})
          </h2>
        </div>

        {current.length === 0 ? (
          <p className="text-[13px] text-[#94a3b8] text-center py-10">
            No bestsellers set. Add books using the form above.
          </p>
        ) : (
          <ul className="divide-y divide-[#f1f5f9]">
            {current.map((book, idx) => {
              const hasImage = book.coverUrl;
              return (
                <li key={book.id} className="flex items-center gap-4 px-5 py-3">
                  {/* Rank */}
                  <span className="text-[22px] font-black text-[#e2e8f0] w-8 text-center flex-shrink-0 leading-none">
                    {idx + 1}
                  </span>

                  {/* Cover */}
                  <div className="w-9 h-14 flex-shrink-0 bg-[#f1f5f9] overflow-hidden">
                    {hasImage ? (
                      <Image
                        src={book.coverUrl}
                        alt={book.title}
                        width={36}
                        height={56}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#e2e8f0]" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#1e293b] truncate">{book.title}</p>
                    <p className="text-[11px] text-[#94a3b8]">{book.author}</p>
                  </div>

                  {/* Sales count */}
                  <span className="text-[12px] text-[#64748b] font-mono flex-shrink-0">
                    {book.salesCount.toLocaleString()} sold
                  </span>

                  {/* Remove */}
                  <form action={removeBestseller}>
                    <input type="hidden" name="bookId" value={book.id} />
                    <button
                      type="submit"
                      className="text-[12px] text-red-400 hover:text-red-600 font-bold transition-colors px-2 py-1"
                      title="Remove from bestsellers"
                    >
                      ✕
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
