import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const metadata = { title: "Banners — Admin" };

async function saveBanner(formData: FormData) {
  "use server";
  const id = formData.get("id") as string | null;
  const title = (formData.get("title") as string)?.trim();
  const imageUrl = (formData.get("imageUrl") as string)?.trim() || null;
  const imageUrlAr = (formData.get("imageUrlAr") as string)?.trim() || null;
  // Need a name and at least one desktop image (English OR Arabic).
  if (!title || (!imageUrl && !imageUrlAr)) return;

  const data = {
    title,
    imageUrl,
    imageMobileUrl: (formData.get("imageMobileUrl") as string)?.trim() || null,
    linkUrl: (formData.get("linkUrl") as string)?.trim() || null,
    imageUrlAr,
    imageMobileUrlAr: (formData.get("imageMobileUrlAr") as string)?.trim() || null,
    linkUrlAr: (formData.get("linkUrlAr") as string)?.trim() || null,
    sortOrder: parseInt(formData.get("sortOrder") as string, 10) || 0,
    isActive: formData.get("isActive") !== "false",
    startsAt: formData.get("startsAt") ? new Date(formData.get("startsAt") as string) : null,
    endsAt: formData.get("endsAt") ? new Date(formData.get("endsAt") as string) : null,
  };

  const session = await auth();
  if (id) {
    await prisma.banner.update({ where: { id }, data });
    await audit(session?.user?.email, "banner.updated", "Banner", id, { title });
  } else {
    const created = await prisma.banner.create({ data });
    await audit(session?.user?.email, "banner.created", "Banner", created.id, { title });
  }

  revalidatePath("/");
  revalidatePath("/admin/editorial/banners");
  redirect("/admin/editorial/banners");
}

async function deleteBanner(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const existing = await prisma.banner.findUnique({ where: { id }, select: { title: true } });
  await prisma.banner.delete({ where: { id } });
  const session = await auth();
  await audit(session?.user?.email, "banner.deleted", "Banner", id, { title: existing?.title ?? "" });
  revalidatePath("/");
  revalidatePath("/admin/editorial/banners");
}

export default async function AdminBannersPage({
  searchParams,
}: {
  searchParams: { edit?: string; add?: string };
}) {
  const [banners, categories] = await Promise.all([
    prisma.banner.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { slug: true, name: true } }),
  ]);

  const editing = searchParams.edit ? banners.find((b) => b.id === searchParams.edit) : null;
  const showForm = searchParams.add === "1" || !!editing;

  // Easy link suggestions for the datalist
  const linkOptions = [
    "/bestsellers",
    "/new-releases",
    "/book-of-the-month",
    "/bundles",
    "/category/english-books",
    "/category/arabic-books",
    ...categories.map((c) => `/category/${c.slug}`),
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-black text-[#1e293b]">Hero Banners</h1>
        {!showForm && (
          <a href="?add=1" className="px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm">
            + Add Banner
          </a>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-[#e2e8f0] rounded-sm p-6 mb-6">
          <h2 className="text-[15px] font-black text-[#1e293b] mb-1">{editing ? "Edit Banner" : "New Banner"}</h2>
          <p className="text-[12px] text-[#64748b] mb-5">
            Upload a designed banner image (text baked in) for each language. You can provide an <b>English</b> version and an <b>Arabic</b> version — neither is mandatory, but if one language is missing the site automatically shows the other. Each language has its own link so it routes to the matching part of the site.
          </p>
          <form action={saveBanner} className="space-y-5">
            {editing && <input type="hidden" name="id" value={editing.id} />}

            <EF label="Banner Name (internal) *" name="title" required defaultValue={editing?.title ?? ""} placeholder="e.g. Summer Sale — Homepage" />

            {/* ── English version ─────────────────────────────────────────── */}
            <fieldset className="border border-[#e2e8f0] rounded-sm p-4">
              <legend className="px-2 text-[12px] font-black uppercase tracking-wide text-[#1e293b]">🇬🇧 English version</legend>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <ImageUpload
                  name="imageUrl"
                  label="Desktop Image"
                  defaultValue={editing?.imageUrl ?? ""}
                  shape="banner"
                  dimensions="1920 × 720 px"
                  dimensionsNote="(8 : 3 — wide)"
                />
                <ImageUpload
                  name="imageMobileUrl"
                  label="Mobile Image"
                  defaultValue={editing?.imageMobileUrl ?? ""}
                  shape="cover"
                  dimensions="1080 × 1350 px"
                  dimensionsNote="(4 : 5 — portrait; falls back to desktop if empty)"
                />
              </div>
              <div className="mt-4">
                <EF
                  label="English Link (where the banner goes when clicked)"
                  name="linkUrl"
                  defaultValue={editing?.linkUrl ?? ""}
                  placeholder="/bestsellers  ·  /category/english-books  ·  /book/some-slug"
                  list="banner-link-options"
                />
              </div>
            </fieldset>

            {/* ── Arabic version ──────────────────────────────────────────── */}
            <fieldset className="border border-[#e2e8f0] rounded-sm p-4">
              <legend className="px-2 text-[12px] font-black uppercase tracking-wide text-[#1e293b]">🇪🇬 Arabic version — النسخة العربية</legend>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <ImageUpload
                  name="imageUrlAr"
                  label="Desktop Image (Arabic)"
                  defaultValue={editing?.imageUrlAr ?? ""}
                  shape="banner"
                  dimensions="1920 × 720 px"
                  dimensionsNote="(8 : 3 — wide)"
                />
                <ImageUpload
                  name="imageMobileUrlAr"
                  label="Mobile Image (Arabic)"
                  defaultValue={editing?.imageMobileUrlAr ?? ""}
                  shape="cover"
                  dimensions="1080 × 1350 px"
                  dimensionsNote="(4 : 5 — portrait; falls back to desktop if empty)"
                />
              </div>
              <div className="mt-4">
                <EF
                  label="Arabic Link (where the banner goes when clicked)"
                  name="linkUrlAr"
                  defaultValue={editing?.linkUrlAr ?? ""}
                  placeholder="/category/arabic-books  ·  /book/some-slug"
                  list="banner-link-options"
                />
              </div>
            </fieldset>

            <datalist id="banner-link-options">
              {linkOptions.map((o) => <option key={o} value={o} />)}
            </datalist>
            <p className="text-[11px] text-[#94a3b8] -mt-2">
              At least one desktop image (English or Arabic) is required. Pick a section from the list, or paste a link to any book (<code>/book/&lt;slug&gt;</code>) or category (<code>/category/&lt;slug&gt;</code>).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <EF label="Sort Order" name="sortOrder" type="number" defaultValue={(editing?.sortOrder ?? 0).toString()} />
              <EF label="Start Date" name="startsAt" type="date" defaultValue={editing?.startsAt ? editing.startsAt.toISOString().split("T")[0] : ""} />
              <EF label="End Date" name="endsAt" type="date" defaultValue={editing?.endsAt ? editing.endsAt.toISOString().split("T")[0] : ""} />
            </div>
            <div>
              <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">Status</label>
              <select name="isActive" defaultValue={editing ? (editing.isActive ? "true" : "false") : "true"}
                className="w-full sm:w-[200px] px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm bg-white outline-none focus:border-[#3b82f6]">
                <option value="true">Active</option>
                <option value="false">Hidden</option>
              </select>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="submit" className="px-5 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm">
                {editing ? "Save" : "Create Banner"}
              </button>
              <a href="/admin/editorial/banners" className="px-5 py-2.5 border border-[#e2e8f0] text-[#64748b] text-[13px] font-bold rounded-sm">Cancel</a>
            </div>
          </form>
        </div>
      )}

      {/* Banner list */}
      <div className="space-y-3">
        {banners.map((banner) => {
          const now = new Date();
          const expired = banner.endsAt && new Date(banner.endsAt) < now;
          const notStarted = banner.startsAt && new Date(banner.startsAt) > now;
          return (
            <div key={banner.id} className={`bg-white border rounded-sm overflow-hidden ${!banner.isActive || expired ? "opacity-60 border-[#e2e8f0]" : "border-[#e2e8f0]"}`}>
              <div className="flex gap-0">
                {(banner.imageUrl || banner.imageUrlAr) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={(banner.imageUrl || banner.imageUrlAr)!} alt={banner.title} className="w-[140px] sm:w-[220px] h-[82px] object-cover flex-shrink-0" />
                )}
                <div className="flex-1 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-bold text-[#1e293b] text-[14px] truncate">{banner.title}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        expired ? "bg-red-100 text-red-600" : notStarted ? "bg-yellow-100 text-yellow-700" : banner.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {expired ? "Expired" : notStarted ? "Scheduled" : banner.isActive ? "Live" : "Hidden"}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${banner.imageUrl ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400"}`}>
                        EN {banner.imageUrl ? "✓" : "—"}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${banner.imageUrlAr ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
                        AR {banner.imageUrlAr ? "✓" : "—"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#94a3b8] mt-1">
                      Order: {banner.sortOrder}
                      {banner.linkUrl && ` · EN → ${banner.linkUrl}`}
                      {banner.linkUrlAr && ` · AR → ${banner.linkUrlAr}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <a href={`?edit=${banner.id}`} className="text-[12px] text-[#3b82f6] hover:underline font-bold">Edit</a>
                    <form action={deleteBanner}>
                      <input type="hidden" name="id" value={banner.id} />
                      <button type="submit" className="text-[12px] text-red-400 hover:underline">Delete</button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {banners.length === 0 && (
          <div className="bg-white border border-[#e2e8f0] rounded-sm p-12 text-center text-[#94a3b8]">
            No banners yet. Add one to display on your homepage.
          </div>
        )}
      </div>
    </div>
  );
}

function EF({
  label, name, type = "text", required, defaultValue, placeholder, list,
}: {
  label: string; name: string; type?: string; required?: boolean; defaultValue?: string; placeholder?: string; list?: string;
}) {
  return (
    <div>
      <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">{label}</label>
      <input
        type={type} name={name} required={required} defaultValue={defaultValue} placeholder={placeholder} list={list}
        className="w-full px-3 py-2.5 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]"
      />
    </div>
  );
}
