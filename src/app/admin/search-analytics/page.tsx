import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Search Analytics — Admin" };

interface Props {
  searchParams: { period?: string };
}

export default async function SearchAnalyticsPage({ searchParams }: Props) {
  const period = searchParams.period ?? "30";
  const days = parseInt(period, 10) || 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Aggregate top queries
  const raw = await prisma.searchLog.groupBy({
    by: ["query"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
    _avg: { resultsCount: true },
    orderBy: { _count: { query: "desc" } },
    take: 100,
  });

  // Zero-results queries
  const zeroResults = await prisma.searchLog.groupBy({
    by: ["query"],
    where: { createdAt: { gte: since }, resultsCount: 0 },
    _count: { _all: true },
    orderBy: { _count: { query: "desc" } },
    take: 20,
  });

  const totalSearches = await prisma.searchLog.count({ where: { createdAt: { gte: since } } });
  const uniqueQueries = raw.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-black text-[#1e293b]">Search Analytics</h1>
        <div className="flex gap-2">
          {["7", "14", "30", "90"].map((d) => (
            <Link
              key={d}
              href={`/admin/search-analytics?period=${d}`}
              className={`px-3 py-1.5 text-[12px] font-bold rounded-sm border transition-colors ${
                period === d ? "bg-[#3b82f6] text-white border-[#3b82f6]" : "border-[#e2e8f0] text-[#64748b] hover:border-[#3b82f6]"
              }`}
            >
              {d}d
            </Link>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-[#e2e8f0] rounded-sm p-5">
          <p className="text-[11px] font-bold uppercase text-[#64748b] mb-2">Total Searches</p>
          <p className="text-[24px] font-black text-[#3b82f6]">{totalSearches.toLocaleString()}</p>
          <p className="text-[12px] text-[#94a3b8]">Last {days} days</p>
        </div>
        <div className="bg-white border border-[#e2e8f0] rounded-sm p-5">
          <p className="text-[11px] font-bold uppercase text-[#64748b] mb-2">Unique Queries</p>
          <p className="text-[24px] font-black text-[#1e293b]">{uniqueQueries.toLocaleString()}</p>
          <p className="text-[12px] text-[#94a3b8]">Distinct search terms</p>
        </div>
        <div className="bg-white border border-[#e2e8f0] rounded-sm p-5">
          <p className="text-[11px] font-bold uppercase text-[#64748b] mb-2">Zero Results</p>
          <p className="text-[24px] font-black text-red-500">{zeroResults.length}</p>
          <p className="text-[12px] text-[#94a3b8]">Queries with no hits</p>
        </div>
        <div className="bg-white border border-[#e2e8f0] rounded-sm p-5">
          <p className="text-[11px] font-bold uppercase text-[#64748b] mb-2">Avg per Day</p>
          <p className="text-[24px] font-black text-[#8b5cf6]">{Math.round(totalSearches / days)}</p>
          <p className="text-[12px] text-[#94a3b8]">Searches / day</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Top queries */}
        <div className="bg-white border border-[#e2e8f0] rounded-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e2e8f0]">
            <h2 className="text-[15px] font-black text-[#1e293b]">Top Search Queries</h2>
            <p className="text-[12px] text-[#94a3b8] mt-0.5">Last {days} days</p>
          </div>
          {raw.length === 0 ? (
            <div className="py-12 text-center text-[#94a3b8] text-[13px]">No search data yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#f8fafc] text-[#64748b] text-[11px] uppercase tracking-wide border-b border-[#e2e8f0]">
                    <th className="text-left px-5 py-3 font-bold">#</th>
                    <th className="text-left px-5 py-3 font-bold">Query</th>
                    <th className="text-left px-5 py-3 font-bold">Searches</th>
                    <th className="text-left px-5 py-3 font-bold">Avg Results</th>
                    <th className="text-left px-5 py-3 font-bold"></th>
                  </tr>
                </thead>
                <tbody>
                  {raw.map((row, i) => (
                    <tr key={row.query} className="border-t border-[#f1f5f9] hover:bg-[#f8fafc]">
                      <td className="px-5 py-3 text-[#94a3b8]">{i + 1}</td>
                      <td className="px-5 py-3 font-bold text-[#1e293b]">{row.query}</td>
                      <td className="px-5 py-3 text-[#1e293b]">{row._count._all}</td>
                      <td className="px-5 py-3 text-[#64748b]">
                        {Math.round(row._avg.resultsCount ?? 0)}
                        {(row._avg.resultsCount ?? 0) === 0 && (
                          <span className="ml-2 text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">0 results</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/search?q=${encodeURIComponent(row.query)}`}
                          target="_blank"
                          className="text-[12px] text-[#3b82f6] hover:underline">
                          Test →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Zero result queries (opportunity list) */}
        <div className="bg-white border border-[#e2e8f0] rounded-sm overflow-hidden h-fit">
          <div className="px-5 py-4 border-b border-[#e2e8f0]">
            <h2 className="text-[15px] font-black text-[#1e293b]">Zero-Result Queries</h2>
            <p className="text-[12px] text-[#94a3b8] mt-0.5">Add these books to fill gaps</p>
          </div>
          {zeroResults.length === 0 ? (
            <div className="py-8 text-center text-[#94a3b8] text-[13px]">No zero-result searches 🎉</div>
          ) : (
            <ul className="divide-y divide-[#f1f5f9]">
              {zeroResults.map((row) => (
                <li key={row.query} className="flex items-center justify-between px-5 py-3">
                  <span className="text-[13px] font-bold text-[#1e293b]">{row.query}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] text-[#94a3b8]">{row._count._all}×</span>
                    <Link href={`/admin/products/new`}
                      className="text-[11px] text-[#3b82f6] hover:underline">Add →</Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
