import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { EG_GOVERNORATES, governorateName } from "@/lib/governorates";

export const metadata = { title: "My Addresses" };

async function saveAddress(formData: FormData) {
  "use server";
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;

  const id = formData.get("id") as string | null;
  const isDefault = formData.get("isDefault") === "on";

  const data = {
    userId,
    label: (formData.get("label") as string)?.trim() || null,
    fullName: (formData.get("fullName") as string)?.trim() ?? "",
    phone: (formData.get("phone") as string)?.trim() ?? "",
    line1: (formData.get("line1") as string)?.trim() ?? "",
    line2: (formData.get("line2") as string)?.trim() || null,
    city: (formData.get("city") as string)?.trim() ?? "",
    governorate: (formData.get("governorate") as string)?.trim() || null,
    state: (formData.get("state") as string)?.trim() || null,
    postcode: (formData.get("postcode") as string)?.trim() || null,
    country: (formData.get("country") as string) || "EG",
    isDefault,
  };

  if (isDefault) {
    // Unset previous default
    await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  }

  if (id) {
    await prisma.address.update({ where: { id, userId }, data });
  } else {
    await prisma.address.create({ data });
  }
  revalidatePath("/account/addresses");
}

async function deleteAddress(formData: FormData) {
  "use server";
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;
  const id = formData.get("id") as string;
  await prisma.address.deleteMany({ where: { id, userId } });
  revalidatePath("/account/addresses");
}

// [code, English name, Arabic name]
const COUNTRIES: [string, string, string][] = [
  ["EG", "Egypt", "مصر"], ["US", "United States", "الولايات المتحدة"],
  ["GB", "United Kingdom", "المملكة المتحدة"], ["AE", "UAE", "الإمارات"],
  ["SA", "Saudi Arabia", "السعودية"], ["FR", "France", "فرنسا"], ["DE", "Germany", "ألمانيا"],
];

export default async function AddressesPage({ searchParams }: { searchParams: { edit?: string; add?: string } }) {
  const session = await auth();
  const userId = session!.user!.id!;

  const t = {
    addresses: "العناوين",
    addAddress: "+ إضافة عنوان",
    editAddress: "تعديل العنوان",
    newAddress: "عنوان جديد",
    label: "التسمية (مثل: المنزل، العمل)",
    labelPlaceholder: "المنزل",
    fullName: "الاسم الكامل *",
    phone: "الهاتف *",
    country: "الدولة",
    line1: "العنوان (السطر الأول) *",
    line2: "العنوان (السطر الثاني)",
    city: "المدينة *",
    governorate: "المحافظة (داخل مصر)",
    selectGovernorate: "اختر المحافظة…",
    state: "المنطقة / الولاية (خارج مصر)",
    postcode: "الرمز البريدي",
    setDefault: "تعيين كعنوان افتراضي",
    saveChanges: "حفظ التغييرات",
    add: "إضافة العنوان",
    cancel: "إلغاء",
    noneTitle: "لا توجد عناوين محفوظة",
    noneHint: "احفظ عنوانًا لتسريع إتمام الطلب.",
    addFirst: "أضف عنوانك الأول",
    default: "افتراضي",
    edit: "تعديل",
    remove: "إزالة",
  };

  const addresses = await prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { id: "asc" }],
  });

  const editing = searchParams.edit ? addresses.find((a) => a.id === searchParams.edit) : null;
  const showForm = searchParams.add === "1" || !!editing;
  const countryName = (code: string) => {
    const c = COUNTRIES.find(([v]) => v === code);
    return c ? (c[2]) : code;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-black">{t.addresses}</h1>
        {!showForm && (
          <a href="?add=1"
            className="px-4 py-2 bg-brand hover:bg-brand-dark text-white text-[13px] font-bold uppercase tracking-wide transition-colors">
            {t.addAddress}
          </a>
        )}
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="bg-white border border-[#ddd] p-6 mb-6">
          <h2 className="text-[16px] font-black mb-5">{editing ? t.editAddress : t.newAddress}</h2>
          <form action={saveAddress} className="space-y-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AF label={t.label} name="label" defaultValue={editing?.label ?? ""} placeholder={t.labelPlaceholder} />
              <AF label={t.fullName} name="fullName" required defaultValue={editing?.fullName ?? ""} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AF label={t.phone} name="phone" type="tel" required defaultValue={editing?.phone ?? ""} />
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wide text-[#555] mb-1.5">{t.country}</label>
                <select name="country" defaultValue={editing?.country ?? "EG"}
                  className="w-full px-4 py-3 border border-[#ddd] text-[14px] bg-white outline-none focus:border-brand">
                  {COUNTRIES.map(([v, en, ar]) => <option key={v} value={v}>{ar}</option>)}
                </select>
              </div>
            </div>
            <AF label={t.line1} name="line1" required defaultValue={editing?.line1 ?? ""} />
            <AF label={t.line2} name="line2" defaultValue={editing?.line2 ?? ""} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <AF label={t.city} name="city" required defaultValue={editing?.city ?? ""} />
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wide text-[#555] mb-1.5">{t.governorate}</label>
                <select
                  name="governorate"
                  defaultValue={editing?.governorate ?? ""}
                  className="w-full px-4 py-3 border border-[#ddd] text-[14px] bg-white outline-none focus:border-brand"
                >
                  <option value="">{t.selectGovernorate}</option>
                  {EG_GOVERNORATES.map((g) => (
                    <option key={g.code} value={g.code}>{g.ar}</option>
                  ))}
                </select>
              </div>
              <AF label={t.state} name="state" defaultValue={editing?.state ?? ""} />
              <AF label={t.postcode} name="postcode" defaultValue={editing?.postcode ?? ""} />
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" name="isDefault" defaultChecked={editing?.isDefault ?? addresses.length === 0}
                className="w-4 h-4 accent-brand" />
              <span className="text-[13px] font-bold text-[#333]">{t.setDefault}</span>
            </label>

            <div className="flex gap-3 pt-2">
              <button type="submit"
                className="px-6 py-3 bg-brand hover:bg-brand-dark text-white font-bold text-[13px] uppercase tracking-wide transition-colors">
                {editing ? t.saveChanges : t.add}
              </button>
              <a href="/account/addresses"
                className="px-6 py-3 border border-[#ddd] text-[#666] font-bold text-[13px] hover:border-[#1a1a1a] transition-colors">
                {t.cancel}
              </a>
            </div>
          </form>
        </div>
      )}

      {/* Address list */}
      {addresses.length === 0 && !showForm ? (
        <div className="bg-white border border-[#ddd] p-12 text-center">
          <p className="text-[18px] font-bold mb-2">{t.noneTitle}</p>
          <p className="text-[14px] text-[#666] mb-6">{t.noneHint}</p>
          <a href="?add=1"
            className="inline-block bg-brand hover:bg-brand-dark text-white px-8 py-3 font-bold uppercase text-[13px] tracking-wide transition-colors">
            {t.addFirst}
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div key={addr.id} className={`bg-white border p-5 relative ${addr.isDefault ? "border-brand" : "border-[#ddd]"}`}>
              {addr.isDefault && (
                <span className="absolute top-3 end-3 text-[10px] font-bold bg-brand text-white px-2 py-0.5 uppercase tracking-wide">
                  {t.default}
                </span>
              )}
              {addr.label && <p className="text-[11px] font-black uppercase tracking-wider text-[#aaa] mb-2">{addr.label}</p>}
              <div className="text-[14px] text-[#333] leading-[1.8]">
                <p className="font-bold text-[#1a1a1a]">{addr.fullName}</p>
                <p>{addr.phone}</p>
                <p>{addr.line1}</p>
                {addr.line2 && <p>{addr.line2}</p>}
                <p>{[addr.city, addr.governorate ? governorateName(addr.governorate) : addr.state, addr.postcode].filter(Boolean).join("، ")}</p>
                <p>{countryName(addr.country)}</p>
              </div>
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[#eee]">
                <a href={`?edit=${addr.id}`} className="text-[12px] font-bold text-brand hover:underline">{t.edit}</a>
                <form action={deleteAddress} className="inline">
                  <input type="hidden" name="id" value={addr.id} />
                  <button type="submit" className="text-[12px] text-[#aaa] hover:text-brand underline">{t.remove}</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AF({ label, name, type = "text", required, defaultValue, placeholder }: {
  label: string; name: string; type?: string; required?: boolean; defaultValue?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[12px] font-bold uppercase tracking-wide text-[#555] mb-1.5">{label}</label>
      <input type={type} name={name} required={required} defaultValue={defaultValue} placeholder={placeholder}
        className="w-full px-4 py-3 border border-[#ddd] text-[14px] outline-none focus:border-brand" />
    </div>
  );
}
