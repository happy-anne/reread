import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public", { recursive: true });

const svg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
  <rect width="192" height="192" rx="36" fill="#0f172a"/>
  <text x="96" y="115" font-family="Arial, sans-serif" font-weight="800" font-size="56"
        fill="#34d399" text-anchor="middle">re:</text>
  <text x="96" y="155" font-family="Arial, sans-serif" font-weight="600" font-size="30"
        fill="#94a3b8" text-anchor="middle">read</text>
</svg>`;

const sizes = [
  { size: 192, file: "public/icon-192.png" },
  { size: 512, file: "public/icon-512.png" },
  { size: 180, file: "public/apple-touch-icon.png" },
];

for (const { size, file } of sizes) {
  await sharp(Buffer.from(svg(size))).resize(size, size).png().toFile(file);
  console.log("wrote", file);
}

// maskable icon with safe padding
const maskableSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#0f172a"/>
  <text x="256" y="270" font-family="Arial, sans-serif" font-weight="800" font-size="120"
        fill="#34d399" text-anchor="middle">re:</text>
  <text x="256" y="350" font-family="Arial, sans-serif" font-weight="600" font-size="64"
        fill="#94a3b8" text-anchor="middle">read</text>
</svg>`;
await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toFile("public/icon-maskable-512.png");
console.log("wrote public/icon-maskable-512.png");

// favicon
await sharp(Buffer.from(svg(64))).resize(64, 64).png().toFile("public/favicon.png");
console.log("wrote public/favicon.png");
