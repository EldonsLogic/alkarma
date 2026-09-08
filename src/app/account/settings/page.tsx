import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { hash, compare } from "bcryptjs";

export const metadata = { title: "Account Settings" };

async function updateProfile(formData: FormData) {
  "use server";
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: (formData.get("firstName") as string)?.trim() ?? "",
      lastName: (formData.get("lastName") as string)?.trim() ?? "",
      phone: (formData.get("phone") as string)?.trim() || null,
    },
  });
  revalidatePath("/account/settings");
}

async function changePassword(formData: FormData) {
  "use server";
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;

  const current = formData.get("currentPassword") as string;
  const next = formData.get("newPassword") as string;
  const confirm = formData.get("confirmPassword") as string;

  if (!current || !next || next !== confirm || next.length < 8) return;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user?.passwordHash) return;

  const valid = await compare(current, user.passwordHash);
  if (!valid) return;

  const passwordHash = await hash(next, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export default async function AccountSettingsPage({ searchParams }: { searchParams: { saved?: string } }) {
  const session = await auth();
  const userId = session!.user!.id!;

  const t = {
    settings: "إعدادات الحساب",
    saved: "✓ تم حفظ التغييرات.",
    profileInfo: "معلومات الملف الشخصي",
    firstName: "الاسم الأول *",
    lastName: "اسم العائلة *",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    saveChanges: "حفظ التغييرات",
    changePassword: "تغيير كلمة المرور",
    currentPassword: "كلمة المرور الحالية *",
    newPassword: "كلمة المرور الجديدة *",
    minChars: "٨ أحرف على الأقل",
    confirmPassword: "تأكيد كلمة المرور الجديدة *",
    updatePassword: "تحديث كلمة المرور",
    socialProvider: "لقد سجلت الدخول عبر مزود خارجي. تتم إدارة كلمة المرور من خلاله.",
    memberSince: "عضو منذ",
  };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, email: true, phone: true, passwordHash: true, createdAt: true },
  });
  if (!user) return null;

  const hasPassword = !!user.passwordHash;

  return (
    <div>
      <h1 className="text-[22px] font-black mb-6">{t.settings}</h1>

      {searchParams.saved === "1" && (
        <div className="mb-5 px-4 py-3 bg-green-50 border border-green-200 text-[13px] text-green-700 font-bold">
          {t.saved}
        </div>
      )}

      <div className="space-y-6">

        {/* Profile info */}
        <div className="bg-white border border-[#ddd] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#ddd] bg-[#f9f9f9]">
            <h2 className="text-[14px] font-black uppercase tracking-wide">{t.profileInfo}</h2>
          </div>
          <div className="p-6">
            <form action={async (fd) => { "use server"; await updateProfile(fd); }} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SF label={t.firstName} name="firstName" required defaultValue={user.firstName} />
                <SF label={t.lastName} name="lastName" required defaultValue={user.lastName} />
              </div>
              <SF label={t.email} name="email" type="email" defaultValue={user.email} disabled />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SF label={t.phone} name="phone" type="tel" defaultValue={user.phone ?? ""} placeholder="+20..." />
              </div>
              <div className="pt-2">
                <button type="submit"
                  className="px-6 py-3 bg-brand hover:bg-brand-dark text-white font-bold text-[13px] uppercase tracking-wide transition-colors">
                  {t.saveChanges}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Change password */}
        {hasPassword && (
          <div className="bg-white border border-[#ddd] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#ddd] bg-[#f9f9f9]">
              <h2 className="text-[14px] font-black uppercase tracking-wide">{t.changePassword}</h2>
            </div>
            <div className="p-6">
              <form action={changePassword} className="space-y-4">
                <SF label={t.currentPassword} name="currentPassword" type="password" required />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SF label={t.newPassword} name="newPassword" type="password" required placeholder={t.minChars} />
                  <SF label={t.confirmPassword} name="confirmPassword" type="password" required />
                </div>
                <div className="pt-2">
                  <button type="submit"
                    className="px-6 py-3 bg-[#1a1a1a] hover:bg-brand text-white font-bold text-[13px] uppercase tracking-wide transition-colors">
                    {t.updatePassword}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {!hasPassword && (
          <div className="bg-white border border-[#ddd] p-6">
            <p className="text-[14px] text-[#666]">{t.socialProvider}</p>
          </div>
        )}

        {/* Account info */}
        <div className="bg-[#f9f9f9] border border-[#ddd] p-5 text-[13px] text-[#666]">
          <p>
            {t.memberSince}{" "}
            <strong className="text-[#1a1a1a]">
              {new Date(user.createdAt).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" })}
            </strong>
          </p>
        </div>
      </div>
    </div>
  );
}

function SF({ label, name, type = "text", required, defaultValue, placeholder, disabled }: {
  label: string; name: string; type?: string; required?: boolean;
  defaultValue?: string; placeholder?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-[12px] font-bold uppercase tracking-wide text-[#555] mb-1.5">{label}</label>
      <input type={type} name={name} required={required} defaultValue={defaultValue}
        placeholder={placeholder} disabled={disabled}
        className="w-full px-4 py-3 border border-[#ddd] text-[14px] outline-none focus:border-brand disabled:bg-[#f5f5f5] disabled:text-[#aaa]" />
    </div>
  );
}
