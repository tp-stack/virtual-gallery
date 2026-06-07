/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "**.wikimedia.org" },
      { protocol: "https", hostname: "images.metmuseum.org" },
      { protocol: "https", hostname: "framemark.vam.ac.uk" },
      { protocol: "https", hostname: "www.artic.edu" },
      { protocol: "https", hostname: "openaccess-cdn.clevelandart.org" },
      { protocol: "https", hostname: "api.europeana.eu" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' blob: data: https://upload.wikimedia.org https://*.wikimedia.org https://images.metmuseum.org https://framemark.vam.ac.uk https://www.artic.edu https://openaccess-cdn.clevelandart.org https://api.europeana.eu",
              "connect-src 'self' https://pkxfxuhrbosqloblttnr.supabase.co",
              "frame-ancestors 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
