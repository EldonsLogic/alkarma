"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { BRAND_SHORT_AR } from "@/lib/brand";

function ResetForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  // Validate token on mount (decode and check age)
  useEffect(() => {
    if (!token) { setTokenValid(false); return; }
    try {
      const decoded = Buffer.from(token, "base64url").toString("utf8");
      const [, tsStr] = decoded.split(":");
      const ts = parseInt(tsStr, 10);
      const ageMs = Date.now() - ts;
      // Allow up to 1 hour
      setTokenValid(ageMs < 60 * 60 * 1000);
    } catch {
      setTokenValid(false);
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("كلمة المرور يجب ألا تقل عن ٦ أحرف."); return; }
    if (password !== confirm) { setError("كلمتا المرور غير متطابقتين."); return; }
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "حدث خطأ ما."); return; }
    router.push("/login?reset=1");
  }

  if (tokenValid === null) {
    return <p className="text-center text-[14px] text-[#888] py-8">Verifying link…</p>;
  }

  if (!tokenValid) {
    return (
      <div className="text-center py-6">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </div>
        <h2 className="text-[18px] font-black mb-2">انتهت صلاحية الرابط</h2>
        <p className="text-[14px] text-[#555] mb-5">
          انتهت صلاحية رابط إعادة التعيين أو أنه غير صالح. برجاء طلب رابط جديد.
        </p>
        <Link href="/forgot-password"
          className="inline-block px-6 py-3 bg-brand hover:bg-brand-dark text-white font-bold uppercase tracking-wide text-[14px] transition-colors">
          طلب رابط جديد
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="bg-red-50 text-red-600 text-[13px] px-4 py-3 border border-red-200">{error}</p>
      )}
      <div>
        <label className="block text-[12px] font-bold uppercase tracking-wide text-[#555] mb-1.5">
          كلمة المرور الجديدة
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          placeholder="٦ أحرف على الأقل"
          className="w-full px-4 py-3 border border-[#ddd] text-[14px] outline-none focus:border-brand transition-colors"
        />
      </div>
      <div>
        <label className="block text-[12px] font-bold uppercase tracking-wide text-[#555] mb-1.5">
          تأكيد كلمة المرور
        </label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={6}
          className="w-full px-4 py-3 border border-[#ddd] text-[14px] outline-none focus:border-brand transition-colors"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-[14px] bg-brand hover:bg-brand-dark text-white font-bold uppercase tracking-wide text-[14px] transition-colors disabled:opacity-60 mt-2"
      >
        {loading ? "جارٍ الحفظ…" : "تعيين كلمة المرور"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center px-4 py-16">
      <div className="bg-white w-full max-w-[420px] p-10 shadow-card">
        <div className="text-center mb-8">
          <Link href="/">
            <Image src="/logo.png" alt={BRAND_SHORT_AR} width={120} height={40} className="h-10 w-auto mx-auto mb-6" />
          </Link>
          <h1 className="text-[24px] font-black">تعيين كلمة مرور جديدة</h1>
          <p className="text-[13px] text-[#666] mt-1">اختر كلمة مرور قوية لحسابك</p>
        </div>
        <Suspense fallback={<p className="text-center text-[14px] text-[#888] py-8">Loading…</p>}>
          <ResetForm />
        </Suspense>
        <p className="text-center text-[13px] text-[#666] mt-6">
          <Link href="/login" className="text-brand font-bold hover:underline">← Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}
