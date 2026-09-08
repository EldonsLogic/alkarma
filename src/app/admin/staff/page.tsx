import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, requireSuperAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const metadata = { title: "Staff — Admin" };

const ROLES = [
  { key: "SUPER_ADMIN", label: "Super Admin", desc: "Full access to everything" },
  { key: "EDITOR", label: "Editor", desc: "Manage products, content, blog" },
  { key: "FULFILLMENT", label: "Fulfilment", desc: "View & update orders only" },
  { key: "VIEWER", label: "Viewer", desc: "Read-only access" },
];

async function updateStaffRole(formData: FormData) {
  "use server";
  if (!(await requireSuperAdmin())) return;
  const userId = formData.get("userId") as string;
  const role = formData.get("role") as string;
  await prisma.user.update({ where: { id: userId }, data: { staffRole: role || null } });
  const session = await auth();
  await audit(session?.user?.email, "staff.role_changed", "User", userId, { role });
  revalidatePath("/admin/staff");
}

async function promoteToAdmin(formData: FormData) {
  "use server";
  if (!(await requireSuperAdmin())) return;
  const userId = formData.get("userId") as string;
  await prisma.user.update({ where: { id: userId }, data: { role: "ADMIN", staffRole: "EDITOR" } });
  const session = await auth();
  await audit(session?.user?.email, "staff.promoted", "User", userId);
  revalidatePath("/admin/staff");
}

async function revokeAdmin(formData: FormData) {
  "use server";
  if (!(await requireSuperAdmin())) return;
  const userId = formData.get("userId") as string;
  await prisma.user.update({ where: { id: userId }, data: { role: "CUSTOMER", staffRole: null } });
  const session = await auth();
  await audit(session?.user?.email, "staff.revoked", "User", userId);
  revalidatePath("/admin/staff");
}

export default async function StaffPage({ searchParams }: { searchParams: { q?: string } }) {
  // Only super admins may view/manage staff
  if (!(await requireSuperAdmin())) redirect("/admin");
  const q = searchParams.q?.trim();

  const staffUsers = await prisma.user.findMany({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true, firstName: true, lastName: true, email: true, staffRole: true, createdAt: true },
  });

  const searchedCustomers = q ? await prisma.user.findMany({
    where: {
      role: "CUSTOMER",
      OR: [{ email: { contains: q } }, { firstName: { contains: q } }, { lastName: { contains: q } }],
    },
    take: 10,
    select: { id: true, firstName: true, lastName: true, email: true, createdAt: true },
  }) : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[22px] font-black text-[#1e293b]">Staff Accounts</h1>
        <p className="text-[13px] text-[#64748b] mt-1">Manage admin users and their access levels.</p>
      </div>

      {/* Role legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {ROLES.map((r) => (
          <div key={r.key} className="bg-white border border-[#e2e8f0] rounded-sm p-3">
            <p className="text-[12px] font-black text-[#1e293b]">{r.label}</p>
            <p className="text-[11px] text-[#94a3b8] mt-0.5">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Current staff */}
      <div className="bg-white border border-[#e2e8f0] rounded-sm overflow-hidden mb-6">
        <div className="px-4 py-3 bg-[#f8fafc] border-b border-[#e2e8f0]">
          <h2 className="text-[13px] font-black text-[#1e293b]">Active Staff ({staffUsers.length})</h2>
        </div>
        <table className="w-full text-[13px]">
          <thead className="border-b border-[#f1f5f9]">
            <tr>
              {["Name", "Email", "Role", "Since", ""].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-bold uppercase text-[#94a3b8]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1f5f9]">
            {staffUsers.map((u) => (
              <tr key={u.id} className="hover:bg-[#f8fafc]">
                <td className="px-4 py-3 font-bold text-[#1e293b]">{u.firstName} {u.lastName}</td>
                <td className="px-4 py-3 text-[#64748b]">{u.email}</td>
                <td className="px-4 py-3">
                  <form action={updateStaffRole} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={u.id} />
                    <select name="role" defaultValue={u.staffRole ?? "EDITOR"}
                      className="px-2 py-1 border border-[#e2e8f0] text-[12px] rounded-sm bg-white outline-none focus:border-[#3b82f6]">
                      {ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                    </select>
                    <button type="submit" className="text-[11px] text-[#3b82f6] font-bold hover:underline">Set</button>
                  </form>
                </td>
                <td className="px-4 py-3 text-[#94a3b8]">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <form action={revokeAdmin} className="inline">
                    <input type="hidden" name="userId" value={u.id} />
                    <button type="submit" className="text-[12px] text-red-500 font-bold hover:underline">Revoke Access</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Grant access to existing customer */}
      <div className="bg-white border border-[#e2e8f0] rounded-sm p-5">
        <h2 className="text-[14px] font-black text-[#1e293b] mb-3">Grant Admin Access to Existing User</h2>
        <form className="flex gap-3 mb-4">
          <input name="q" defaultValue={q} placeholder="Search by name or email…"
            className="flex-1 px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
          <button type="submit" className="px-4 py-2 bg-[#1e293b] text-white text-[13px] font-bold rounded-sm">Search</button>
        </form>

        {searchedCustomers.length > 0 && (
          <ul className="divide-y divide-[#f1f5f9]">
            {searchedCustomers.map((u) => (
              <li key={u.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-[#1e293b] text-[13px]">{u.firstName} {u.lastName}</p>
                  <p className="text-[12px] text-[#64748b]">{u.email}</p>
                </div>
                <form action={promoteToAdmin}>
                  <input type="hidden" name="userId" value={u.id} />
                  <button type="submit" className="px-3 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[12px] font-bold rounded-sm">
                    Grant Access
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        {q && searchedCustomers.length === 0 && (
          <p className="text-[13px] text-[#94a3b8]">No customers found for &ldquo;{q}&rdquo;</p>
        )}
      </div>
    </div>
  );
}
