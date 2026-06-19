/**
 * Provider registry.
 *
 * Central list of all conversation providers and the resolver that picks the
 * active one from the current page host. The export pipeline can stay
 * provider-agnostic by going through `getActiveProvider()` instead of importing
 * `../api.ts` directly.
 *
 * Order matters: the first provider whose `matchHost` returns true wins.
 * `chatgptProvider` is the fallback so behavior is identical to today on any
 * unrecognized host.
 */
import { chatgptProvider } from './chatgpt'
import { claudeProvider } from './claude'
import { geminiProvider } from './gemini'
import { baseUrl } from '../constants'
import type { Provider } from './types'

export type {
    ApiConversationItem,
    ApiConversationWithId,
    ApiProjectInfo,
    Citation,
    ConversationNode,
    ConversationNodeMessage,
    ConversationResult,
    Provider,
    ProviderFeatures,
} from './types'
export { chatgptProvider } from './chatgpt'
export { claudeProvider } from './claude'
export { geminiProvider } from './gemini'

/** All known providers, in match-priority order. */
export const providers: Provider[] = [
    chatgptProvider,
    claudeProvider,
    geminiProvider,
]

/**
 * Resolve the provider for a given host (defaults to `location.host`).
 * Falls back to `chatgptProvider` so existing behavior is preserved when no
 * provider explicitly matches.
 */
export function getActiveProvider(host: string = location.host): Provider {
    return providers.find(provider => provider.matchHost(host)) ?? chatgptProvider
}

export function getProviderFeature(feature: keyof NonNullable<Provider['features']>, host: string = location.host): boolean {
    const provider = getActiveProvider(host)
    return provider.features?.[feature] ?? true
}

export function getConversationSource(id: string, host: string = location.host): string {
    const provider = getActiveProvider(host)
    if (provider.getConversationSource) return provider.getConversationSource(id)
    return `${baseUrl}/c/${id}`
}
