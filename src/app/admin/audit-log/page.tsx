import { prisma } from "@/lib/prisma";

export const metadata = { title: "Audit Log — Admin" };

const ENTITY_COLORS: Record<string, string> = {
  Order: "bg-blue-100 text-blue-700",
  Book: "bg-purple-100 text-purple-700",
  Coupon: "bg-yellow-100 text-yellow-700",
  Category: "bg-teal-100 text-teal-700",
  Author: "bg-indigo-100 text-indigo-700",
  Return: "bg-brand-100 text-brand-700",
  User: "bg-red-100 text-red-600",
  Bundle: "bg-pink-100 text-pink-700",
  Banner: "bg-cyan-100 text-cyan-700",
  Settings: "bg-slate-100 text-slate-600",
  Review: "bg-green-100 text-green-700",
  GiftCard: "bg-amber-100 text-amber-700",
  Shipping: "bg-lime-100 text-lime-700",
};

function entityColor(t: string) {
  return ENTITY_COLORS[t] ?? "bg-gray-100 text-gray-600";
}

// "product.price_updated" → "Price updated" ; "staff.role_changed" → "Role changed"
function humanVerb(action: string): string {
  const verb = action.includes(".") ? action.split(".").slice(1).join(".") : action;
  const s = verb.replace(/_/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Pull a friendly name for the affected record out of the change snapshot.
function entityName(after: string | null): string | null {
  if (!after) return null;
  try {
    const o = JSON.parse(after) as Record<string, unknown>;
    for (const k of ["title", "name", "code", "orderNumber", "email", "reason", "status"]) {
      if (o[k] != null && String(o[k]).trim()) return String(o[k]);
    }
  } catch {}
  return null;
}

// Turn the change snapshot into readable key → value pairs.
function changePairs(after: string | null): { k: string; v: string }[] {
  if (!after) return [];
  try {
    const o = JSON.parse(after) as Record<string, unknown>;
    return Object.entries(o)
      .filter(([, v]) => v != null && String(v).trim() !== "")
      .slice(0, 5)
      .map(([k, v]) => ({
        k: k.replace(/([A-Z])/g, " $1").replace(/_/g, " ").toLowerCase().trim(),
        v: (() => { const s = String(v); return s.length > 40 ? s.slice(0, 40) + "…" : s; })(),
      }));
  } catch {
    return [];
  }
}

export default async function AuditLogPage({ searchParams }: { searchParams: { q?: string; entity?: string; page?: string } }) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const limit = 50;
  const skip = (page - 1) * limit;
  const q = searchParams.q?.trim();

  const where = {
    ...(q ? { OR: [{ userEmail: { contains: q } }, { action: { contains: q } }, { entityId: { contains: q } }] } : {}),
    ...(searchParams.entity ? { entityType: searchParams.entity } : {}),
  };

  const [logs, total, entityTypes] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ select: { entityType: true }, distinct: ["entityType"], orderBy: { entityType: "asc" } }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[22px] font-black text-[#1e293b]">Audit Log</h1>
        <p className="text-[13px] text-[#64748b] mt-1">Who changed what, and when — across the whole admin.</p>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <form className="flex gap-2 flex-1 min-w-[200px]">
          <input name="q" defaultValue={q} placeholder="Search by user, action, or record…"
            className="flex-1 px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
          {searchParams.entity && <input type="hidden" name="entity" value={searchParams.entity} />}
          <button type="submit" className="px-4 py-2 bg-[#1e293b] text-white text-[13px] font-bold rounded-sm">Search</button>
        </form>
        <div className="flex gap-2 flex-wrap">
          <a href="/admin/audit-log" className={`px-3 py-2 text-[12px] font-bold rounded-sm border transition-colors ${!searchParams.entity ? "bg-[#1e293b] text-white border-[#1e293b]" : "border-[#e2e8f0] text-[#64748b] hover:border-[#1e293b]"}`}>All</a>
          {entityTypes.map((e) => (
            <a key={e.entityType} href={`?entity=${e.entityType}`}
              className={`px-3 py-2 text-[12px] font-bold rounded-sm border transition-colors ${searchParams.entity === e.entityType ? "bg-[#1e293b] text-white border-[#1e293b]" : "border-[#e2e8f0] text-[#64748b] hover:border-[#1e293b]"}`}>
              {e.entityType}
            </a>
          ))}
        </div>
      </div>

      <div className="bg-white border border-[#e2e8f0] rounded-sm overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
            <tr>
              {["Who", "Action", "Record", "Details", "When"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-bold uppercase text-[#64748b] tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1f5f9]">
            {logs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-[#94a3b8]">No log entries yet</td></tr>
            ) : logs.map((log) => {
              const name = entityName(log.after);
              const pairs = changePairs(log.after);
              return (
                <tr key={log.id} className="hover:bg-[#f8fafc] align-top">
                  <td className="px-4 py-3 font-semibold text-[#1e293b] whitespace-nowrap">{log.userEmail ?? "system"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-bold text-[#0f172a]">{humanVerb(log.action)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${entityColor(log.entityType)}`}>{log.entityType}</span>
                    {name
                      ? <span className="block text-[12px] text-[#334155] font-medium mt-1 max-w-[180px] truncate" dir="auto">{name}</span>
                      : log.entityId && <span className="block font-mono text-[10px] text-[#94a3b8] mt-1">#{log.entityId.slice(-6)}</span>}
                  </td>
                  <td className="px-4 py-3 max-w-[280px]">
                    {pairs.length ? (
                      <div className="flex flex-wrap gap-1">
                        {pairs.map((p) => (
                          <span key={p.k} className="text-[11px] bg-[#f1f5f9] text-[#475569] px-2 py-0.5 rounded">
                            <span className="text-[#94a3b8]">{p.k}:</span> <span dir="auto">{p.v}</span>
                          </span>
                        ))}
                      </div>
                    ) : <span className="text-[#cbd5e1] text-[12px]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-[#94a3b8] whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("en-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex gap-2 justify-center mt-5">
          {page > 1 && <a href={`?page=${page - 1}${q ? `&q=${q}` : ""}`} className="px-3 py-2 border border-[#e2e8f0] rounded-sm text-[13px] hover:border-[#3b82f6]">‹ Prev</a>}
          <span className="px-3 py-2 text-[13px] text-[#64748b]">Page {page} of {totalPages}</span>
          {page < totalPages && <a href={`?page=${page + 1}${q ? `&q=${q}` : ""}`} className="px-3 py-2 border border-[#e2e8f0] rounded-sm text-[13px] hover:border-[#3b82f6]">Next ›</a>}
        </div>
      )}
    </div>
  );
}
