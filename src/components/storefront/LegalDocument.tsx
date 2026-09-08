/**
 * Renders a long-form legal document (privacy policy, terms of service).
 *
 * The body is trusted, build-time content from src/content/legal/* — extracted
 * verbatim from the store's own published pages, never user input — so
 * dangerouslySetInnerHTML is safe here. Do not pass request data to this.
 */
interface Props {
  label: string;
  title: string;
  subtitle?: string;
  html: string;
}

export function LegalDocument({ label, title, subtitle, html }: Props) {
  return (
    <div className="min-h-screen bg-paper-mid" dir="rtl">
      <div className="bg-ink py-14 sm:py-20 px-4 sm:px-10 text-center">
        <span className="font-mono text-[11px] tracking-[0.18em] text-brand block mb-4">{label}</span>
        <h1
          className="font-display font-bold text-paper leading-tight mb-4"
          style={{ fontSize: "clamp(28px, 5vw, 52px)" }}
        >
          {title}
        </h1>
        {subtitle && <p className="text-[15px] text-paper/60 font-light">{subtitle}</p>}
      </div>

      <div className="max-w-[820px] mx-auto px-4 sm:px-10 py-12">
        <article
          className="legal-doc text-[15px] text-ink-soft leading-[1.9]"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
