#!/usr/bin/env node
/* global process, URL */
/**
 * build-site.mjs — assemble the static deploy directory for ChatGPT Exporter.
 *
 * Output: dist-site/
 *   ├── index.html           one-click install landing page (from site/index.html)
 *   ├── chatgpt.user.js      the built userscript
 *   └── _headers             Cloudflare Pages headers (correct content-type for *.user.js)
 *
 * Usage:
 *   node scripts/build-site.mjs                       # build if missing, then assemble
 *   node scripts/build-site.mjs --build               # always rebuild first
 *   node scripts/build-site.mjs --require-pro-checkout # fail unless checkout is armed
 *
 * The assembled dist-site/ is what every deploy target (Docker, Vercel, Cloudflare,
 * or any static host) publishes. See docs/deploy.md.
 */
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const userscript = join(root, 'dist', 'chatgpt.user.js')
const outDir = join(root, 'dist-site')
const forceBuild = process.argv.includes('--build')
const requireProCheckout = process.argv.includes('--require-pro-checkout')
  || isTruthyEnv(process.env.REQUIRE_PRO_CHECKOUT)
// The landing page's Buy Pro CTA points at MONETA's own checkout page — the
// seller's sovereign Bitcoin mint, no third-party processor.
const checkoutUrlInput =
  process.env.MINT_CHECKOUT_URL
  || process.env.VITE_MINT_CHECKOUT_URL
  || ''
const mintPublicJwk =
  (process.env.MINT_PUBLIC_JWK
  || process.env.VITE_EXPORTER_PUBLIC_JWK
  || process.env.VITE_MINT_PUBLIC_JWK
  || '').trim()
const proCheckoutUrl = normalizeCheckoutInputUrl(checkoutUrlInput)

function log(msg) {
  process.stdout.write(`[build-site] ${msg}\n`)
}

function isTruthyEnv(value = '') {
  return /^(1|true|yes|on)$/i.test(value.trim())
}

function normalizeCheckoutInputUrl(value) {
  const trimmed = value.trim()
  if (!trimmed) return ''

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const url = new URL(candidate)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return ''
    return url.toString()
  }
  catch {
    return ''
  }
}

function isValidMintPublicJwk(value) {
  try {
    const jwk = JSON.parse(value)
    return !!jwk
      && typeof jwk === 'object'
      && jwk.kty === 'EC'
      && jwk.crv === 'P-256'
      && typeof jwk.x === 'string'
      && jwk.x.length > 0
      && typeof jwk.y === 'string'
      && jwk.y.length > 0
  }
  catch {
    return false
  }
}

function assertProCheckoutConfig() {
  const missing = []
  const invalid = []

  if (!checkoutUrlInput.trim()) missing.push('MINT_CHECKOUT_URL')
  else if (!proCheckoutUrl) invalid.push('MINT_CHECKOUT_URL must be an http(s) URL or host')

  if (!mintPublicJwk) missing.push('MINT_PUBLIC_JWK')
  else if (!isValidMintPublicJwk(mintPublicJwk)) {
    invalid.push('MINT_PUBLIC_JWK must be a JSON ECDSA P-256 public JWK')
  }

  if (invalid.length > 0 || (requireProCheckout && missing.length > 0)) {
    const details = [
      ...missing.map(name => `missing ${name}`),
      ...invalid,
    ]
    throw new Error([
      'Revenue checkout is not armed.',
      ...details.map(detail => `- ${detail}`),
      'Set MINT_CHECKOUT_URL to the deployed MONETA storefront and MINT_PUBLIC_JWK / VITE_EXPORTER_PUBLIC_JWK to its /pubkey value.',
    ].join('\n'))
  }
}

assertProCheckoutConfig()

if (forceBuild || !existsSync(userscript)) {
  log(forceBuild ? 'building userscript (--build)…' : 'userscript not found — running build…')
  execSync('pnpm run build', { cwd: root, stdio: 'inherit' })
}

if (!existsSync(userscript))
  throw new Error(`Expected ${userscript} after build, but it is missing.`)

// Fresh output directory.
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

// Userscript.
copyFileSync(userscript, join(outDir, 'chatgpt.user.js'))

// Landing page with version + build-time injected.
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const html = readFileSync(join(root, 'site', 'index.html'), 'utf8')
  .replaceAll('__VERSION__', pkg.version)
  .replaceAll('__BUILT_AT__', new Date().toISOString().slice(0, 10))
  .replaceAll('__PRO_CHECKOUT_URL__', proCheckoutUrl || '#support')
writeFileSync(join(outDir, 'index.html'), html)

// Cloudflare Pages headers — serve the userscript as JS so managers detect it.
writeFileSync(join(outDir, '_headers'), [
  '/chatgpt.user.js',
  '  Content-Type: text/javascript; charset=utf-8',
  '  Cache-Control: public, max-age=0, must-revalidate',
  '',
].join('\n'))

log(`assembled → dist-site/ (v${pkg.version})`)
if (proCheckoutUrl && mintPublicJwk) log('  pro checkout: armed')
else if (proCheckoutUrl) log('  pro checkout: checkout URL only (licence verification not armed)')
else log('  pro checkout: preview fallback (#support)')
log('  index.html, chatgpt.user.js, _headers')
