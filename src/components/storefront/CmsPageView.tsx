/**
 * CmsPageView — renders a DB-managed page (rich-text HTML output).
 * Bilingual: shows Arabic title/body (RTL) when locale is "ar", falling back
 * to English if a given page has no Arabic content yet.
 */
interface CmsPage {
  title: string;
  titleAr?: string | null;
  body: string;
  bodyAr?: string | null;
  metaTitle?: string | null;
  metaDesc?: string | null;
}

interface Props {
  page: CmsPage;
  heroLabel?: string;
  heroSubtitle?: string;
}

export function CmsPageView({ page, heroLabel, heroSubtitle }: Props) {
  // CMS rows keep an optional Arabic column from the bilingual era; prefer it
  // and fall back to the base column so older rows still render.
  const title = page.titleAr ? page.titleAr : page.title;
  const body = page.bodyAr ? page.bodyAr : page.body;
  const label = heroLabel;
  const subtitle = heroSubtitle;

  return (
    <div className="min-h-screen bg-paper-mid" dir="rtl">
      {/* Hero — matches site-wide page header style */}
      <div className="bg-ink py-14 sm:py-20 px-4 sm:px-10 text-center">
        {label && (
          <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-brand block mb-4">
            {label}
          </span>
        )}
        <h1
          className="font-bold text-paper leading-tight mb-4 font-sans-ar"
          style={{ fontSize: "clamp(28px, 5vw, 52px)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-[15px] text-paper/60 font-light">{subtitle}</p>
        )}
      </div>

      {/* Body — rich text HTML, styled via @tailwindcss/typography */}
      <div className="max-w-[800px] mx-auto px-4 sm:px-10 py-12">
        <div
          className={`prose prose-lg max-w-none
            prose-headings:font-display prose-headings:text-ink prose-headings:font-bold
            prose-h1:text-[28px] prose-h1:mb-6
            prose-h2:text-[22px] prose-h2:mt-10 prose-h2:mb-4 prose-h2:pb-1.5 prose-h2:border-b-2 prose-h2:border-brand prose-h2:inline-block
            prose-h3:text-[17px] prose-h3:mt-6 prose-h3:mb-2 prose-h3:text-brand-dark
            prose-p:text-ink-soft prose-p:leading-relaxed prose-p:text-[15px]
            prose-a:text-brand prose-a:font-medium prose-a:no-underline hover:prose-a:underline
            prose-strong:text-ink prose-strong:font-bold
            prose-ul:text-ink-soft prose-li:text-[15px] prose-li:marker:text-brand
            prose-table:border prose-table:border-paper-dark prose-table:w-full
            prose-thead:bg-paper prose-th:px-3 prose-th:py-2 prose-th:text-ink prose-th:text-left
            prose-td:border prose-td:border-paper-dark prose-td:px-3 prose-td:py-2 prose-td:text-ink-soft
            prose-headings:font-sans-ar text-right`}
          dangerouslySetInnerHTML={{ __html: body }}
        />
      </div>
    </div>
  );
}
