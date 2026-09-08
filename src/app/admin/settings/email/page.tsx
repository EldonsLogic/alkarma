"use client";

import { useState } from "react";

export default function AdminEmailSettingsPage() {
  const [to, setTo] = useState("");
  const [type, setType] = useState("order");
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!to) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, type }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ ok: true, message: data.message });
      } else {
        setStatus({ ok: false, message: data.error ?? "Unknown error" });
      }
    } catch (e) {
      setStatus({ ok: false, message: String(e) });
    } finally {
      setLoading(false);
    }
  }

  const smtpVars = [
    { key: "SMTP_USER", hint: "info@alkarmabooks.com" },
    { key: "SMTP_PASS", hint: "16-char Google App Password" },
    { key: "SMTP_FROM", hint: "info@alkarmabooks.com" },
  ];

  return (
    <div className="max-w-2xl">
      <h1 className="text-[22px] font-black text-[#1e293b] mb-1">Email Settings</h1>
      <p className="text-[13px] text-[#64748b] mb-8">
        Transactional emails (order confirmations, shipping, password reset) are sent via
        Google Workspace SMTP. Use the test tool below to verify your configuration.
      </p>

      {/* SMTP status */}
      <div className="bg-white border border-[#e2e8f0] rounded-sm p-5 mb-6">
        <h2 className="text-[14px] font-black text-[#1e293b] mb-4">SMTP Configuration</h2>
        <div className="space-y-2">
          {smtpVars.map(({ key, hint }) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-[#f1f5f9]">
              <div>
                <span className="font-mono text-[12px] text-[#1e293b]">{key}</span>
                <span className="text-[11px] text-[#94a3b8] ms-2">{hint}</span>
              </div>
              <span className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wide">
                Set in Vercel
              </span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[#94a3b8] mt-3">
          Set these in{" "}
          <a
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#3b82f6] underline"
          >
            Vercel → Project → Settings → Environment Variables
          </a>{" "}
          then redeploy.
        </p>
      </div>

      {/* Test email */}
      <div className="bg-white border border-[#e2e8f0] rounded-sm p-5 mb-6">
        <h2 className="text-[14px] font-black text-[#1e293b] mb-1">Send Test Email</h2>
        <p className="text-[12px] text-[#64748b] mb-4">
          Sends a real email to verify your SMTP credentials are working.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="your@email.com"
            className="flex-1 px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm bg-white outline-none focus:border-[#3b82f6]"
          >
            <option value="order">Order Confirmation</option>
            <option value="reset">Password Reset</option>
            <option value="welcome">Welcome Email</option>
          </select>
          <button
            onClick={send}
            disabled={loading || !to}
            className="px-5 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white text-[13px] font-bold rounded-sm whitespace-nowrap"
          >
            {loading ? "Sending…" : "Send Test"}
          </button>
        </div>

        {status && (
          <div
            className={`p-3 rounded-sm text-[13px] font-medium ${
              status.ok
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {status.ok ? "✓ " : "✗ "}
            {status.message}
          </div>
        )}
      </div>

      {/* Google OAuth status */}
      <div className="bg-white border border-[#e2e8f0] rounded-sm p-5">
        <h2 className="text-[14px] font-black text-[#1e293b] mb-4">Google OAuth (Sign in with Google)</h2>
        <div className="space-y-2">
          {[
            { key: "GOOGLE_CLIENT_ID", hint: "from Google Cloud Console" },
            { key: "GOOGLE_CLIENT_SECRET", hint: "from Google Cloud Console" },
            { key: "NEXTAUTH_URL", hint: "https://alkarmabooks.com" },
          ].map(({ key, hint }) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-[#f1f5f9]">
              <div>
                <span className="font-mono text-[12px] text-[#1e293b]">{key}</span>
                <span className="text-[11px] text-[#94a3b8] ms-2">{hint}</span>
              </div>
              <span className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wide">
                Set in Vercel
              </span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[#94a3b8] mt-3">
          To test: open{" "}
          <a
            href="https://alkarmabooks.com/login"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#3b82f6] underline"
          >
            alkarmabooks.com/login
          </a>{" "}
          in a private window and click &quot;Continue with Google&quot;.
        </p>
      </div>
    </div>
  );
}
