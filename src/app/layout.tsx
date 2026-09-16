import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";

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
      // M8: dark is the default theme, not an opt-in. The toggle that reaches the
      // light scale arrives in M8c; until then the app boots dark.
      className={`dark ${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
