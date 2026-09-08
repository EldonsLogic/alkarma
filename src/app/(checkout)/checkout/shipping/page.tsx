"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/stores/cart.store";
import { formatPrice } from "@/lib/currency";
import type { ResolvedRate } from "@/lib/shipping";
import { EG_GOVERNORATES } from "@/lib/governorates";
import { CheckoutProgress, OrderSummary } from "../components";

export default function ShippingPage() {
  const router = useRouter();
  const { items, subtotal, couponCode } = useCartStore();
  const sub = subtotal();

  // Record abandoned cart on mount (user entered checkout but hasn't placed order)
  useEffect(() => {
    if (items.length === 0) return;
    fetch("/api/cart/abandon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items,
        totalEgp: subtotal(),
        step: "shipping",
      }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: sessionData } = useSession();
  const loggedIn = !!sessionData?.user;

  const [address, setAddress] = useState({
    fullName: "", phone: "", line1: "", line2: "", city: "", state: "", governorate: "", postcode: "", country: "EG",
  });
  const [email, setEmail] = useState("");
  const [rates, setRates] = useState<ResolvedRate[]>([]);
  const [selectedRate, setSelectedRate] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Prefill the email from the account when signed in.
  useEffect(() => {
    if (sessionData?.user?.email) setEmail(sessionData.user.email);
  }, [sessionData?.user?.email]);

  const isEgypt = address.country === "EG";
  // For Egypt the rate is driven by the chosen governorate; elsewhere by country.
  const needsGovernorate = isEgypt;
  const govReady = !needsGovernorate || !!address.governorate;

  // Fetch live shipping rates whenever country / governorate / subtotal / currency changes
  useEffect(() => {
    // Don't fetch Egypt rates until a governorate is chosen (rate depends on it)
    if (needsGovernorate && !address.governorate) {
      setRates([]);
      setSelectedRate("");
      return;
    }
    const ctrl = new AbortController();
    const govParam = address.governorate ? `&governorate=${address.governorate}` : "";
    fetch(`/api/shipping/rates?country=${address.country}&subtotal=${sub}${govParam}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data: { rates: ResolvedRate[] }) => {
        setRates(data.rates ?? []);
        setSelectedRate((prev) => (data.rates?.some((r) => r.id === prev) ? prev : data.rates?.[0]?.id ?? ""));
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [address.country, address.governorate, sub, needsGovernorate]);

  function set(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setAddress((a) => ({ ...a, [key]: e.target.value }));
  }

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const rate = rates.find((r) => r.id === selectedRate) ?? rates[0];
    sessionStorage.setItem("alkarma_shipping", JSON.stringify({ address, rate, email: email.trim() }));
    router.push("/checkout/payment");
  }

  return (
    <div className="min-h-screen bg-paper-mid">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-10 py-6 sm:py-10 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 sm:gap-10 items-start">

        {/* Left column */}
        <div>
          <CheckoutProgress step={1} />

          <h2 className="font-display text-[22px] font-bold text-ink mt-8 mb-5 pb-3 border-b-2 border-brand">
            عنوان الشحن
          </h2>

          <form onSubmit={handleContinue} className="space-y-4">
            <div>
              <Field label="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} required type="email" disabled={loggedIn} />
              {!loggedIn && (
                <p className="text-[12px] text-ink-muted mt-1.5">
                  سنرسل تأكيد الطلب إلى هذا البريد. لديك حساب؟{" "}
                  <Link href="/login?redirect=/checkout/shipping" className="text-brand font-bold hover:underline">سجّل الدخول</Link>{" "}
                  لإتمام الشراء بسرعة والاطلاع على سجل طلباتك.
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="الاسم بالكامل" value={address.fullName} onChange={set("fullName")} required />
              <Field label="رقم الهاتف" value={address.phone} onChange={set("phone")} required type="tel" />
            </div>
            <Field label="العنوان" value={address.line1} onChange={set("line1")} required />
            <Field label="تفاصيل إضافية للعنوان (اختياري)" value={address.line2} onChange={set("line2")} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="المدينة / المنطقة" value={address.city} onChange={set("city")} required />
              {isEgypt ? (
                <div>
                  <label className="block price-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted mb-1.5">
                    المحافظة *
                  </label>
                  <select
                    value={address.governorate}
                    onChange={set("governorate")}
                    required
                    className="w-full px-4 py-3 border border-paper-dark bg-paper text-[14px] text-ink outline-none focus:border-brand transition-colors"
                  >
                    <option value="">اختر المحافظة…</option>
                    {EG_GOVERNORATES.map((g) => (
                      <option key={g.code} value={g.code}>{g.ar}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <Field label="المنطقة / الولاية" value={address.state} onChange={set("state")} />
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="الرمز البريدي (اختياري)" value={address.postcode} onChange={set("postcode")} />
              <div>
                <label className="block price-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted mb-1.5">
                  الدولة
                </label>
                <select
                  value={address.country}
                  onChange={set("country")}
                  required
                  className="w-full px-4 py-3 border border-paper-dark bg-paper text-[14px] text-ink outline-none focus:border-brand transition-colors"
                >
                  {/* Egypt only — checkout is available inside Egypt for now */}
                  <option value="EG">مصر</option>
                </select>
              </div>
            </div>

            <h2 className="font-display text-[22px] font-bold text-ink mt-8 mb-5 pb-3 border-b-2 border-brand">
              طريقة الشحن
            </h2>
            {needsGovernorate && !address.governorate ? (
              <p className="text-[13px] text-ink-muted bg-paper border border-paper-dark px-4 py-4">
                اختر المحافظة أعلاه لعرض تكلفة التوصيل.
              </p>
            ) : rates.length === 0 ? (
              <p className="text-[13px] text-ink-muted bg-paper border border-paper-dark px-4 py-4">
                لا تتوفر خيارات شحن لهذه الوجهة حاليًا.
              </p>
            ) : (
            <div className="space-y-3">
              {rates.map((rate) => (
                <label
                  key={rate.id}
                  className={`flex items-center gap-4 px-4 py-4 border cursor-pointer transition-all ${
                    selectedRate === rate.id
                      ? "border-brand bg-brand/5"
                      : "border-paper-dark bg-paper hover:border-brand"
                  }`}
                >
                  <input
                    type="radio"
                    name="rate"
                    value={rate.id}
                    checked={selectedRate === rate.id}
                    onChange={() => setSelectedRate(rate.id)}
                    className="accent-brand w-4 h-4"
                  />
                  <div className="flex-1">
                    <p className="text-[14px] font-bold text-ink">{rate.name}</p>
                    <p className="text-[12px] text-ink-muted">{rate.estimatedDays}</p>
                  </div>
                  <span className={`price-mono text-[14px] font-medium ${rate.isFree ? "text-green-600" : "text-brand"}`}>
                    {rate.isFree ? "مجاني" : formatPrice(rate.price)}
                  </span>
                </label>
              ))}
            </div>
            )}

            <button
              type="submit"
              disabled={saving || !govReady || rates.length === 0 || !selectedRate}
              className="w-full mt-6 py-4 bg-brand hover:bg-brand-dark text-white font-bold uppercase tracking-[0.08em] text-[14px] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "جارٍ الحفظ…" : "المتابعة إلى الدفع ←"}
            </button>
          </form>
        </div>

        {/* Order summary sidebar */}
        <OrderSummary items={items} sub={sub} />
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required, type = "text", disabled }: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block price-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className="w-full px-4 py-3 border border-paper-dark bg-paper text-[14px] text-ink outline-none focus:border-brand transition-colors placeholder:text-ink-muted disabled:opacity-70 disabled:cursor-not-allowed"
      />
    </div>
  );
}
