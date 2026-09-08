"use client";

import { BRAND_SHORT_AR } from "@/lib/brand";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Turnstile } from "@/components/Turnstile";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", country: "EG" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  function set(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, turnstileToken: captchaToken }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "تعذّر إنشاء الحساب"); setLoading(false); return; }
    // Auto sign in
    await signIn("credentials", { email: form.email, password: form.password, redirect: false });
    const session = await getSession();
    router.push((session?.user as any)?.role === "ADMIN" ? "/admin" : "/account");
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center px-4 py-16">
      <div className="bg-white w-full max-w-[460px] p-10 shadow-card">
        <div className="text-center mb-8">
          <Link href="/">
            <Image src="/logo.png" alt={BRAND_SHORT_AR} width={120} height={40} className="h-10 w-auto mx-auto mb-6" />
          </Link>
          <h1 className="text-[24px] font-black">إنشاء حساب</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="bg-red-50 text-red-600 text-[13px] px-4 py-3 border border-red-200">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            {[["الاسم الأول", "firstName"], ["اسم العائلة", "lastName"]].map(([label, key]) => (
              <div key={key}>
                <label className="block text-[12px] font-bold uppercase tracking-wide text-[#555] mb-1.5">{label}</label>
                <input type="text" value={form[key as keyof typeof form]} onChange={set(key)} required
                  className="w-full px-4 py-3 border border-[#ddd] text-[14px] outline-none focus:border-brand" />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wide text-[#555] mb-1.5">البريد الإلكتروني</label>
            <input type="email" value={form.email} onChange={set("email")} required
              className="w-full px-4 py-3 border border-[#ddd] text-[14px] outline-none focus:border-brand" />
          </div>

          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wide text-[#555] mb-1.5">كلمة المرور</label>
            <input type="password" value={form.password} onChange={set("password")} required minLength={8}
              placeholder="٨ أحرف على الأقل، وتشمل حرفًا ورقمًا"
              className="w-full px-4 py-3 border border-[#ddd] text-[14px] outline-none focus:border-brand" />
          </div>

          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wide text-[#555] mb-1.5">الدولة</label>
            <select value={form.country} onChange={set("country")}
              className="w-full px-4 py-3 border border-[#ddd] text-[14px] outline-none focus:border-brand bg-white">
              <option value="EG">مصر 🇪🇬</option>
              <option value="US">الولايات المتحدة 🇺🇸</option>
              <option value="GB">المملكة المتحدة 🇬🇧</option>
              <option value="AE">الإمارات 🇦🇪</option>
              <option value="SA">السعودية 🇸🇦</option>
              <option value="OTHER">دولة أخرى</option>
            </select>
          </div>

          <Turnstile onToken={setCaptchaToken} />

          <button type="submit" disabled={loading}
            className="w-full py-[14px] bg-brand hover:bg-brand-dark text-white font-bold uppercase tracking-wide text-[14px] transition-colors disabled:opacity-60 mt-2">
            {loading ? "جارٍ إنشاء الحساب..." : "إنشاء حساب"}
          </button>
        </form>

        <p className="text-center text-[13px] text-[#666] mt-6">
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="text-brand font-bold hover:underline">تسجيل الدخول</Link>
        </p>
      </div>
    </div>
  );
}
