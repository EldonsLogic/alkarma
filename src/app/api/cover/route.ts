import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

/**
 * GET /api/cover?src=<blob url>
 *
 * Serves a book cover with its white padding trimmed off.
 *
 * A third of the catalogue was uploaded as a square canvas with the artwork
 * padded out in solid white — الخادمة, for instance, is 600x600 with 82px of
 * white pixels down each side of a 434x598 cover. On a white page that is
 * invisible, which is why the files look fine when opened directly; on this
 * store's #F0F0F0 pages it renders as a white slab around the cover.
 *
 * This was first attempted in CSS with mix-blend-mode: multiply, which is the
 * obvious trick — white is multiply's identity colour. It is also unusable
 * here: blending only reaches the backdrop of the nearest isolated group, and
 * ANY transform, opacity, filter or will-change on an ancestor creates one.
 * The reveal animation, the stagger, and the card's hover lift each did, so
 * the padding kept reappearing in whichever state was not yet patched.
 *
 * Trimming the pixels sidesteps all of that: nothing about the page can
 * reintroduce padding that is no longer in the image.
 *
 * Deliberately a read-through proxy rather than a batch re-upload: the Blob
 * store is shared with the other project, so rewriting those files would change
 * its covers too, and re-uploading under new keys needs a write token this
 * environment did not have at the time. Responses are CDN-cached (briefly, since
 * covers are now replaced in place at a fixed key) and Next caches the
 * optimised variants on top, so the sharp work is rare.
 */

const ALLOWED_HOST_SUFFIX = ".public.blob.vercel-storage.com";

export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get("src");
  if (!src) return new NextResponse("missing src", { status: 400 });

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return new NextResponse("bad src", { status: 400 });
  }
  // Only ever proxy our own blob store — this must not become an open relay.
  if (url.protocol !== "https:" || !url.hostname.endsWith(ALLOWED_HOST_SUFFIX)) {
    return new NextResponse("forbidden host", { status: 403 });
  }

  try {
    const upstream = await fetch(url.toString(), { cache: "no-store" });
    if (!upstream.ok) return new NextResponse("upstream error", { status: 502 });
    const input = Buffer.from(await upstream.arrayBuffer());

    const out = await sharp(input)
      // Trim a uniform white border. The threshold is generous enough to catch
      // JPEG/WebP noise in the padding without eating into pale artwork; if a
      // cover has no border to remove, trim is a no-op.
      .trim({ background: "#ffffff", threshold: 12 })
      .webp({ quality: 82 })
      .toBuffer();

    return new NextResponse(new Uint8Array(out), {
      headers: {
        "Content-Type": "image/webp",
        // Not immutable any more: a cover lives at a fixed key and is replaced
        // in place (lib/coverKey), so the same src can change. The CDN keeps
        // a copy for 10 minutes and serves it stale while re-trimming in the
        // background, so a swap shows within minutes and no visitor waits.
        "Cache-Control": "public, max-age=0, s-maxage=600, stale-while-revalidate=86400",
      },
    });
  } catch {
    // Never break a page over a cover — fall back to the original file.
    return NextResponse.redirect(url.toString(), 302);
  }
}
