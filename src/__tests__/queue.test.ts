import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequestQueue } from '../utils/queue';

vi.mock('../utils/utils', () => ({
  sleep: vi.fn(() => Promise.resolve()),
}));

function onDone<T>(queue: RequestQueue<T>): Promise<T[]> {
  return new Promise((resolve) => {
    queue.on('done', (results) => {
      resolve(results);
    });
    queue.start();
  });
}

describe('RequestQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completes immediately with empty results when queue is empty', async () => {
    const queue = new RequestQueue<string>(100, 5000);
    const results = await onDone(queue);
    expect(results).toEqual([]);
  });

  it('processes all items and returns results in order', async () => {
    const queue = new RequestQueue<string>(10, 100);
    queue.add({ name: 'a', request: () => Promise.resolve('A') });
    queue.add({ name: 'b', request: () => Promise.resolve('B') });
    queue.add({ name: 'c', request: () => Promise.resolve('C') });

    const results = await onDone(queue);
    expect(results).toEqual(['A', 'B', 'C']);
  });

  it('retries on failure and eventually resolves', async () => {
    const queue = new RequestQueue<string>(10, 100);
    let attempts = 0;

    queue.add({
      name: 'flaky',
      request: () => {
        attempts++;
        if (attempts < 3) return Promise.reject(new Error('fail'));
        return Promise.resolve('ok');
      },
    });

    const results = await onDone(queue);
    expect(results).toEqual(['ok']);
    expect(attempts).toBe(3);
  });

  it('emits progress events during processing', async () => {
    const queue = new RequestQueue<string>(10, 100);
    const progressFn = vi.fn();

    queue.add({ name: 'a', request: () => Promise.resolve('A') });
    queue.add({ name: 'b', request: () => Promise.resolve('B') });
    queue.on('progress', progressFn);
    await onDone(queue);

    expect(progressFn).toHaveBeenCalled();
    const names = progressFn.mock.calls.map(call => (call[0] as { currentName: string }).currentName);
    expect(names.filter(n => n === 'a').length).toBe(2);
    expect(names.filter(n => n === 'b').length).toBe(2);
    expect(progressFn.mock.calls[0][0]).toEqual({
      total: 2,
      completed: 0,
      currentName: 'a',
      currentStatus: 'processing',
    });
  });

  it('stops processing and returns partial results', async () => {
    const queue = new RequestQueue<string>(10, 100);
    queue.add({ name: 'fast', request: () => Promise.resolve('fast') });
    queue.add({
      name: 'slow',
      request: () => new Promise<string>(() => {}),
    });

    const donePromise = new Promise<string[]>((resolve) => {
      queue.on('done', resolve);
    });
    queue.start();
    queue.stop();

    const results = await donePromise;
    expect(results).toEqual(['fast']);
  });

  it('clears all state and can be reused', async () => {
    const queue = new RequestQueue<string>(10, 100);

    queue.add({ name: 'a', request: () => Promise.resolve('A') });
    let results = await onDone(queue);
    expect(results).toEqual(['A']);

    queue.clear();
    queue.add({ name: 'b', request: () => Promise.resolve('B') });
    results = await onDone(queue);
    expect(results).toEqual(['B']);
  });

  it('ignores start when already in progress', async () => {
    const queue = new RequestQueue<string>(10, 100);
    const requestFn = vi.fn(() => Promise.resolve('A'));

    queue.add({ name: 'a', request: requestFn });
    const donePromise = onDone(queue);
    queue.start();
    await donePromise;

    expect(requestFn).toHaveBeenCalledTimes(1);
  });

  it('resets backoff after successful request', async () => {
    const queue = new RequestQueue<string>(10, 100);
    let attempts = 0;

    queue.add({
      name: 'a',
      request: () => {
        attempts++;
        if (attempts === 1) return Promise.reject(new Error('fail'));
        return Promise.resolve('ok');
      },
    });
    queue.add({ name: 'b', request: () => Promise.resolve('B') });

    const results = await onDone(queue);
    expect(results).toEqual(['ok', 'B']);
  });

  it('does not restart after completion', async () => {
    const queue = new RequestQueue<string>(10, 100);
    const requestFn = vi.fn(() => Promise.resolve('A'));

    queue.add({ name: 'a', request: requestFn });
    await onDone(queue);
    expect(requestFn).toHaveBeenCalledTimes(1);

    queue.add({ name: 'b', request: () => Promise.resolve('B') });
    queue.start();

    expect(requestFn).toHaveBeenCalledTimes(1);
  });

  it('reports retry status in progress events', async () => {
    const queue = new RequestQueue<string>(10, 100);
    const progressFn = vi.fn();
    let attempts = 0;

    queue.add({
      name: 'retry-me',
      request: () => {
        attempts++;
        if (attempts < 2) return Promise.reject(new Error('fail'));
        return Promise.resolve('ok');
      },
    });
    queue.on('progress', progressFn);
    await onDone(queue);

    const retryingCalls = progressFn.mock.calls.filter(
      call => (call[0] as { currentStatus: string }).currentStatus === 'retrying',
    );
    expect(retryingCalls.length).toBeGreaterThanOrEqual(1);
  });
});
