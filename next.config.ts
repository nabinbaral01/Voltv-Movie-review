import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.100.34", "192.168.1.66", "*.local",
    "*.trycloudflare.com", "*.ngrok-free.app", "*.ngrok.io", "*.loca.lt",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
        pathname: "/vi/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/vi/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ...(isDev ? [] : [{
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          }]),
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.youtube.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://image.tmdb.org https://*.supabase.co https://lh3.googleusercontent.com",
              "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.themoviedb.org",
              "media-src 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "framer-motion"],
  },
};

export default nextConfig;
