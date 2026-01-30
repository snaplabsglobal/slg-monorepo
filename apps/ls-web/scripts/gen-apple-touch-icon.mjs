#!/usr/bin/env node
/**
 * Generate apple-touch-icon.png 180×180 (#0b1220 background).
 * Run: node scripts/gen-apple-touch-icon.mjs
 */
import sharp from 'sharp'
import { writeFileSync } from 'fs'
import { join } from 'path'

const W = 180
const H = 180
// #0b1220 -> rgb(11, 18, 32)
const r = 11
const g = 18
const b = 32
const buf = Buffer.alloc(W * H * 3)
for (let i = 0; i < W * H; i++) {
  buf[i * 3] = r
  buf[i * 3 + 1] = g
  buf[i * 3 + 2] = b
}

const out = join(process.cwd(), 'public', 'icons', 'apple-touch-icon.png')
await sharp(buf, { raw: { width: W, height: H, channels: 3 } })
  .png()
  .toFile(out)
console.log('Written:', out)
