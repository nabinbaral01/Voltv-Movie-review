import type { Metadata, Viewport } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { VoltVToaster } from "@/components/ui/Toast";
import ComposeProvider from "@/components/compose/ComposeProvider";

// ── Google Fonts ─────────────────────────────────────────────
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

// ── Metadata ─────────────────────────────────────────────────
export const metadata: Metadata = {
  title: {
    default: "VOLTV — Your Cinematic Universe",
    template: "%s | VOLTV",
  },
  description:
    "The world's first Cinematic Social Universe. Rate movies across 5 dimensions, track your watch history, debate with friends, and discover hidden gems.",
  keywords: ["movies", "cinema", "ratings", "letterboxd", "imdb", "social", "film"],
  authors: [{ name: "VOLTV" }],
  creator: "VOLTV",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    siteName: "VOLTV",
    title: "VOLTV — Your Cinematic Universe",
    description: "Rate, discover, and debate movies with the world.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "VOLTV — Your Cinematic Universe",
    description: "Rate, discover, and debate movies with the world.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0A0A0F",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// ── Root Layout ───────────────────────────────────────────────
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${jetBrainsMono.variable} dark`}
      suppressHydrationWarning
    >
      <head>
        {/* Bebas Neue — display font (cinematic) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0A0A0F] text-white antialiased min-h-screen">
        <ComposeProvider>
          {children}
        </ComposeProvider>
        <VoltVToaster />
      </body>
    </html>
  );
}
