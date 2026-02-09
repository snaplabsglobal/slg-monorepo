#!/usr/bin/env node
/**
 * Generate PWA icons from jss-logo.svg
 *
 * Generates:
 * - icon-192.png (192x192)
 * - icon-512.png (512x512)
 * - apple-touch-icon.png (180x180)
 * - favicon.ico (multi-size: 16, 32, 48)
 */

import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
const iconsDir = join(publicDir, 'icons')

const svgPath = join(iconsDir, 'jss-logo.svg')
const svgBuffer = readFileSync(svgPath)

async function generatePng(size, outputName) {
  const outputPath = join(iconsDir, outputName)
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(outputPath)
  console.log(`✅ Generated ${outputName} (${size}x${size})`)
}

async function generateFavicon() {
  // Generate individual sizes for favicon
  const sizes = [16, 32, 48]
  const buffers = []

  for (const size of sizes) {
    const buf = await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toBuffer()
    buffers.push({ size, buffer: buf })
  }

  // For ICO, we'll use the 32x32 PNG as a simple fallback
  // (proper ICO generation would need a dedicated library)
  // Instead, generate a 32x32 PNG as favicon.png
  const favicon32 = await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toBuffer()

  writeFileSync(join(publicDir, 'favicon.png'), favicon32)
  console.log('✅ Generated favicon.png (32x32)')

  // Also generate favicon.ico using 48x48 PNG
  // Note: This creates a PNG with .ico extension (works in most browsers)
  const favicon48 = await sharp(svgBuffer)
    .resize(48, 48)
    .png()
    .toBuffer()
  writeFileSync(join(publicDir, 'favicon.ico'), favicon48)
  console.log('✅ Generated favicon.ico (48x48 PNG)')
}

async function main() {
  console.log('🎨 Generating JSS icons from jss-logo.svg...\n')

  // PWA icons
  await generatePng(192, 'icon-192.png')
  await generatePng(512, 'icon-512.png')

  // Apple touch icon
  await generatePng(180, 'apple-touch-icon.png')

  // Favicon
  await generateFavicon()

  console.log('\n✨ All icons generated!')
}

main().catch(console.error)
