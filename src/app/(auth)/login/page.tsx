"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { BRAND_SHORT_AR } from "@/lib/brand";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const passwordReset = searchParams.get("reset") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", {
      email, password, redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      // A customer migrated from the previous site has no password yet — send
      // them to set one instead of telling them their password is wrong.
      if (res.code === "imported_account" || /imported_account/i.test(res.error)) {
        setNeedsPasswordSetup(true);
        setError("");
        return;
      }
      const tooMany = res.code === "too_many_attempts" || /too_many/i.test(res.error);
      setError(
        tooMany
          ? "محاولات تسجيل دخول كثيرة. برجاء الانتظار بضع دقائق ثم المحاولة مرة أخرى."
          : "البريد الإلكتروني أو كلمة المرور غير صحيحة"
      );
      return;
    }
    const session = await getSession();
    router.push((session?.user as any)?.role === "ADMIN" ? "/admin" : "/account");
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center px-4 py-16">
      <div className="bg-white w-full max-w-[420px] p-10 shadow-card">
        <div className="text-center mb-8">
          <Link href="/">
            <Image src="/logo.png" alt={BRAND_SHORT_AR} width={120} height={40} className="h-10 w-auto mx-auto mb-6" />
          </Link>
          <h1 className="text-[24px] font-black">تسجيل الدخول</h1>
          <p className="text-[13px] text-[#666] mt-1">أهلًا بعودتك</p>
        </div>

        {needsPasswordSetup && (
          <div className="bg-brand-pale border border-brand text-ink text-[13.5px] leading-[1.9] px-4 py-4 mb-4">
            <p className="font-bold mb-1.5">حسابك موجود بالفعل — لكنه يحتاج كلمة مرور جديدة</p>
            <p className="mb-3">
              نقلنا حسابك وسجل طلباتك من موقعنا السابق. لأسباب أمنية لم نَنقل كلمة
              المرور القديمة، لذا يلزم تعيين كلمة مرور جديدة لمرة واحدة.
            </p>
            <Link
              href={`/forgot-password?email=${encodeURIComponent(email)}`}
              className="inline-block px-5 py-2.5 bg-brand hover:bg-brand-dark text-white font-bold text-[13px] transition-colors"
            >
              تعيين كلمة المرور
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {passwordReset && (
            <p className="bg-green-50 text-green-700 text-[13px] px-4 py-3 border border-green-200">
              ✓ تم تحديث كلمة المرور بنجاح. برجاء تسجيل الدخول بكلمة المرور الجديدة.
            </p>
          )}
          {error && <p className="bg-red-50 text-red-600 text-[13px] px-4 py-3 border border-red-200">{error}</p>}

          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wide text-[#555] mb-1.5">البريد الإلكتروني</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full px-4 py-3 border border-[#ddd] text-[14px] outline-none focus:border-brand transition-colors" />
          </div>

          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wide text-[#555] mb-1.5">كلمة المرور</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full px-4 py-3 border border-[#ddd] text-[14px] outline-none focus:border-brand transition-colors" />
          </div>

          <div className="text-end">
            <Link href="/forgot-password" className="text-[13px] text-brand hover:underline">نسيت كلمة المرور؟</Link>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-[14px] bg-brand hover:bg-brand-dark text-white font-bold uppercase tracking-wide text-[14px] transition-colors disabled:opacity-60">
            {loading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-[12px] text-[#aaa]">
          <div className="flex-1 h-px bg-[#ddd]" />
          أو تابع عبر
          <div className="flex-1 h-px bg-[#ddd]" />
        </div>

        <button onClick={() => signIn("google", { callbackUrl: "/auth/redirect" })}
          className="w-full py-3 border-2 border-[#ddd] hover:border-brand text-[14px] font-bold flex items-center justify-center gap-3 transition-colors">
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.6 29.3 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6-6C34.7 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.7 0 20-7.7 20-21 0-1.3-.1-2.7-.4-4z"/><path fill="#FF3D00" d="M6.3 14.7l7 5.1C15.2 16 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6-6C34.7 5.1 29.6 3 24 3 16.3 3 9.7 7.9 6.3 14.7z"/><path fill="#4CAF50" d="M24 45c5.2 0 10-1.8 13.6-4.8l-6.3-5.2C29.4 36.7 26.8 37 24 37c-5.2 0-9.6-3.3-11.3-8l-7 5.4C9.5 41 16.2 45 24 45z"/><path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.8l6.3 5.2C41.3 35.3 44 30 44 24c0-1.3-.1-2.7-.4-4z"/></svg>
          المتابعة عبر جوجل
        </button>

        <p className="text-center text-[13px] text-[#666] mt-6">
          ليس لديك حساب؟{" "}
          <Link href="/register" className="text-brand font-bold hover:underline">أنشئ حسابًا</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
