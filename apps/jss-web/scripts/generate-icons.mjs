#!/usr/bin/env node
/**
 * Generate PWA icons from jss-logo.svg
 *
 * Generates:
 * - icon-192.png, icon-512.png (purpose: any)
 * - icon-192-maskable.png, icon-512-maskable.png (purpose: maskable, with safe area padding)
 * - apple-touch-icon.png (180x180)
 * - favicon.ico, favicon.png
 *
 * Maskable icons have 10% padding on each side (80% logo size) per PWA spec
 * https://web.dev/maskable-icon/
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

// Theme color for maskable icon background
const THEME_COLOR = '#FF7A00'

async function generatePng(size, outputName) {
  const outputPath = join(iconsDir, outputName)
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(outputPath)
  console.log(`✅ Generated ${outputName} (${size}x${size})`)
}

/**
 * Generate maskable icon with safe area padding
 * Logo is 80% of the canvas, centered on theme color background
 */
async function generateMaskable(size, outputName) {
  const outputPath = join(iconsDir, outputName)
  const logoSize = Math.round(size * 0.8) // 80% for safe area
  const padding = Math.round((size - logoSize) / 2)

  // Resize logo
  const logo = await sharp(svgBuffer)
    .resize(logoSize, logoSize)
    .png()
    .toBuffer()

  // Create background with theme color and composite logo
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: THEME_COLOR,
    },
  })
    .composite([
      {
        input: logo,
        top: padding,
        left: padding,
      },
    ])
    .png()
    .toFile(outputPath)

  console.log(`✅ Generated ${outputName} (${size}x${size}, maskable)`)
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

  // PWA icons (purpose: any)
  await generatePng(192, 'icon-192.png')
  await generatePng(512, 'icon-512.png')

  // PWA maskable icons (purpose: maskable) - with safe area padding
  await generateMaskable(192, 'icon-192-maskable.png')
  await generateMaskable(512, 'icon-512-maskable.png')

  // Apple touch icon
  await generatePng(180, 'apple-touch-icon.png')

  // Favicon
  await generateFavicon()

  console.log('\n✨ All icons generated!')
  console.log('\n📱 Test maskable icons at: https://maskable.app/editor')
}

main().catch(console.error)
