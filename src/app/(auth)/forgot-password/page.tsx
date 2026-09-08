"use client";

import { BRAND_SHORT_AR } from "@/lib/brand";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Turnstile } from "@/components/Turnstile";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstileToken: captchaToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "حدث خطأ ما. برجاء المحاولة مرة أخرى.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("خطأ في الاتصال. برجاء المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center px-4 py-16">
      <div className="bg-white w-full max-w-[420px] p-10 shadow-card">
        <div className="text-center mb-8">
          <Link href="/">
            <Image
              src="/logo.png"
              alt={BRAND_SHORT_AR}
              width={120}
              height={40}
              className="h-10 w-auto mx-auto mb-6"
            />
          </Link>
          <h1 className="text-[24px] font-black">إعادة تعيين كلمة المرور</h1>
          <p className="text-[13px] text-[#666] mt-1">
            أدخل بريدك الإلكتروني وسنرسل إليك رابط إعادة التعيين
          </p>
        </div>

        {submitted ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-[18px] font-black mb-2">تفقّد بريدك الإلكتروني</h2>
            <p className="text-[14px] text-[#555] mb-6 leading-relaxed">
              إذا كان هناك حساب مرتبط بـ <strong>{email}</strong>، فقد أرسلنا إليه رابط إعادة تعيين كلمة المرور. تفقّد صندوق الوارد ومجلد الرسائل غير المرغوب فيها.
            </p>
            <Link
              href="/login"
              className="block w-full py-[13px] bg-brand hover:bg-brand-dark text-white font-bold uppercase tracking-wide text-[14px] text-center transition-colors"
            >
              العودة إلى تسجيل الدخول
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="bg-red-50 text-red-600 text-[13px] px-4 py-3 border border-red-200">
                {error}
              </p>
            )}

            <div>
              <label className="block text-[12px] font-bold uppercase tracking-wide text-[#555] mb-1.5">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@example.com"
                className="w-full px-4 py-3 border border-[#ddd] text-[14px] outline-none focus:border-brand transition-colors"
              />
            </div>

            <Turnstile onToken={setCaptchaToken} />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-[14px] bg-brand hover:bg-brand-dark text-white font-bold uppercase tracking-wide text-[14px] transition-colors disabled:opacity-60 mt-2"
            >
              {loading ? "جارٍ الإرسال..." : "إرسال رابط إعادة التعيين"}
            </button>
          </form>
        )}

        <p className="text-center text-[13px] text-[#666] mt-6">
          Remember your password?{" "}
          <Link href="/login" className="text-brand font-bold hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
