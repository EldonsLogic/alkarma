import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ConfirmForm } from "@/components/admin/ConfirmForm";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const metadata = { title: "Redirects — Admin" };

async function createRedirect(formData: FormData) {
  "use server";
  const from = (formData.get("from") as string)?.trim();
  const to = (formData.get("to") as string)?.trim();
  const code = Number(formData.get("code") || "301");
  if (!from || !to) return;

  const fromPath = from.startsWith("/") ? from : `/${from}`;
  const toPath = to.startsWith("/") || to.startsWith("http") ? to : `/${to}`;

  const r = await prisma.redirect.upsert({
    where: { fromPath },
    update: { toPath, statusCode: code },
    create: { fromPath, toPath, statusCode: code },
  });
  const session = await auth();
  await audit(session?.user?.email, "redirect.saved", "Settings", r.id, { from: fromPath, to: toPath });
  revalidatePath("/admin/redirects");
  redirect("/admin/redirects");
}

async function deleteRedirect(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  await prisma.redirect.delete({ where: { id } });
  const session = await auth();
  await audit(session?.user?.email, "redirect.deleted", "Settings", id);
  revalidatePath("/admin/redirects");
}

export default async function RedirectsPage({ searchParams }: { searchParams: { add?: string; q?: string } }) {
  const q = searchParams.q?.trim();
  const redirects = await prisma.redirect.findMany({
    where: q ? {
      OR: [{ fromPath: { contains: q } }, { toPath: { contains: q } }]
    } : {},
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-black text-[#1e293b]">Redirects ({redirects.length})</h1>
          <p className="text-[13px] text-[#64748b] mt-1">Manage 301/302 URL redirects. When a book slug changes, add the old URL here.</p>
        </div>
        {!searchParams.add && (
          <a href="?add=1" className="px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm transition-colors">
            + Add Redirect
          </a>
        )}
      </div>

      {searchParams.add && (
        <div className="bg-white border border-[#e2e8f0] rounded-sm p-5 mb-6">
          <h2 className="text-[15px] font-black text-[#1e293b] mb-4">New Redirect</h2>
          <form action={createRedirect} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1">From Path *</label>
                <input name="from" required placeholder="/old-book-slug"
                  className="w-full px-3 py-2 border border-[#e2e8f0] font-mono text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
              </div>
              <div>
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1">To Path *</label>
                <input name="to" required placeholder="/new-book-slug or https://..."
                  className="w-full px-3 py-2 border border-[#e2e8f0] font-mono text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
              </div>
              <div>
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1">Type</label>
                <select name="code" className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm bg-white outline-none focus:border-[#3b82f6]">
                  <option value="301">301 — Permanent</option>
                  <option value="302">302 — Temporary</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="px-5 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm">Save Redirect</button>
              <a href="/admin/redirects" className="px-5 py-2.5 border border-[#e2e8f0] text-[#64748b] text-[13px] font-bold rounded-sm hover:border-[#3b82f6]">Cancel</a>
            </div>
          </form>
        </div>
      )}

      <form className="mb-4 flex gap-3">
        <input name="q" defaultValue={q} placeholder="Search paths…"
          className="flex-1 px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
        <button type="submit" className="px-4 py-2 bg-[#1e293b] text-white text-[13px] font-bold rounded-sm">Search</button>
        {q && <a href="/admin/redirects" className="px-4 py-2 text-[13px] text-[#64748b] self-center">Clear</a>}
      </form>

      <div className="bg-white border border-[#e2e8f0] rounded-sm overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
            <tr>
              {["From", "To", "Type", "Hits", "Created", ""].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-bold uppercase text-[#64748b] tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1f5f9]">
            {redirects.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-[#94a3b8]">No redirects yet</td></tr>
            ) : redirects.map((r) => (
              <tr key={r.id} className="hover:bg-[#f8fafc]">
                <td className="px-4 py-3 font-mono text-[#e11d48] text-[12px]">{r.fromPath}</td>
                <td className="px-4 py-3 font-mono text-[#2e7d52] text-[12px] max-w-[300px] truncate">{r.toPath}</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${r.statusCode === 301 ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {r.statusCode}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#64748b]">{r.hits}</td>
                <td className="px-4 py-3 text-[#94a3b8]">{new Date(r.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <ConfirmForm action={deleteRedirect} className="inline" message="Delete this redirect?">
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className="text-[12px] text-red-500 hover:underline font-bold">
                      Delete
                    </button>
                  </ConfirmForm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
