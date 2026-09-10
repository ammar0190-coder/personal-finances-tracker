/**
 * Regenerates the PWA PNG icons from public/icons/icon.svg.
 *
 * Run manually after editing the SVG: `node scripts/generate-icons.mjs`.
 * Uses sharp, which Next.js already installs for image optimisation — this is
 * deliberately not a package.json dependency, since it is only ever needed to
 * regenerate committed artefacts, never at build or run time.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const svg = readFileSync(path.join(root, "public/icons/icon.svg"));
const out = (name) => path.join(root, "public/icons", name);

// Maskable icons are cropped to a circle by Android, so the artwork must sit
// inside the safe zone — 80% of the canvas, padded with the brand colour.
const MASKABLE_SCALE = 0.8;

await sharp(svg).resize(192, 192).png().toFile(out("icon-192.png"));
await sharp(svg).resize(512, 512).png().toFile(out("icon-512.png"));

const inner = Math.round(512 * MASKABLE_SCALE);
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#2a78d6" } })
  .composite([{ input: await sharp(svg).resize(inner, inner).png().toBuffer(), gravity: "centre" }])
  .png()
  .toFile(out("icon-maskable-512.png"));

console.log("wrote icon-192.png, icon-512.png, icon-maskable-512.png");
