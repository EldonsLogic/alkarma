import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const metadata = { title: "My Wishlist" };

async function removeFromWishlist(formData: FormData) {
  "use server";
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;
  const bookId = formData.get("bookId") as string;
  await prisma.wishlistItem.deleteMany({ where: { userId, bookId } });
  revalidatePath("/account/wishlist");
}

export default async function WishlistPage() {
  const [session] = await Promise.all([auth()]);
  const userId = session!.user!.id!;
  const dateLocale = "ar-EG";

  const items = await prisma.wishlistItem.findMany({
    where: { userId },
    orderBy: { addedAt: "desc" },
    include: {
      book: {
        select: {
          id: true,
          slug: true,
          title: true,
          author: true,
          coverUrl: true,
          priceEgp: true,
          compareAtEgp: true,
          stock: true,
          isBestseller: true,
          isNewRelease: true,
        },
      },
    },
  });

  const t = {
    title: "المفضلة",
    items: (n: number) => `${n} ${n === 1 ? "منتج" : "منتجات"}`,
    empty: "قائمة المفضلة فارغة",
    emptyHint: "احفظ الكتب التي تحبها لتجدها لاحقًا.",
    discover: "اكتشف الكتب",
    bestseller: "الأكثر مبيعًا",
    newBadge: "جديد",
    addedOn: "أُضيف",
    addToBasket: "أضف إلى السلة",
    outOfStock: "نفد المخزون",
    savedNote: "المنتجات في قائمتك محفوظة حتى تحذفها.",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-black">{t.title}</h1>
        <span className="text-[13px] text-[#666]">{t.items(items.length)}</span>
      </div>

      {items.length === 0 ? (
        <div className="bg-white border border-[#ddd] p-12 text-center">
          <p className="text-[40px] mb-4">♡</p>
          <p className="text-[18px] font-bold mb-2">{t.empty}</p>
          <p className="text-[14px] text-[#666] mb-6">{t.emptyHint}</p>
          <Link
            href="/"
            className="inline-block bg-brand hover:bg-brand-dark text-white px-8 py-3 font-bold uppercase text-[13px] tracking-wide transition-colors"
          >
            {t.discover}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map(({ book, addedAt }) => (
            <div key={book.id} className="bg-white border border-[#ddd] flex gap-4 p-4">
              {/* Cover */}
              <Link href={`/book/${book.slug}`} className="flex-shrink-0">
                {book.coverUrl && !false ? (
                  <Image
                    src={book.coverUrl}
                    alt={book.title}
                    width={72}
                    height={108}
                    sizes="72px" className="w-[72px] h-[108px] object-contain"
                  />
                ) : (
                  <div className="w-[72px] h-[108px] bg-gradient-to-br from-[#e0e0e0] to-[#f0f0f0] flex items-center justify-center p-2">
                    <span className="text-[10px] text-[#aaa] text-center leading-snug">{book.title}</span>
                  </div>
                )}
              </Link>

              {/* Info */}
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex gap-1 mb-1 flex-wrap">
                  {book.isBestseller && (
                    <span className="text-[9px] font-bold bg-brand text-white px-1.5 py-0.5 uppercase tracking-wide">{t.bestseller}</span>
                  )}
                  {book.isNewRelease && (
                    <span className="text-[9px] font-bold bg-[#1a1a1a] text-white px-1.5 py-0.5 uppercase tracking-wide">{t.newBadge}</span>
                  )}
                </div>

                <Link href={`/book/${book.slug}`} className="text-[14px] font-bold text-[#1a1a1a] hover:text-brand line-clamp-2 leading-snug mb-1">
                  {book.title}
                </Link>
                <p className="text-[12px] text-[#666] mb-2 line-clamp-1">{book.author}</p>

                <div className="flex items-baseline gap-2 mb-auto">
                  <span className="text-[16px] font-black">
                    {Number(book.priceEgp).toLocaleString()} EGP
                  </span>
                  {book.compareAtEgp && Number(book.compareAtEgp) > Number(book.priceEgp) && (
                    <span className="text-[12px] text-[#aaa] line-through">
                      {Number(book.compareAtEgp).toLocaleString()} EGP
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-[#aaa] mt-1 mb-3">
                  {t.addedOn} {new Date(addedAt).toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" })}
                </p>

                <div className="flex items-center gap-2">
                  {book.stock > 0 ? (
                    <Link
                      href={`/book/${book.slug}`}
                      className="flex-1 text-center py-2 bg-brand hover:bg-brand-dark text-white text-[12px] font-bold uppercase tracking-wide transition-colors"
                    >
                      {t.addToBasket}
                    </Link>
                  ) : (
                    <span className="flex-1 text-center py-2 bg-[#e0e0e0] text-[#aaa] text-[12px] font-bold uppercase tracking-wide cursor-not-allowed">
                      {t.outOfStock}
                    </span>
                  )}
                  <form action={removeFromWishlist}>
                    <input type="hidden" name="bookId" value={book.id} />
                    <button
                      type="submit"
                      className="p-2 text-[#aaa] hover:text-brand transition-colors"
                      aria-label={"إزالة من المفضلة"}
                      title={"إزالة"}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                      </svg>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <p className="text-center text-[13px] text-[#aaa] mt-6">
          {t.savedNote}
        </p>
      )}
    </div>
  );
}
