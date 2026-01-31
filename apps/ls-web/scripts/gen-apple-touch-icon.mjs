#!/usr/bin/env node
/**
 * Generate PWA + favicon icons: apple-touch 180, icon-192, icon-512 (#0b1220).
 * Run: pnpm run gen:apple-touch-icon  or  node scripts/gen-apple-touch-icon.mjs
 */
import sharp from 'sharp'
import { join } from 'path'

// #0b1220 -> rgb(11, 18, 32)
const r = 11
const g = 18
const b = 32

const iconsDir = join(process.cwd(), 'public', 'icons')
const sizes = [
  { name: 'apple-touch-icon.png', w: 180, h: 180 },
  { name: 'icon-192.png', w: 192, h: 192 },
  { name: 'icon-512.png', w: 512, h: 512 },
]

for (const { name, w: W, h: H } of sizes) {
  const buf = Buffer.alloc(W * H * 3)
  for (let i = 0; i < W * H; i++) {
    buf[i * 3] = r
    buf[i * 3 + 1] = g
    buf[i * 3 + 2] = b
  }
  const out = join(iconsDir, name)
  await sharp(buf, { raw: { width: W, height: H, channels: 3 } })
    .png()
    .toFile(out)
  console.log('Written:', out)
}
