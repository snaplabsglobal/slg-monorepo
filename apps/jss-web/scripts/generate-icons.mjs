#!/usr/bin/env node
/**
 * Generate PWA icons from jss-logo.svg
 *
 * Generates:
 * - icon-192.png (192x192) - PWA icon
 * - icon-512.png (512x512) - PWA icon
 * - apple-touch-icon.png (180x180) - iOS
 * - favicon.ico, favicon.png - Browser tab
 *
 * Note: Maskable icons removed for Firefox compatibility.
 * Firefox doesn't support maskable purpose and fails to load icons.
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
  // Generate 32x32 PNG favicon
  const favicon32 = await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toBuffer()
  writeFileSync(join(publicDir, 'favicon.png'), favicon32)
  console.log('✅ Generated favicon.png (32x32)')

  // Generate 48x48 as .ico (PNG format, works in browsers)
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
