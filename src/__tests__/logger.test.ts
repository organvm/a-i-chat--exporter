import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger, setLogLevel } from '../utils/logger';

describe('structured logger', () => {
  let debug: ReturnType<typeof vi.spyOn>;
  let info: ReturnType<typeof vi.spyOn>;
  let warn: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    info = vi.spyOn(console, 'info').mockImplementation(() => {});
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    error = vi.spyOn(console, 'error').mockImplementation(() => {});
    setLogLevel('debug');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setLogLevel('debug');
  });

  it('emits a prefixed, leveled message with structured context', () => {
    logger.info('hello', { foo: 'bar' });

    expect(info).toHaveBeenCalledTimes(1);
    const [message, context] = info.mock.calls[0];
    expect(message).toBe('[chatgpt-exporter] INFO hello');
    expect(context).toEqual({ foo: 'bar' });
  });

  it('omits the context argument when none is provided', () => {
    logger.warn('careful');

    expect(warn).toHaveBeenCalledWith('[chatgpt-exporter] WARN careful');
  });

  it('redacts sensitive keys from context', () => {
    logger.error('boom', { accessToken: 'secret', apiKey: 'k', authorization: 'Bearer x', safe: 1 });

    const [, context] = error.mock.calls[0];
    expect(context).toEqual({
      accessToken: '[redacted]',
      apiKey: '[redacted]',
      authorization: '[redacted]',
      safe: 1,
    });
  });

  it('normalizes Error values in context', () => {
    logger.error('failed', { error: new TypeError('nope') });

    const [, context] = error.mock.calls[0];
    expect(context).toEqual({ error: { name: 'TypeError', message: 'nope' } });
  });

  it('suppresses messages below the configured minimum level', () => {
    setLogLevel('warn');

    logger.debug('d');
    logger.info('i');
    logger.warn('w');

    expect(debug).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
