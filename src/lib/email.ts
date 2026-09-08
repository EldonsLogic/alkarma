import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { BRAND_AR, SITE_DOMAIN, CONTACT_EMAIL, SITE_URL as SITE_URL_FALLBACK } from "@/lib/brand";

/**
 * Email transport via Google Workspace SMTP
 * Requires 2-Step Verification enabled on info@alkarmabooks.com,
 * then an App Password generated from myaccount.google.com → Security → App Passwords.
 * Set SMTP_USER and SMTP_PASS in Vercel env vars.
 */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.SMTP_USER ?? CONTACT_EMAIL,
    pass: process.env.SMTP_PASS, // 16-char App Password from Google
  },
});

const FROM = `${BRAND_AR} <${process.env.SMTP_FROM ?? CONTACT_EMAIL}>`;
const SITE = process.env.AUTH_URL ?? SITE_URL_FALLBACK;

// ── Order confirmation ────────────────────────────────────────────────────
export async function sendOrderConfirmation(
  to: string,
  orderNumber: string,
  items: Array<{ title: string; quantity: number; unitPrice: number }>,
  total: number,
  currency: string
) {
  const deliveryNote = "يتم توصيل الطلب خلال ٥-٦ أيام عمل (لا تتضمن الإجازات الأسبوعية: الجمعة والسبت، والإجازات الرسمية) وتبدأ المدة من اليوم الثاني للطلب.";

  const itemRows = items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;border-bottom:1px solid #dddddd">${i.title}</td>` +
        `<td style="padding:6px 0;border-bottom:1px solid #dddddd;text-align:center">×${i.quantity}</td>` +
        `<td style="padding:6px 0;border-bottom:1px solid #dddddd;text-align:right">${(i.unitPrice * i.quantity).toFixed(2)} ${currency}</td></tr>`
    )
    .join("");

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `تم تأكيد طلبك — ${orderNumber} | دار الكرمة`,
    html: emailWrapper(`
      <div dir="rtl" style="text-align:right">
        <h2 style="margin:0 0 16px;color:#000000">شكرًا لطلبك! 📚</h2>
        <p style="margin:0 0 12px;color:#696969">تم استلام طلبك <strong>${orderNumber}</strong> وجارٍ تجهيزه.</p>
        <p style="margin:0 0 20px;color:#696969">${deliveryNote}</p>
        <table width="100%" style="border-collapse:collapse;margin-bottom:20px">
          <thead><tr>
            <th style="text-align:right;padding:6px 0;border-bottom:2px solid #ff0000;color:#000000">الكتاب</th>
            <th style="text-align:center;padding:6px 0;border-bottom:2px solid #ff0000;color:#000000">الكمية</th>
            <th style="text-align:left;padding:6px 0;border-bottom:2px solid #ff0000;color:#000000">السعر</th>
          </tr></thead>
          <tbody>${itemRows}</tbody>
          <tfoot><tr>
            <td colspan="2" style="padding:10px 0;font-weight:bold;color:#000000">الإجمالي</td>
            <td style="padding:10px 0;font-weight:bold;text-align:left;color:#ff0000">${total.toFixed(2)} ${currency}</td>
          </tr></tfoot>
        </table>
        <p style="margin:0 0 24px;color:#696969">سنرسل إليك بريدًا آخر عند شحن طلبك مع رقم التتبع.</p>
        <a href="${SITE}/account/orders" style="display:inline-block;background:#ff0000;color:#fff;padding:12px 28px;text-decoration:none;font-weight:bold;letter-spacing:0.05em">عرض طلبي</a>
      </div>
    `),
    text: `شكرًا لطلبك!\n\nالطلب: ${orderNumber}\n\n${deliveryNote}\n\n${items.map((i) => `• ${i.title} ×${i.quantity}`).join("\n")}\n\nالإجمالي: ${total.toFixed(2)} ${currency}\n\n— دار الكرمة`,
  });
}

// ── Shipping notification ─────────────────────────────────────────────────
export async function sendShippingNotification(
  to: string,
  orderNumber: string,
  trackingNumber: string,
  carrier: string
) {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `تم شحن طلبك — ${orderNumber} | ${BRAND_AR}`,
    html: emailWrapper(`
      <h2 style="margin:0 0 16px;color:#000000">طلبك في الطريق إليك! 🚀</h2>
      <p style="margin:0 0 8px;color:#696969">تم شحن طلبك رقم <strong>${orderNumber}</strong>.</p>
      <p style="margin:0 0 4px;color:#696969"><strong>شركة الشحن:</strong> ${carrier}</p>
      <p style="margin:0 0 24px;color:#696969"><strong>رقم التتبع:</strong> ${trackingNumber}</p>
      <a href="${SITE}/account/orders" style="display:inline-block;background:#ff0000;color:#fff;padding:12px 28px;text-decoration:none;font-weight:bold">تتبّع طلبي</a>
    `),
    text: `طلبك في الطريق إليك!\n\nتم شحن الطلب رقم ${orderNumber}.\n\nشركة الشحن: ${carrier}\nرقم التتبع: ${trackingNumber}\n\n— ${BRAND_AR}`,
  });
}

// ── Password reset ────────────────────────────────────────────────────────
export async function sendPasswordReset(to: string, resetUrl: string) {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: "إعادة تعيين كلمة مرور حسابك في دار الكرمة",
    html: emailWrapper(`
      <h2 style="margin:0 0 16px;color:#000000">إعادة تعيين كلمة المرور</h2>
      <p style="margin:0 0 20px;color:#696969">وصلنا طلب لإعادة تعيين كلمة مرور حسابك في ${BRAND_AR}. اضغط على الزر بالأسفل — تنتهي صلاحية الرابط خلال ساعة واحدة.</p>
      <a href="${resetUrl}" style="display:inline-block;background:#ff0000;color:#fff;padding:12px 28px;text-decoration:none;font-weight:bold">إعادة تعيين كلمة المرور</a>
      <p style="margin:24px 0 0;color:#94a3b8;font-size:13px">إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان.</p>
    `),
    text: `إعادة تعيين كلمة مرور حسابك في ${BRAND_AR}:\n\n${resetUrl}\n\nتنتهي صلاحية الرابط خلال ساعة واحدة. إذا لم تطلب ذلك، تجاهل هذه الرسالة.\n\n— ${BRAND_AR}`,
  });
}

// ── Welcome email ─────────────────────────────────────────────────────────
export async function sendWelcomeEmail(to: string, firstName: string) {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `أهلًا بك في ${BRAND_AR}، ${firstName}!`,
    html: emailWrapper(`
      <h2 style="margin:0 0 16px;color:#000000">أهلًا بك في ${BRAND_AR}! 📖</h2>
      <p style="margin:0 0 16px;color:#696969">أهلًا ${firstName}، تم إنشاء حسابك بنجاح. تصفّح إصدارات الكرمة وأهم الكتب العربية والمترجمة، مع التوصيل لكل محافظات مصر.</p>
      <a href="${SITE}/bestsellers" style="display:inline-block;background:#ff0000;color:#fff;padding:12px 28px;text-decoration:none;font-weight:bold">تصفّح الأكثر مبيعًا</a>
    `),
    text: `أهلًا بك في ${BRAND_AR}، ${firstName}!\n\nتم إنشاء حسابك بنجاح. تصفّح مكتبتنا على ${SITE}\n\n— ${BRAND_AR}`,
  });
}

// ── Shared HTML wrapper ───────────────────────────────────────────────────
// ── Back in stock (customer) ──────────────────────────────────────────────
export async function sendBackInStock(
  to: string,
  book: { title: string; titleAr?: string | null; slug: string },
) {
  const title = book.titleAr ? book.titleAr : book.title;
  const url = `${SITE}/book/${encodeURIComponent(book.slug)}`;
  const subject = `عاد إلى المخزون: ${title} | دار الكرمة`;
  const body = `<div dir="rtl" style="text-align:right">
        <h2 style="margin:0 0 16px;color:#000000">عاد إلى المخزون! 🎉</h2>
        <p style="margin:0 0 20px;color:#696969"><strong>${title}</strong> أصبح متوفرًا الآن مرة أخرى. سارع بالحصول عليه قبل نفاده!</p>
        <a href="${url}" style="display:inline-block;background:#ff0000;color:#fff;padding:12px 28px;text-decoration:none;font-weight:bold;letter-spacing:0.05em">تسوق الآن</a>
      </div>`;
  await transporter.sendMail({
    from: FROM,
    to,
    subject,
    html: emailWrapper(body),
    text: `عاد إلى المخزون: ${title}\n${url}\n\n— دار الكرمة`,
  });
}

// ── Low stock alert (store manager) ───────────────────────────────────────
export async function sendLowStockAlert(
  to: string,
  book: { title: string; slug: string; stock: number },
) {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `⚠️ المخزون على وشك النفاد: ${book.title} (${book.stock}) | ${BRAND_AR}`,
    html: emailWrapper(`
      <h2 style="margin:0 0 16px;color:#000000">تنبيه: المخزون على وشك النفاد ⚠️</h2>
      <p style="margin:0 0 12px;color:#696969">${book.stock === 0 ? `<strong>${book.title}</strong> — <strong>نفدت الكمية</strong>.` : `تبقّى <strong>${book.stock}</strong> نسخة فقط من <strong>${book.title}</strong>.`}</p>
      <a href="${SITE}/admin/products" style="display:inline-block;background:#ff0000;color:#fff;padding:12px 28px;text-decoration:none;font-weight:bold">إدارة المخزون</a>
    `),
    text: `تنبيه مخزون: ${book.title} — ${book.stock === 0 ? "نفدت الكمية" : `تبقّى ${book.stock}`}.\n${SITE}/admin/products`,
  });
}

// ── Admin notifications ─────────────────────────────────────────────────────
/** Internal admin alerts go to the store inbox plus every admin user. */
async function adminRecipients(): Promise<string[]> {
  const emails = ["info@alkarmabooks.com"];
  try {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { email: true } });
    for (const a of admins) if (a.email) emails.push(a.email);
  } catch { /* fall back to the store inbox */ }
  // De-duplicate case-insensitively while keeping the first-seen form.
  const seen = new Set<string>();
  return emails.filter((e) => {
    const k = e.trim().toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function sendAdminNewReview(r: {
  bookTitle: string;
  bookSlug: string;
  rating: number;
  reviewer: string;
  comment: string;
}) {
  const to = await adminRecipients();
  if (!to.length) return;
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `⭐ تقييم جديد (${r.rating}/5) — ${r.bookTitle}`,
    html: emailWrapper(`
      <h2 style="margin:0 0 12px;color:#000000">تقييم جديد ⭐</h2>
      <p style="margin:0 0 6px;color:#696969"><strong>${r.bookTitle}</strong> · ${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</p>
      <p style="margin:0 0 6px;color:#696969">بواسطة: ${r.reviewer}</p>
      ${r.comment ? `<p style="margin:0 0 16px;color:#696969;font-style:italic">“${r.comment.slice(0, 300)}”</p>` : ""}
      <a href="${SITE}/admin/reviews" style="display:inline-block;background:#ff0000;color:#fff;padding:11px 24px;text-decoration:none;font-weight:bold">مراجعة التقييمات</a>
    `),
    text: `تقييم جديد (${r.rating}/5) على ${r.bookTitle}\nبواسطة: ${r.reviewer}\n${r.comment}\n${SITE}/admin/reviews`,
  });
}

export async function sendAdminNewOrder(o: {
  orderNumber: string;
  orderId: string;
  customerEmail: string;
  items: Array<{ title: string; quantity: number }>;
  total: number;
  paymentMethod: string;
}) {
  const to = await adminRecipients();
  if (!to.length) return;
  const rows = o.items
    .map((i) => `<tr><td style="padding:5px 0;border-bottom:1px solid #dddddd">${i.title}</td><td style="padding:5px 0;border-bottom:1px solid #dddddd;text-align:right">×${i.quantity}</td></tr>`)
    .join("");
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `🛒 طلب جديد ${o.orderNumber} — ${o.total.toFixed(2)} EGP`,
    html: emailWrapper(`
      <h2 style="margin:0 0 12px;color:#000000">وصل طلب جديد 🛒</h2>
      <p style="margin:0 0 6px;color:#696969"><strong>${o.orderNumber}</strong> · ${o.paymentMethod === "COD" ? "الدفع عند الاستلام" : "دفع أونلاين"}</p>
      <p style="margin:0 0 16px;color:#696969">العميل: ${o.customerEmail}</p>
      <table width="100%" style="border-collapse:collapse;margin-bottom:16px">${rows}
        <tr><td style="padding:10px 0;font-weight:bold;color:#000000">الإجمالي</td><td style="padding:10px 0;font-weight:bold;text-align:right;color:#ff0000">${o.total.toFixed(2)} EGP</td></tr>
      </table>
      <a href="${SITE}/admin/orders/${o.orderId}" style="display:inline-block;background:#ff0000;color:#fff;padding:11px 24px;text-decoration:none;font-weight:bold">عرض في لوحة التحكم</a>
    `),
    text: `طلب جديد ${o.orderNumber} (${o.paymentMethod})\nالعميل: ${o.customerEmail}\n${o.items.map((i) => `• ${i.title} ×${i.quantity}`).join("\n")}\nالإجمالي: ${o.total.toFixed(2)} EGP\n${SITE}/admin/orders/${o.orderId}`,
  });
}

export async function sendAdminOrderStatus(o: {
  orderNumber: string;
  orderId: string;
  status: string;
  customerName?: string;
}) {
  const to = await adminRecipients();
  if (!to.length) return;
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `الطلب ${o.orderNumber} ← ${o.status}`,
    html: emailWrapper(`
      <h2 style="margin:0 0 12px;color:#000000">تحديث حالة الطلب</h2>
      <p style="margin:0 0 16px;color:#696969"><strong>${o.orderNumber}</strong>${o.customerName ? ` · ${o.customerName}` : ""} أصبحت حالته <strong style="color:#ff0000">${o.status}</strong>.</p>
      <a href="${SITE}/admin/orders/${o.orderId}" style="display:inline-block;background:#ff0000;color:#fff;padding:11px 24px;text-decoration:none;font-weight:bold">عرض في لوحة التحكم</a>
    `),
    text: `الطلب ${o.orderNumber} أصبحت حالته ${o.status}.\n${SITE}/admin/orders/${o.orderId}`,
  });
}

export async function sendAdminReturnRequest(r: {
  orderNumber: string;
  orderId: string;
  customerEmail: string;
  reason: string;
  items: Array<{ title: string; qty: number }>;
}) {
  const to = await adminRecipients();
  if (!to.length) return;
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `↩️ طلب إرجاع — ${r.orderNumber}`,
    html: emailWrapper(`
      <h2 style="margin:0 0 12px;color:#000000">طلب إرجاع ↩️</h2>
      <p style="margin:0 0 6px;color:#696969"><strong>${r.orderNumber}</strong> · ${r.customerEmail}</p>
      <p style="margin:0 0 12px;color:#696969">السبب: ${r.reason}</p>
      <p style="margin:0 0 16px;color:#696969">المنتجات: ${r.items.map((i) => `${i.title} ×${i.qty}`).join("، ")}</p>
      <a href="${SITE}/admin/returns" style="display:inline-block;background:#ff0000;color:#fff;padding:11px 24px;text-decoration:none;font-weight:bold">مراجعة طلبات الإرجاع</a>
    `),
    text: `طلب إرجاع للطلب ${r.orderNumber}\nالعميل: ${r.customerEmail}\nالسبب: ${r.reason}\nالمنتجات: ${r.items.map((i) => `${i.title} ×${i.qty}`).join("، ")}\n${SITE}/admin/returns`,
  });
}

function emailWrapper(body: string): string {
  // Arabic-only store: the email document itself is lang="ar" dir="rtl", not
  // just the site — otherwise clients render the shell LTR and Arabic body
  // copy sits against the wrong edge.
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><body style="margin:0;padding:0;background:#ffffff;font-family:system-ui,sans-serif;direction:rtl;text-align:right">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #dddddd;max-width:600px;width:100%">
  <tr><td style="background:#000000;padding:20px 32px">
    <span style="color:#ff0000;font-size:20px;font-weight:900;letter-spacing:0.05em">${BRAND_AR}</span>
  </td></tr>
  <tr><td style="padding:32px">${body}</td></tr>
  <tr><td style="padding:20px 32px;border-top:1px solid #dddddd;color:#94a3b8;font-size:12px">
    &copy; ${new Date().getFullYear()} ${BRAND_AR} &nbsp;·&nbsp;
    <a href="${SITE}" style="color:#ff0000;text-decoration:none">${SITE_DOMAIN}</a> &nbsp;·&nbsp;
    <a href="mailto:${CONTACT_EMAIL}" style="color:#ff0000;text-decoration:none">${CONTACT_EMAIL}</a>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}
