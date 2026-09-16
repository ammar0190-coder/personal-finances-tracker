import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Display headings only (M8). Instrument Serif ships a single 400 weight, so
 * heading hierarchy comes from size rather than weight — which suits a design
 * with few heading levels.
 */
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Personal Finance Tracker",
  description: "Personal, non-commercial finance tracking.",
  // Lets Android and iOS treat the app as installable rather than a bookmark
  // (PRD §14). The manifest itself is served from src/app/manifest.ts.
  applicationName: "Finances",
  appleWebApp: { capable: true, title: "Finances", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#6b5ce7" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      /*
       * The blocking script below removes the `dark` class before React
       * hydrates, so the server's className and the client's disagree BY
       * DESIGN on this one element. Without this, every light-theme load
       * logs a hydration mismatch. It suppresses that warning for this
       * element's own attributes only — not for its subtree.
       */
      suppressHydrationWarning
      // M8: dark is the default theme, not an opt-in, so the server renders it
      // and the M8c toggle's init script below only ever has to REMOVE it.
      className={`dark ${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <head>
        {/*
          Blocking, and before anything paints: a theme applied after first
          paint is a visible flash of the other one. Hand-rolled rather than
          pulling in next-themes for ~30 lines (M8 design spec §4.1).
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
