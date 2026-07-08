/**
 * License-key verification and Pro checkout for the Pro gate.
 *
 * Verification is **offline and sovereign**: a licence key carries a payload + an
 * ECDSA (P-256 / SHA-256) signature minted by MONETA — the seller's own Bitcoin
 * licence mint. We verify it against MONETA's embedded public key with zero
 * network calls: no processor, no phone-home, nothing a third party can revoke
 * or rate-limit. The key that unlocks Pro was paid for straight to the seller.
 *
 * Verification **fails closed**: any malformed key, bad signature, or expired
 * licence downgrades the user to the free tier. Pro features must therefore gate
 * on {@link isProUnlocked} / {@link hasFeature}, never on the mere presence of a
 * stored key.
 *
 * The checkout helpers at the bottom open MONETA's own checkout page and recover
 * the minted licence key from the redirect the buyer lands on after paying.
 */

export type LicenseTier = 'free' | 'pro'

/**
 * Pro features that a valid license can unlock. The string values match the
 * `ProFeature` identifiers used by the Pro gate in `ui/SettingContext`, so a
 * verified license's `features` array can be checked directly against them.
 */
export const PRO_FEATURE_BULK_EXPORT = 'bulk-export'
export const PRO_FEATURE_MULTI_PROVIDER = 'multi-provider-export'
export const PRO_FEATURES = [PRO_FEATURE_BULK_EXPORT, PRO_FEATURE_MULTI_PROVIDER] as const

export interface LicensePayload {
    /** Subject — customer id or email the licence was issued to. */
    sub?: string
    /** Tier granted by this licence. */
    tier: LicenseTier
    /** Expiry as unix seconds. Omitted means perpetual. */
    exp?: number
    /** Explicit feature grants. Omitted means "all features for the tier". */
    features?: string[]
}

export interface LicenseStatus {
    /** Whether the licence is valid and grants the Pro tier. */
    valid: boolean
    tier: LicenseTier
    /** Concrete features unlocked by this licence. */
    features: string[]
    /** Machine-readable reason, useful when `valid` is false. */
    reason?: string
    payload?: LicensePayload
}

/** The safe default returned whenever verification cannot succeed. */
export const FREE_STATUS: LicenseStatus = Object.freeze({ valid: false, tier: 'free', features: [] })

declare const __MINT_CHECKOUT_URL__: string
declare const __MINT_PUBLIC_JWK__: string

function freeStatus(reason: string, payload?: LicensePayload): LicenseStatus {
    return { valid: false, tier: 'free', features: [], reason, payload }
}

/**
 * MONETA's ECDSA P-256 public key (JWK), injected at build time from the mint's
 * `/pubkey`. It verifies offline-minted Pro licences with zero network calls.
 * `null` (a build with no key wired) disables the offline path — and since the
 * sovereign path is the only path, such a build simply cannot unlock Pro.
 */
function resolveMintPublicKey(): JsonWebKey | null {
    const raw = (
        (typeof __MINT_PUBLIC_JWK__ === 'string' ? __MINT_PUBLIC_JWK__ : '')
        || import.meta.env.VITE_MINT_PUBLIC_JWK
        || import.meta.env.VITE_EXPORTER_PUBLIC_JWK
        || ''
    ).trim()
    if (!raw) return null

    try {
        const jwk = JSON.parse(raw) as JsonWebKey
        return jwk && typeof jwk === 'object' && typeof jwk.kty === 'string' ? jwk : null
    }
    catch {
        return null
    }
}

export const EXPORTER_PUBLIC_KEY_JWK: JsonWebKey | null = resolveMintPublicKey()

const MINT_CHECKOUT_URL_INPUT =
    (
        (typeof __MINT_CHECKOUT_URL__ === 'string' ? __MINT_CHECKOUT_URL__ : '')
        || import.meta.env.VITE_MINT_CHECKOUT_URL
        || ''
    ).trim()

function normalizeCheckoutInputUrl(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return ''

    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `https://${trimmed}`
}

function resolveCheckoutUrl() {
    return normalizeCheckoutInputUrl(MINT_CHECKOUT_URL_INPUT)
}

function base64UrlToBytes(input: string): Uint8Array<ArrayBuffer> {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
    const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
    const binary = atob(normalized + pad)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
}

/** Map a verified payload to the concrete set of features it unlocks. */
export function grantedFeatures(payload: LicensePayload): string[] {
    if (payload.features && payload.features.length > 0) return [...payload.features]
    if (payload.tier === 'pro') return [...PRO_FEATURES]
    return []
}

/** True only when the licence is valid and grants the Pro tier. */
export function isProUnlocked(status: LicenseStatus | null | undefined): boolean {
    return !!status && status.valid && status.tier === 'pro'
}

/** True only when the licence is valid and unlocks the given feature. */
export function hasFeature(status: LicenseStatus | null | undefined, feature: string): boolean {
    return !!status && status.valid && status.features.includes(feature)
}

/**
 * Parse a signed licence key of the form `base64url(payload).base64url(signature)`.
 * Returns `null` for anything malformed (which the caller treats as free tier).
 */
export function decodeLicenseKey(key: string): {
    payload: LicensePayload
    signature: Uint8Array<ArrayBuffer>
    signedData: Uint8Array<ArrayBuffer>
} | null {
    if (!key || typeof key !== 'string') return null

    const parts = key.trim().split('.')
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null

    const [payloadPart, signaturePart] = parts
    try {
        const payloadBytes = base64UrlToBytes(payloadPart)
        const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as LicensePayload
        if (!payload || typeof payload !== 'object' || typeof payload.tier !== 'string') return null

        return {
            payload,
            signature: base64UrlToBytes(signaturePart),
            // The signature covers the raw base64url payload string (JWT-style).
            signedData: new TextEncoder().encode(payloadPart),
        }
    }
    catch {
        return null
    }
}

/**
 * Verify a signed licence key offline against an ECDSA P-256 public key.
 * Fails closed on every error path.
 */
export async function verifySignedLicense(
    key: string,
    opts: { publicKeyJwk?: JsonWebKey | null, now?: number } = {},
): Promise<LicenseStatus> {
    const decoded = decodeLicenseKey(key)
    if (!decoded) return freeStatus('malformed')

    const jwk = opts.publicKeyJwk ?? EXPORTER_PUBLIC_KEY_JWK
    const subtle = globalThis.crypto?.subtle
    if (!jwk || !subtle) return freeStatus('crypto-unavailable')

    try {
        const publicKey = await subtle.importKey(
            'jwk',
            jwk,
            { name: 'ECDSA', namedCurve: 'P-256' },
            false,
            ['verify'],
        )
        const ok = await subtle.verify(
            { name: 'ECDSA', hash: 'SHA-256' },
            publicKey,
            decoded.signature,
            decoded.signedData,
        )
        if (!ok) return freeStatus('bad-signature')

        const { payload } = decoded
        const nowSeconds = Math.floor((opts.now ?? Date.now()) / 1000)
        if (typeof payload.exp === 'number' && payload.exp < nowSeconds) {
            return freeStatus('expired', payload)
        }
        if (payload.tier !== 'pro') {
            return freeStatus('not-pro', payload)
        }

        return { valid: true, tier: 'pro', features: grantedFeatures(payload), payload }
    }
    catch {
        return freeStatus('verify-error')
    }
}

/**
 * Verify a stored licence key. The sovereign path is the only path: an offline
 * signed-key check against MONETA's embedded public key. Always fails closed to
 * the free tier.
 */
export async function verifyLicense(
    key: string | null | undefined,
    opts: { publicKeyJwk?: JsonWebKey | null, now?: number } = {},
): Promise<LicenseStatus> {
    if (!key || typeof key !== 'string' || !key.trim()) return freeStatus('empty')

    return verifySignedLicense(key, { publicKeyJwk: opts.publicKeyJwk, now: opts.now })
}

// ---------------------------------------------------------------------------
// MONETA sovereign checkout
// ---------------------------------------------------------------------------

const CHECKOUT_RETURN_PARAM = 'ce_checkout_return'
const CHECKOUT_SOURCE = 'chatgpt-exporter'

/** MONETA checkout-page URL, injected at build time. Empty disables checkout. */
export const MINT_CHECKOUT_URL = resolveCheckoutUrl()

/** Query/hash param names the mint's return redirect may carry the license key in. */
export const LICENSE_PARAM_NAMES = [
    'ce_license_key',
    'license_key',
    'licenseKey',
    'license',
]

function toUrl(input: string | URL | Location) {
    return new URL(input.toString())
}

function getHashParams(hash: string) {
    const value = hash.replace(/^#/, '')
    if (!value) return new URLSearchParams()

    const queryIndex = value.indexOf('?')
    return new URLSearchParams(queryIndex === -1 ? value : value.slice(queryIndex + 1))
}

function deleteParams(params: URLSearchParams, names: string[]) {
    let changed = false

    names.forEach((name) => {
        if (params.has(name)) {
            params.delete(name)
            changed = true
        }
    })

    return changed
}

function cleanHash(hash: string) {
    const value = hash.replace(/^#/, '')
    if (!value) return hash

    const queryIndex = value.indexOf('?')
    const params = getHashParams(hash)
    const changed = deleteParams(params, [...LICENSE_PARAM_NAMES, CHECKOUT_RETURN_PARAM])

    if (!changed) return hash

    const nextParams = params.toString()

    if (queryIndex === -1) {
        return nextParams ? `#${nextParams}` : ''
    }

    const hashPath = value.slice(0, queryIndex)
    return nextParams ? `#${hashPath}?${nextParams}` : `#${hashPath}`
}

/** Recover a license key the mint's return redirect carries, or `null`. */
export function getLicenseFromUrl(input: string | URL | Location = window.location) {
    const url = toUrl(input)
    const sources = [
        url.searchParams,
        getHashParams(url.hash),
    ]

    for (const params of sources) {
        for (const name of LICENSE_PARAM_NAMES) {
            const value = params.get(name)?.trim()
            if (value) return value
        }
    }

    return null
}

/** Strip license/checkout params from a URL so the key never lingers in history. */
export function cleanLicenseReturnUrl(input: string | URL | Location = window.location) {
    const url = toUrl(input)

    deleteParams(url.searchParams, [...LICENSE_PARAM_NAMES, CHECKOUT_RETURN_PARAM])
    url.hash = cleanHash(url.hash)

    return url.toString()
}

/** Rewrite the current address bar to drop any captured license/checkout params. */
export function scrubLicenseReturnUrl() {
    const nextUrl = cleanLicenseReturnUrl(window.location)

    if (nextUrl !== window.location.href) {
        window.history.replaceState(null, document.title, nextUrl)
    }
}

/**
 * Persist a license key carried by a checkout return URL, then scrub the URL so
 * the key is not left in browser history. Returns the captured key, if present.
 */
export function captureLicenseFromUrl(
    persistLicense: (licenseKey: string) => void,
    input?: string | URL | Location,
    scrub?: (() => void) | null,
) {
    const source = input ?? (typeof window !== 'undefined' ? window.location : null)
    if (!source) return null

    const license = getLicenseFromUrl(source)
    if (!license) return null

    let scrubReturnUrl = scrub ?? null
    if (scrub === undefined && typeof window !== 'undefined' && source === window.location) {
        scrubReturnUrl = scrubLicenseReturnUrl
    }

    persistLicense(license)
    scrubReturnUrl?.()

    return license
}

export function buildCheckoutReturnUrl(input: string | URL | Location = window.location) {
    const url = new URL(cleanLicenseReturnUrl(input))
    url.searchParams.set(CHECKOUT_RETURN_PARAM, '1')

    return url.toString()
}

/**
 * Build the MONETA checkout-page URL, tagging it with a non-secret source marker
 * and a `return` URL the mint sends the buyer back to (carrying the minted
 * `ce_license_key`) after payment confirms. Returns `null` when checkout is
 * unconfigured or the URL is not http(s).
 */
export function buildProCheckoutUrl(
    checkoutUrl = MINT_CHECKOUT_URL,
    returnUrl: string | URL | Location = window.location,
) {
    const trimmedCheckoutUrl = checkoutUrl.trim()
    if (!trimmedCheckoutUrl) return null

    try {
        const url = new URL(trimmedCheckoutUrl)
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return null

        if (!url.searchParams.has('source')) {
            url.searchParams.set('source', CHECKOUT_SOURCE)
        }

        if (!url.searchParams.has('return')) {
            url.searchParams.set('return', buildCheckoutReturnUrl(returnUrl))
        }

        return url.toString()
    }
    catch {
        return null
    }
}

/** Open MONETA's Pro checkout in a new tab. Returns false when unconfigured. */
export function openProCheckout(checkoutUrl = MINT_CHECKOUT_URL) {
    const url = buildProCheckoutUrl(checkoutUrl)
    if (!url) return false

    window.open(url, '_blank', 'noopener,noreferrer')
    return true
}

/** Render a stored license key for display without revealing it in full. */
export function maskLicense(license: string) {
    const trimmedLicense = license.trim()
    if (!trimmedLicense) return ''
    if (trimmedLicense.length <= 8) return '****'

    return `****-${trimmedLicense.slice(-4)}`
}
