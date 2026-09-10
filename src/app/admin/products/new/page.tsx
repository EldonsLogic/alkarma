import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { CategoryPicker } from "@/components/admin/CategoryPicker";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { uniqueBookSlug, syncTags } from "@/lib/product-admin";
import { syncBookAuthors } from "@/lib/author-admin";

export const metadata = { title: "Add Book — Admin" };

async function createProduct(formData: FormData) {
  "use server";

  const title = (formData.get("title") as string)?.trim();
  const author = (formData.get("author") as string)?.trim() || "";
  const translator = (formData.get("translator") as string)?.trim() || null;
  const editor = (formData.get("editor") as string)?.trim() || null;
  const language = (formData.get("language") as string) || "en";
  const priceEgp = parseFloat(formData.get("priceEgp") as string);
  const isbn = (formData.get("isbn") as string)?.trim() || null;
  const publisher = (formData.get("publisher") as string)?.trim() || null;

  if (!title || isNaN(priceEgp)) {
    return;
  }

  // Arabic-safe, unique slug (falls back to ISBN for non-Latin titles)
  const slug = await uniqueBookSlug(title, isbn ?? "");

  const book = await prisma.book.create({
    data: {
      type: "BOOK",
      slug,
      title,
      subtitle: (formData.get("subtitle") as string)?.trim() || null,
      synopsis: (formData.get("synopsis") as string)?.trim() || "",
      isbn,
      author,
      publisher,
      publishDate: formData.get("publishDate") ? new Date(formData.get("publishDate") as string) : null,
      pageCount: formData.get("pageCount") ? parseInt(formData.get("pageCount") as string, 10) : null,
      dimensions: ((formData.get("dimensions") as string) || "").trim() || null,
      coverType: ((formData.get("coverType") as string) || "").trim() || null,
      language,
      coverUrl: (formData.get("coverUrl") as string)?.trim() || "",
      priceEgp,
      compareAtEgp: formData.get("compareAtEgp") ? parseFloat(formData.get("compareAtEgp") as string) : null,
      stock: parseInt(formData.get("stock") as string, 10) || 0,
      lowStockAt: parseInt(formData.get("lowStockAt") as string, 10) || 5,
      isActive: formData.get("isActive") === "true",
      isFeatured: formData.get("isFeatured") === "on",
      isBestseller: formData.get("isBestseller") === "on",
      isNewRelease: formData.get("isNewRelease") === "on",
    },
  });

  // Authors (pipe-separated) + translator + editor → linked Author records, clean display
  await syncBookAuthors(book.id, author, language, translator, editor);

  // Connect categories
  const categoryIds = formData.getAll("categoryIds") as string[];
  if (categoryIds.length > 0) {
    await prisma.bookCategory.createMany({
      data: categoryIds.map((categoryId) => ({ bookId: book.id, categoryId })),
    });
  }

  // Tags (publishers / labels) — publisher & translator are always added as tags
  await syncTags(book.id, formData.get("tags") as string, { publisher, translator });

  const session = await auth();
  await audit(session?.user?.email, "product.created", "Book", book.id, { title, author });
  redirect(`/admin/products?created=${book.id}`);
}

export default async function AdminProductNewPage() {
  const allCats = await prisma.category.findMany({
    where: { isActive: true, kind: "BOOK" },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, parentId: true },
  });
  // Tree order: each top-level category immediately followed by its children
  const isLatin = (s: string) => /^[A-Za-z]/.test(s.trim());
  const catRoots = allCats.filter((c) => !c.parentId)
    .sort((a, b) => (isLatin(a.name) === isLatin(b.name) ? 0 : isLatin(a.name) ? -1 : 1));
  const categories = catRoots.flatMap((r) => [r, ...allCats.filter((c) => c.parentId === r.id)]);

  const authors = await prisma.author.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/products" className="text-[13px] text-[#64748b] hover:text-[#1e293b]">
          ← Products
        </Link>
        <span className="text-[#e2e8f0]">/</span>
        <h1 className="text-[22px] font-black text-[#1e293b]">Add New Book</h1>
      </div>

      <form action={createProduct}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

          {/* ── Main column ── */}
          <div className="space-y-5">

            {/* Basic info */}
            <Section title="Basic Information">
              <div className="space-y-4">
                <Field label="Title *" name="title" required placeholder="e.g. The Alchemist / الشمندورة" />
                <Field label="Subtitle" name="subtitle" placeholder="Optional subtitle" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">
                      Author(s)
                    </label>
                    <input
                      name="author"
                      list="authors-list"
                      placeholder="e.g. أحمد خالد توفيق  |  Paulo Coelho"
                      className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]"
                    />
                    <datalist id="authors-list">
                      {authors.map((a) => (
                        <option key={a.id} value={a.name} />
                      ))}
                    </datalist>
                    <p className="text-[11px] text-[#94a3b8] mt-1.5">Separate multiple authors with a pipe <code>|</code>.</p>
                  </div>
                  <Field label="Translator" name="translator" placeholder="Optional — e.g. سها السباعي" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Editor" name="editor" placeholder="Optional — تحرير" />
                  <Field label="Publisher" name="publisher" placeholder="Publisher name" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">Language</label>
                    <select name="language" defaultValue="en"
                      className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm bg-white outline-none focus:border-[#3b82f6]">
                      <option value="en">English</option>
                      <option value="ar">Arabic</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="es">Spanish</option>
                    </select>
                  </div>
                  <Field label="Publish Date" name="publishDate" type="date" />
                  <Field label="Page Count" name="pageCount" type="number" placeholder="e.g. 320" />
                  <Field label="Dimensions (المقاس)" name="dimensions" placeholder="e.g. 14.5سم طول × 21.5سم عرض" />
                  <Field label="Cover Type (نوع الغلاف)" name="coverType" placeholder="e.g. عادي" />
                </div>
                <Field label="ISBN" name="isbn" placeholder="e.g. 978-0-06-112008-4" />
              </div>
            </Section>

            {/* Description */}
            <Section title="Description">
              <textarea
                name="synopsis"
                rows={6}
                placeholder="Write the book description (in whichever language the book is)…"
                className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6] resize-y"
              />
            </Section>

            {/* Pricing */}
            <Section title="Pricing">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Price (EGP) *" name="priceEgp" type="number" step="0.01" required placeholder="regular price" />
                <Field label="Discounted Price (EGP)" name="compareAtEgp" type="number" step="0.01" placeholder="optional — sale price" />
              </div>
              <p className="text-[11px] text-[#94a3b8] mt-2 leading-relaxed">
                <strong>Price</strong> is the regular price. Set a <strong>Discounted Price</strong> (lower than Price) to put the book on sale — the storefront shows the discounted price with the regular price struck-through. Leave it blank for no discount.
              </p>
            </Section>

            {/* Inventory */}
            <Section title="Inventory">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Stock Quantity" name="stock" type="number" defaultValue="0" placeholder="0" />
                <Field label="Low Stock Alert At" name="lowStockAt" type="number" defaultValue="5" placeholder="5" />
              </div>
            </Section>

            {/* Cover */}
            <Section title="Cover Image">
              <ImageUpload
                name="coverUrl"
                label="Book Cover"
                shape="cover"
                dimensions="400 × 600 px"
                dimensionsNote="(2 : 3 ratio — portrait)"
              />
            </Section>
          </div>

          {/* ── Sidebar column ── */}
          <div className="space-y-5">

            {/* Publish settings */}
            <Section title="Status">
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">Visibility</label>
                <select name="isActive" defaultValue="true"
                  className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm bg-white outline-none focus:border-[#3b82f6] mb-3">
                  <option value="true">Active (visible in store)</option>
                  <option value="false">Draft (hidden)</option>
                </select>

                <div className="space-y-2.5">
                  {[
                    { name: "isBestseller", label: "Mark as Bestseller" },
                    { name: "isNewRelease", label: "Mark as New Release" },
                    { name: "isFeatured", label: "Feature on Homepage" },
                  ].map((opt) => (
                    <label key={opt.name} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        name={opt.name}
                        className="w-4 h-4 accent-[#3b82f6]"
                      />
                      <span className="text-[13px] text-[#334155]">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </Section>

            {/* Categories */}
            <Section title="Categories">
              <CategoryPicker categories={categories} />
              <p className="text-[11px] text-[#94a3b8] mt-2">Ticking a subcategory automatically ticks its parent.</p>
            </Section>

            {/* Tags */}
            <Section title="Tags">
              <Field label="Extra tags (publisher & translator are added automatically)" name="tags" placeholder="e.g. دار الكرمة, Award-winning" />
              <p className="text-[11px] text-[#94a3b8] mt-1.5">Comma-separated. Use for publishers and any labels.</p>
            </Section>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                type="submit"
                className="w-full py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-[14px] rounded-sm transition-colors"
              >
                Create Book
              </button>
              <Link
                href="/admin/products"
                className="w-full py-3 border border-[#e2e8f0] text-[#64748b] font-bold text-[14px] rounded-sm text-center hover:border-[#3b82f6] hover:text-[#3b82f6] transition-colors"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#e2e8f0] bg-[#f8fafc]">
        <h2 className="text-[13px] font-black text-[#1e293b] uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  defaultValue,
  step,
  dir,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  step?: string;
  dir?: string;
}) {
  return (
    <div>
      <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">{label}</label>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        step={step}
        dir={dir}
        className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]"
      />
    </div>
  );
}
