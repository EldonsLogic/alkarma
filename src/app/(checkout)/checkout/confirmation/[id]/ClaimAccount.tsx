"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

/**
 * Shown on the confirmation page for guest orders: lets the shopper turn their
 * guest checkout into an account so they can track this (and future) orders.
 * Registering links any orders placed with this email to the new account.
 */
export function ClaimAccount({ email }: { email: string; }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const t = {
    title: "أنشئ حسابًا لتتبع طلبك",
    sub: "احفظ عنوانك وتابع حالة طلبك وطلباتك القادمة.",
    first: "الاسم الأول",
    last: "اسم العائلة",
    pass: "كلمة المرور",
    passHint: "٨ أحرف على الأقل، تحتوي على حرف ورقم",
    create: "إنشاء الحساب",
    creating: "جارٍ الإنشاء…",
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not create the account.");
      // Sign in and send them to their orders (the guest order is now linked).
      await signIn("credentials", { email, password, redirect: false });
      router.push("/account/orders");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const input = "w-full px-3 py-2.5 border border-paper-dark bg-paper text-[14px] text-ink outline-none focus:border-brand transition-colors";

  return (
    <div className="bg-white border border-paper-dark p-5 sm:p-6">
      <h2 className="font-display text-[17px] font-bold text-ink mb-1">{t.title}</h2>
      <p className="text-[13px] text-ink-muted mb-4">{t.sub}</p>
      <form onSubmit={submit} className="space-y-3">
        <input type="email" value={email} disabled className="w-full px-3 py-2.5 border border-paper-dark bg-paper-mid text-[14px] text-ink-muted" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder={t.first} className={input} />
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder={t.last} className={input} />
        </div>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder={t.pass} className={input} />
        <p className="text-[11px] text-ink-muted">{t.passHint}</p>
        {error && <p className="text-[12px] text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-brand hover:bg-brand-dark disabled:opacity-60 text-paper font-bold uppercase tracking-wide text-[14px] transition-colors"
        >
          {loading ? t.creating : t.create}
        </button>
      </form>
    </div>
  );
}
