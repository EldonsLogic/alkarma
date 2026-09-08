/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // We already compress every upload to a small WebP (~40-90 KB) via sharp,
    // so Vercel's on-the-fly optimiser (/_next/image) adds no value and only
    // burns the plan's Image Optimization quota — which, once exhausted,
    // returns 402 PAYMENT_REQUIRED and makes covers vanish on the storefront.
    // Serving the already-optimised originals directly avoids that entirely.
    unoptimized: true,
    // Serve AVIF first (50% smaller than WebP), fallback to WebP
    formats: ['image/avif', 'image/webp'],
    // Tuned to actual use-case: book covers are small, hero up to full-width
    imageSizes: [64, 96, 128, 160, 256],
    deviceSizes: [375, 640, 750, 828, 1080, 1200, 1920],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        // Vercel Blob storage
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
      {
        // Open Library book covers
        protocol: 'https',
        hostname: 'covers.openlibrary.org',
      },
      {
        // Google Books covers
        protocol: 'https',
        hostname: 'books.google.com',
      },
    ],
  },
  experimental: {
    // sharp MUST be external or the dynamic import fails inside the serverless
    // function and image compression silently falls back to the raw original.
    serverComponentsExternalPackages: ['bcryptjs', 'sharp'],
  },
  async headers() {
    // Content-Security-Policy — allows GTM/GA4, Vercel, and our image CDNs.
    // 'unsafe-inline'/'unsafe-eval' on script-src are required by Next.js's
    // hydration bootstrap and GTM; the rest of the policy still blocks plugin
    // content, base-tag hijacking, off-site form posts, and framing.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googletagmanager.com https://*.google-analytics.com https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://covers.openlibrary.org https://books.google.com https://lh3.googleusercontent.com https://*.googletagmanager.com https://*.google-analytics.com https://*.googleusercontent.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://vitals.vercel-insights.com https://va.vercel-scripts.com",
      "frame-src 'self' https://*.googletagmanager.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests",
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          // Prevent clickjacking (belt-and-braces with frame-ancestors)
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Prevent MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Control referrer info sent to third parties
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // HSTS — force HTTPS for 1 year
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          // Limit powerful browser features
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          // Isolate cross-origin documents from this one
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
