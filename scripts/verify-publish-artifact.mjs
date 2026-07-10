#!/usr/bin/env node
/* global process, URL */
/**
 * Verify that the generated public artifact is armed before publishing it.
 *
 * GreasyFork and Pages should never receive a userscript build where Buy Pro is
 * disabled because the mint URL or public verify key was missing at build time.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const siteDirArg = process.argv.find(arg => arg.startsWith('--site-dir='))
const siteDir = siteDirArg ? resolve(siteDirArg.slice('--site-dir='.length)) : join(root, 'dist-site')
const siteIndex = join(siteDir, 'index.html')
const siteUserscript = join(siteDir, 'chatgpt.user.js')
const headersFile = join(siteDir, '_headers')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

const checkoutInput = (
  process.env.MINT_CHECKOUT_URL
  || process.env.VITE_MINT_CHECKOUT_URL
  || ''
).trim()
const checkoutUrl = normalizeUrl(checkoutInput)
const publicJwkRaw = (
  process.env.MINT_PUBLIC_JWK
  || process.env.VITE_MINT_PUBLIC_JWK
  || process.env.VITE_EXPORTER_PUBLIC_JWK
  || ''
).trim()

const failures = []

function normalizeUrl(value) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    return new URL(candidate).toString()
  }
  catch {
    return candidate
  }
}

function readRequired(path) {
  if (!existsSync(path)) {
    failures.push(`missing ${path}`)
    return ''
  }

  return readFileSync(path, 'utf8')
}

function parsePublicJwk(raw) {
  if (!raw) {
    failures.push('missing MINT_PUBLIC_JWK / VITE_EXPORTER_PUBLIC_JWK')
    return null
  }

  try {
    const jwk = JSON.parse(raw)
    if (
      !jwk
      || jwk.kty !== 'EC'
      || jwk.crv !== 'P-256'
      || typeof jwk.x !== 'string'
      || typeof jwk.y !== 'string'
    ) {
      failures.push('mint public JWK must be an ECDSA P-256 public key')
      return null
    }
    return jwk
  }
  catch {
    failures.push('mint public JWK is not valid JSON')
    return null
  }
}

function findAnchorHrefByText(markup, text) {
  const anchorPattern = /<a\b[^>]*>[\s\S]*?<\/a>/gi
  let match

  while ((match = anchorPattern.exec(markup))) {
    const anchor = match[0]
    const label = anchor
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (label !== text) continue

    const hrefMatch = anchor.match(/\bhref=(["'])(.*?)\1/i)
    return hrefMatch ? hrefMatch[2] : ''
  }

  return ''
}

if (!checkoutUrl) {
  failures.push('missing MINT_CHECKOUT_URL / VITE_MINT_CHECKOUT_URL')
}

const publicJwk = parsePublicJwk(publicJwkRaw)
const html = readRequired(siteIndex)
const userscript = readRequired(siteUserscript)
const headers = readRequired(headersFile)

if (checkoutUrl && !html.includes(checkoutUrl)) {
  failures.push('landing page does not contain the configured mint checkout URL')
}

const buyProHref = findAnchorHrefByText(html, 'Buy Pro')
if (!buyProHref) {
  failures.push('landing page is missing the Buy Pro CTA')
}
else if (buyProHref === '#support') {
  failures.push('landing page Buy Pro CTA still points at the disabled #support fallback')
}
else if (checkoutUrl && normalizeUrl(buyProHref) !== checkoutUrl) {
  failures.push('landing page Buy Pro CTA does not point at the configured mint checkout URL')
}

if (checkoutUrl && !userscript.includes(checkoutInput) && !userscript.includes(checkoutUrl)) {
  failures.push('userscript does not contain the configured mint checkout URL')
}

if (userscript.includes('MINT_CHECKOUT_URL_INPUT = "".trim()')) {
  failures.push('userscript was built with an empty mint checkout URL')
}

if (userscript.includes('"".trim();\n\t\treturn null;')) {
  failures.push('userscript was built with an empty mint public JWK')
}

if (publicJwk) {
  if (!userscript.includes(publicJwk.x) || !userscript.includes(publicJwk.y)) {
    failures.push('userscript does not contain the configured mint public JWK')
  }
}

if (!userscript.includes(`// @version            ${pkg.version}`)) {
  failures.push(`userscript metadata version does not match package version ${pkg.version}`)
}

for (const marker of [
  '// @homepageURL',
  '// @supportURL',
  '// @match              https://chatgpt.com/?ce_license_key=*',
]) {
  if (!userscript.includes(marker)) failures.push(`userscript metadata missing ${marker}`)
}

if (!headers.includes('Content-Type: text/javascript; charset=utf-8')) {
  failures.push('dist-site/_headers does not force a userscript JavaScript content type')
}

if (failures.length > 0) {
  process.stderr.write(`publish artifact check failed:\n${failures.map(f => `- ${f}`).join('\n')}\n`)
  process.exit(1)
}

process.stdout.write('publish artifact check passed\n')
