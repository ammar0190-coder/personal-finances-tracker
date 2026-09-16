import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The E2E suite sets NEXT_DIST_DIR so its own dev server (pointed at local
  // Supabase) can run beside a normal `npm run dev`, which Next otherwise
  // refuses in the same build dir. Unset everywhere else, including Vercel.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
