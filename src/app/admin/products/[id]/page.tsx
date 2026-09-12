import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { BookImagesManager } from "@/components/admin/BookImagesManager";
import { CategoryPicker } from "@/components/admin/CategoryPicker";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { syncTags, tagsToString } from "@/lib/product-admin";
import { syncBookAuthors } from "@/lib/author-admin";
import { notifyBackInStock } from "@/lib/stock";
import { displayPrice } from "@/lib/currency";

export const metadata = { title: "Edit Book — Admin" };

async function updateProduct(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  if (!id) return;

  // Capture stock before the update to detect a restock (0 → in stock)
  const before = await prisma.book.findUnique({ where: { id }, select: { stock: true } });
  const newStock = parseInt(formData.get("stock") as string, 10) || 0;

  const title = (formData.get("title") as string)?.trim();
  const author = (formData.get("author") as string)?.trim() || "";
  const translator = (formData.get("translator") as string)?.trim() || null;
  const editor = (formData.get("editor") as string)?.trim() || null;
  const publisher = (formData.get("publisher") as string)?.trim() || null;
  const language = (formData.get("language") as string) || "en";
  const priceEgp = parseFloat(formData.get("priceEgp") as string);

  if (!title || isNaN(priceEgp)) return;

  await prisma.book.update({
    where: { id },
    data: {
      title,
      subtitle: (formData.get("subtitle") as string)?.trim() || null,
      synopsis: (formData.get("synopsis") as string)?.trim() || "",
      isbn: (formData.get("isbn") as string)?.trim() || null,
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
      isNewRelease: formData.get("isNewRelease") === "on",
      ageRange: (formData.get("ageRange") as string) || null,
    },
  });

  // Authors (pipe-separated) + translator + editor → linked Author records, clean display
  await syncBookAuthors(id, author, language, translator, editor);

  // Additional photos (added one by one on this page)
  const extraImages = (formData.getAll("extraImages") as string[]).map((s) => s.trim()).filter(Boolean);
  await prisma.bookImage.deleteMany({ where: { bookId: id } });
  if (extraImages.length > 0) {
    await prisma.bookImage.createMany({
      data: extraImages.map((url, i) => ({ bookId: id, url, position: i })),
    });
  }

  // Sync categories: remove all, re-add selected
  const categoryIds = formData.getAll("categoryIds") as string[];
  await prisma.bookCategory.deleteMany({ where: { bookId: id } });
  if (categoryIds.length > 0) {
    await prisma.bookCategory.createMany({
      data: categoryIds.map((categoryId) => ({ bookId: id, categoryId })),
    });
  }

  // Tags (publishers / labels) — publisher & translator are always added as tags
  await syncTags(id, formData.get("tags") as string, { publisher, translator });

  const session = await auth();
  await audit(session?.user?.email, "product.updated", "Book", id, { title, author });

  // Restocked (was 0, now in stock) → email everyone waiting on this book
  if ((before?.stock ?? 0) === 0 && newStock > 0) {
    await notifyBackInStock(id);
  }
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/admin/products");
  redirect(`/admin/products/${id}?saved=1`);
}

async function deleteProduct(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  if (!id) return;
  await prisma.book.update({ where: { id }, data: { isActive: false } });
  const session = await auth();
  await audit(session?.user?.email, "product.deactivated", "Book", id);
  redirect("/admin/products");
}

export default async function AdminProductEditPage({ params, searchParams }: { params: { id: string }; searchParams: { saved?: string } }) {
  const book = await prisma.book.findUnique({
    where: { id: params.id },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      images: { orderBy: { position: "asc" } },
    },
  });

  if (!book) notFound();

  const tagsValue = tagsToString(book.tags);

  const [allCategoriesRaw, authors] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true, kind: "BOOK" }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, parentId: true, sortOrder: true } }),
    prisma.author.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  // Build hierarchical list: parent → children, both sorted by name
  const parents = allCategoriesRaw.filter((c) => !c.parentId).sort((a, b) => a.name.localeCompare(b.name));
  const childrenMap = new Map<string, typeof allCategoriesRaw>();
  allCategoriesRaw.filter((c) => c.parentId).forEach((c) => {
    const arr = childrenMap.get(c.parentId!) ?? [];
    arr.push(c);
    childrenMap.set(c.parentId!, arr);
  });
  const allCategories = parents.flatMap((p) => [p, ...(childrenMap.get(p.id) ?? []).sort((a, b) => a.name.localeCompare(b.name))]);

  const selectedCategoryIds = new Set(book.categories.map((bc) => bc.categoryId));

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/products" className="text-[13px] text-[#64748b] hover:text-[#1e293b]">← Products</Link>
        <span className="text-[#e2e8f0]">/</span>
        <h1 className="text-[22px] font-black text-[#1e293b] truncate max-w-[400px]">{book.title}</h1>
      </div>

      {searchParams.saved === "1" && (
        <div className="mb-5 px-4 py-3 bg-green-50 border border-green-200 rounded-sm text-[13px] text-green-700 font-bold">
          ✓ Product saved successfully.
        </div>
      )}

      <form action={updateProduct}>
        <input type="hidden" name="id" value={book.id} />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

          {/* ── Main column ── */}
          <div className="space-y-5">
            <Section title="Basic Information">
              <div className="space-y-4">
                <Field label="Title *" name="title" required defaultValue={book.title} />
                <Field label="Subtitle" name="subtitle" defaultValue={book.subtitle ?? ""} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">Author(s)</label>
                    <input name="author" list="authors-list" defaultValue={book.author}
                      placeholder="e.g. أحمد خالد توفيق  |  Paulo Coelho"
                      className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
                    <datalist id="authors-list">
                      {authors.map((a) => <option key={a.id} value={a.name} />)}
                    </datalist>
                    <p className="text-[11px] text-[#94a3b8] mt-1.5">Separate multiple authors with a pipe <code>|</code>.</p>
                  </div>
                  <Field label="Translator" name="translator" defaultValue={book.translator ?? ""} placeholder="Optional" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Editor" name="editor" defaultValue={book.editor ?? ""} placeholder="Optional — تحرير" />
                  <Field label="Publisher" name="publisher" defaultValue={book.publisher ?? ""} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">Language</label>
                    <select name="language" defaultValue={book.language}
                      className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm bg-white outline-none focus:border-[#3b82f6]">
                      <option value="en">English</option>
                      <option value="ar">Arabic</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="es">Spanish</option>
                    </select>
                  </div>
                  <Field label="Publish Date" name="publishDate" type="date"
                    defaultValue={book.publishDate ? book.publishDate.toISOString().split("T")[0] : ""} />
                  <Field label="Page Count" name="pageCount" type="number"
                    defaultValue={book.pageCount?.toString() ?? ""} />
                  <Field label="Dimensions (المقاس)" name="dimensions" defaultValue={book.dimensions ?? ""} placeholder="e.g. 14.5سم طول × 21.5سم عرض" />
                  <Field label="Cover Type (نوع الغلاف)" name="coverType" defaultValue={book.coverType ?? ""} placeholder="e.g. عادي" />
                </div>
                <Field label="ISBN" name="isbn" defaultValue={book.isbn ?? ""} />
              </div>
            </Section>

            <Section title="Description">
              <textarea name="synopsis" rows={6} defaultValue={book.synopsis}
                className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6] resize-y" />
            </Section>

            <Section title="Pricing">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Price (EGP) *" name="priceEgp" type="number" step="0.01" required defaultValue={displayPrice(book.priceEgp)} />
                <Field label="Discounted Price (EGP)" name="compareAtEgp" type="number" step="0.01" placeholder="optional — sale price" defaultValue={displayPrice(book.compareAtEgp)} />
              </div>
              <p className="text-[11px] text-[#94a3b8] mt-2 leading-relaxed">
                <strong>Price</strong> is the regular price. Set a lower <strong>Discounted Price</strong> to put the book on sale — the storefront shows it with the regular price struck-through.
              </p>
            </Section>

            <Section title="Inventory">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Stock Quantity" name="stock" type="number" defaultValue={book.stock.toString()} />
                <Field label="Low Stock Alert At" name="lowStockAt" type="number" defaultValue={(book.lowStockAt ?? 5).toString()} />
              </div>
            </Section>

            <Section title="Cover Image">
              <ImageUpload
                name="coverUrl"
                label="Book Cover"
                bookId={book.id}
                defaultValue={book.coverUrl}
                shape="cover"
                dimensions="400 × 600 px"
                dimensionsNote="(2 : 3 ratio — portrait)"
              />
            </Section>

            <Section title="Additional Photos">
              <BookImagesManager defaultUrls={book.images.map((img) => img.url)} />
            </Section>
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-5">
            <Section title="Status">
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">Visibility</label>
                <select name="isActive" defaultValue={book.isActive ? "true" : "false"}
                  className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm bg-white outline-none focus:border-[#3b82f6] mb-3">
                  <option value="true">Active (visible in store)</option>
                  <option value="false">Draft (hidden)</option>
                </select>
                <div className="space-y-2.5">
                  {[
                    { name: "isNewRelease", label: "New Release", checked: book.isNewRelease },
                    { name: "isFeatured", label: "Featured on Homepage", checked: book.isFeatured },
                  ].map((opt) => (
                    <label key={opt.name} className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" name={opt.name} defaultChecked={opt.checked}
                        className="w-4 h-4 accent-[#3b82f6]" />
                      <span className="text-[13px] text-[#334155]">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="Age Range">
              <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">Interest Age</label>
              <select name="ageRange" defaultValue={book.ageRange ?? ""}
                className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm bg-white outline-none focus:border-[#3b82f6]">
                <option value="">— Not set (all ages) —</option>
                <option value="preschool">Pre-school</option>
                <option value="5-8">Ages 5–8</option>
                <option value="9-12">Ages 9–12</option>
                <option value="teen">Teen / Young Adult</option>
              </select>
              <p className="text-[11px] text-[#94a3b8] mt-1.5">Used by the Interest Age filter in the storefront.</p>
            </Section>

            <Section title="Categories">
              <CategoryPicker categories={allCategories} selectedIds={Array.from(selectedCategoryIds)} />
              <p className="text-[11px] text-[#94a3b8] mt-2">Ticking a subcategory automatically ticks its parent.</p>
            </Section>

            <Section title="Tags">
              <Field label="Extra tags (publisher & translator are added automatically)" name="tags" defaultValue={tagsValue} />
              <p className="text-[11px] text-[#94a3b8] mt-1.5">Comma-separated. Use for publishers and any labels.</p>
            </Section>

            {/* Book stats */}
            <Section title="Stats">
              <dl className="text-[13px] space-y-2">
                {[
                  ["Slug", book.slug],
                  ["Sales Count", book.salesCount.toString()],
                  ["Created", new Date(book.createdAt).toLocaleDateString("en-EG", { day: "numeric", month: "short", year: "numeric" })],
                  ["Updated", new Date(book.updatedAt).toLocaleDateString("en-EG", { day: "numeric", month: "short", year: "numeric" })],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <dt className="text-[#64748b] font-bold">{k}</dt>
                    <dd className="text-[#1e293b] font-mono text-[12px] truncate max-w-[160px]">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3 pt-3 border-t border-[#f1f5f9]">
                <Link href={`/book/${book.slug}`} target="_blank"
                  className="text-[12px] text-[#3b82f6] hover:underline">
                  View on storefront ↗
                </Link>
              </div>
            </Section>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button type="submit"
                className="w-full py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-[14px] rounded-sm transition-colors">
                Save Changes
              </button>
              <Link href="/admin/products"
                className="w-full py-3 border border-[#e2e8f0] text-[#64748b] font-bold text-[14px] rounded-sm text-center hover:border-[#3b82f6] hover:text-[#3b82f6] transition-colors">
                Back to List
              </Link>
            </div>

            {/* Danger zone — button submits the surrounding form to a different
                server action via formAction (a nested <form> is invalid HTML and
                was silently submitting the edit form instead of deactivating). */}
            <div className="bg-red-50 border border-red-200 rounded-sm p-4">
              <p className="text-[12px] font-black text-red-600 uppercase tracking-wide mb-2">Danger Zone</p>
              <button type="submit" formAction={deleteProduct}
                className="w-full py-2 border border-red-300 text-red-500 text-[12px] font-bold rounded-sm hover:bg-red-100 transition-colors">
                Deactivate Product
              </button>
              <p className="text-[11px] text-red-400 mt-1.5 text-center">This hides the product from the store.</p>
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
      <input type={type} name={name} required={required} placeholder={placeholder}
        defaultValue={defaultValue} step={step} dir={dir}
        className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
    </div>
  );
}
