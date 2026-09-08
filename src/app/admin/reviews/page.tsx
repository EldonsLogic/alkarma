import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import Image from "next/image";
import { DeleteReviewButton } from "./DeleteReviewButton";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reviews — Admin" };

async function approveReview(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  if (!id) return;
  const r = await prisma.review.update({ where: { id }, data: { isApproved: true }, include: { book: { select: { title: true } } } });
  const session = await auth();
  await audit(session?.user?.email, "review.approved", "Review", id, { book: r.book.title, rating: r.rating });
  revalidatePath("/admin/reviews");
}

async function unapproveReview(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  if (!id) return;
  const r = await prisma.review.update({ where: { id }, data: { isApproved: false }, include: { book: { select: { title: true } } } });
  const session = await auth();
  await audit(session?.user?.email, "review.unapproved", "Review", id, { book: r.book.title });
  revalidatePath("/admin/reviews");
}

async function deleteReview(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  if (!id) return;
  const existing = await prisma.review.findUnique({ where: { id }, include: { book: { select: { title: true } } } });
  await prisma.review.delete({ where: { id } });
  const session = await auth();
  await audit(session?.user?.email, "review.deleted", "Review", id, { book: existing?.book.title ?? "" });
  revalidatePath("/admin/reviews");
}

interface Props {
  searchParams: { status?: string; page?: string };
}

export default async function AdminReviewsPage({ searchParams }: Props) {
  const status = searchParams.status ?? "pending"; // pending | approved | all
  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const limit = 30;
  const skip = (page - 1) * limit;

  const where =
    status === "pending"
      ? { isApproved: false }
      : status === "approved"
      ? { isApproved: true }
      : {};

  const [reviews, total, pendingCount, approvedCount, allCount] =
    await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          book: { select: { id: true, title: true, slug: true, coverUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
      prisma.review.count({ where: { isApproved: false } }),
      prisma.review.count({ where: { isApproved: true } }),
      prisma.review.count(),
    ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-black text-[#1e293b]">Reviews</h1>
          <p className="text-[13px] text-[#64748b] mt-0.5">
            Approve customer reviews before they appear on product pages
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="bg-brand text-white text-[12px] font-black px-3 py-1 rounded-full">
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { value: "pending", label: `Pending (${pendingCount})` },
          { value: "approved", label: `Approved (${approvedCount})` },
          { value: "all", label: `All (${allCount})` },
        ].map((tab) => (
          <a
            key={tab.value}
            href={`/admin/reviews?status=${tab.value}`}
            className={`px-4 py-2 rounded-md text-[13px] font-medium transition-colors ${
              status === tab.value
                ? "bg-[#1e293b] text-white"
                : "bg-white border border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc]"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-12 text-center text-[#94a3b8]">
          <p className="text-[15px]">
            {status === "pending"
              ? "No pending reviews — you're all caught up!"
              : "No reviews found."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className={`bg-white border rounded-lg p-5 ${
                !r.isApproved
                  ? "border-brand/40 bg-[#FEF9F5]"
                  : "border-[#e2e8f0]"
              }`}
            >
              <div className="flex gap-4">
                {/* Book thumbnail */}
                <div className="flex-shrink-0">
                  {r.book.coverUrl && !r.book.coverUrl.includes("placeholder") ? (
                    <Image
                      src={r.book.coverUrl}
                      alt={r.book.title}
                      width={40}
                      height={60}
                      className="w-10 h-[60px] object-cover rounded-sm shadow-sm"
                    />
                  ) : (
                    <div className="w-10 h-[60px] bg-[#f1f5f9] rounded-sm flex items-center justify-center text-[#94a3b8] text-[10px] text-center px-1">
                      No cover
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/products/${r.book.id}`}
                        className="text-[13px] font-bold text-[#3b82f6] hover:underline truncate block"
                      >
                        {r.book.title}
                      </Link>
                      <p className="text-[12px] text-[#64748b]">
                        by{" "}
                        <span className="font-medium text-[#1e293b]">
                          {r.user.firstName} {r.user.lastName}
                        </span>{" "}
                        ·{" "}
                        <span className="text-[#94a3b8]">{r.user.email}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={`text-[14px] ${i < r.rating ? "text-brand" : "text-[#ddd]"}`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>

                  {r.title && (
                    <p className="text-[13px] font-bold text-[#1e293b] mb-0.5">
                      {r.title}
                    </p>
                  )}
                  <p className="text-[13px] text-[#444] leading-relaxed mb-3">
                    {r.body}
                  </p>

                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] text-[#94a3b8]">
                      Submitted{" "}
                      {new Date(r.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {" · "}
                      <span
                        className={`font-bold ${
                          r.isApproved ? "text-green-600" : "text-brand"
                        }`}
                      >
                        {r.isApproved ? "Approved" : "Pending approval"}
                      </span>
                    </p>

                    <div className="flex gap-2">
                      {!r.isApproved ? (
                        <form action={approveReview}>
                          <input type="hidden" name="id" value={r.id} />
                          <button
                            type="submit"
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[12px] font-bold rounded-sm transition-colors"
                          >
                            ✓ Approve
                          </button>
                        </form>
                      ) : (
                        <form action={unapproveReview}>
                          <input type="hidden" name="id" value={r.id} />
                          <button
                            type="submit"
                            className="px-3 py-1.5 border border-[#e2e8f0] text-[#64748b] text-[12px] font-bold rounded-sm hover:bg-[#f8fafc] transition-colors"
                          >
                            Un-approve
                          </button>
                        </form>
                      )}
                      <DeleteReviewButton id={r.id} action={deleteReview} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-5 flex items-center gap-3 justify-end text-[13px]">
          <span className="text-[#64748b]">
            Page {page} of {totalPages}
          </span>
          {page > 1 && (
            <a
              href={`/admin/reviews?status=${status}&page=${page - 1}`}
              className="px-3 py-1.5 border border-[#e2e8f0] rounded-md hover:bg-[#f8fafc]"
            >
              ← Prev
            </a>
          )}
          {page < totalPages && (
            <a
              href={`/admin/reviews?status=${status}&page=${page + 1}`}
              className="px-3 py-1.5 border border-[#e2e8f0] rounded-md hover:bg-[#f8fafc]"
            >
              Next →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
