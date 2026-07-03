// One-off generator for the PWA icon set (run: npm run gen:icons)
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const svg = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2563eb"/>
      <stop offset="1" stop-color="#1e3a8a"/>
    </linearGradient>
  </defs>
  <rect x="${pad}" y="${pad}" width="${512 - 2 * pad}" height="${512 - 2 * pad}" rx="${pad > 0 ? 96 : 0}" fill="url(#g)"/>
  <text x="256" y="316" font-family="Arial, Helvetica, sans-serif" font-size="280" font-weight="900"
        text-anchor="middle" fill="#ffffff">P</text>
  <circle cx="366" cy="150" r="46" fill="#22c55e" stroke="#ffffff" stroke-width="10"/>
  <path d="M366 128 l0 44 M344 150 l44 0" stroke="#ffffff" stroke-width="10" stroke-linecap="round"/>
</svg>`;

mkdirSync("public/icons", { recursive: true });

const rounded = Buffer.from(svg(28));
const maskable = Buffer.from(svg(0));

await sharp(rounded).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(rounded).resize(512, 512).png().toFile("public/icons/icon-512.png");
await sharp(rounded).resize(180, 180).flatten({ background: "#1e3a8a" }).png().toFile("public/icons/apple-touch-icon.png");
await sharp(maskable).resize(512, 512).png().toFile("public/icons/icon-maskable-512.png");

console.log("icons generated");
