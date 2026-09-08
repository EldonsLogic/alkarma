import { prisma } from "@/lib/prisma";
import { ImportExportBar } from "@/components/admin/ImportExportBar";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { page?: string; q?: string };
}

export default async function SubscribersPage({ searchParams }: Props) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const q = searchParams.q?.trim();
  const limit = 50;
  const skip = (page - 1) * limit;

  const where = q
    ? { email: { contains: q } }
    : {};

  const [subscribers, total, activeCount] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.newsletterSubscriber.count({ where }),
    prisma.newsletterSubscriber.count({ where: { isActive: true } }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-black text-[#1e293b]">Newsletter Subscribers</h1>
          <p className="text-[13px] text-[#64748b] mt-0.5">
            {activeCount.toLocaleString()} active · {total.toLocaleString()} total
          </p>
          <div className="mt-2">
            <ImportExportBar
              exportHref="/api/admin/export/subscribers"
              exportLabel="Export CSV"
            />
          </div>
        </div>
      </div>

      {/* Search */}
      <form method="GET" className="mb-5">
        <div className="flex gap-2 max-w-sm">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search email…"
            className="flex-1 px-3 py-2 border border-[#e2e8f0] rounded-md text-[13px] outline-none focus:border-brand"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-[#1e293b] text-white text-[13px] rounded-md hover:bg-brand transition-colors"
          >
            Search
          </button>
          {q && (
            <a
              href="/admin/subscribers"
              className="px-4 py-2 border border-[#e2e8f0] text-[13px] rounded-md hover:bg-[#f8fafc] transition-colors"
            >
              Clear
            </a>
          )}
        </div>
      </form>

      <div className="bg-white rounded-lg border border-[#e2e8f0] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
              <th className="text-left px-5 py-3 font-semibold text-[#64748b]">Email</th>
              <th className="text-left px-5 py-3 font-semibold text-[#64748b]">Source</th>
              <th className="text-left px-5 py-3 font-semibold text-[#64748b]">Status</th>
              <th className="text-left px-5 py-3 font-semibold text-[#64748b]">Subscribed</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-[#94a3b8]">
                  No subscribers found.
                </td>
              </tr>
            ) : (
              subscribers.map((s) => (
                <tr key={s.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors">
                  <td className="px-5 py-3 font-medium text-[#1e293b]">{s.email}</td>
                  <td className="px-5 py-3 text-[#64748b] capitalize">{s.source}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        s.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-[#f1f5f9] text-[#94a3b8]"
                      }`}
                    >
                      {s.isActive ? "Active" : "Unsubscribed"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[#64748b]">
                    {new Date(s.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-5 flex items-center gap-3 justify-end text-[13px]">
          <span className="text-[#64748b]">
            Page {page} of {totalPages}
          </span>
          {page > 1 && (
            <a
              href={`/admin/subscribers?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className="px-3 py-1.5 border border-[#e2e8f0] rounded-md hover:bg-[#f8fafc] transition-colors"
            >
              ← Prev
            </a>
          )}
          {page < totalPages && (
            <a
              href={`/admin/subscribers?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className="px-3 py-1.5 border border-[#e2e8f0] rounded-md hover:bg-[#f8fafc] transition-colors"
            >
              Next →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
