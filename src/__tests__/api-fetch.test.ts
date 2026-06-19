import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../auth', () => ({
  requireExporterApiAuth: vi.fn().mockResolvedValue(undefined),
  isExporterAuthError: () => false,
}));

vi.mock('../page', () => ({
  isSharePage: () => false,
  getChatIdFromUrl: () => null,
  getConversationFromSharePage: vi.fn(() => null),
  getPageAccessToken: () => 'page-access-token',
}));

import { ApiError, fetchConversation, isApiError } from '../api';
import { getConversationFromSharePage } from '../page';
import { ValidationError } from '../utils/validation';

describe('fetchConversation input validation', () => {
  it('rejects an empty chat id before making any request', async () => {
    await expect(fetchConversation('', false)).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects a chat id with unsafe characters', async () => {
    await expect(fetchConversation('../secrets', false)).rejects.toThrow(/invalid format/);
  });

  it('throws a clear error when the share page has no conversation data', async () => {
    vi.mocked(getConversationFromSharePage).mockReturnValueOnce(null);
    await expect(fetchConversation('__share__abc123', false)).rejects.toThrow(/shared conversation/);
  });
});

describe('fetchApi error handling', () => {
  beforeEach(() => {
    vi.stubGlobal('document', { cookie: '' });
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/accounts/check')) {
        return new Response(JSON.stringify({ accounts: {}, account_ordering: [] }), { status: 200 });
      }
      if (url.includes('/conversation/')) {
        return new Response('not found', { status: 404, statusText: 'Not Found' });
      }
      return new Response('{}', { status: 200 });
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('throws a typed ApiError carrying the HTTP status on a failed response', async () => {
    let caught: unknown;
    try {
      await fetchConversation('abc123', false);
    }
    catch (error) {
      caught = error;
    }

    expect(isApiError(caught)).toBe(true);
    const apiError = caught as ApiError;
    expect(apiError).toBeInstanceOf(ApiError);
    expect(apiError.status).toBe(404);
    expect(apiError.method).toBe('GET');
    // The url must be redacted: the raw conversation id must not leak into it.
    expect(apiError.url).not.toContain('abc123');
  });
});
