import { logger } from './logger';

interface RetryOptions {
  retries?: number;
  delay?: number;
  exponential?: boolean;
  label?: string;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Resilient retry utility with exponential backoff.
 *
 * Usage:
 *   await retry(() => doSomethingFlaky(), { retries: 3, delay: 500 });
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    retries = 3,
    delay = 500,
    exponential = false,
    label = 'operation',
    onRetry,
  } = options;

  let lastError: Error = new Error('Unknown error');

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt > retries) break;

      const waitTime = exponential ? delay * Math.pow(2, attempt - 1) : delay;
      logger.warn(
        `🔁 [${label}] Attempt ${attempt}/${retries} failed: ${lastError.message}. Retrying in ${waitTime}ms...`
      );

      if (onRetry) onRetry(attempt, lastError);
      await sleep(waitTime);
    }
  }

  logger.error(`❌ [${label}] All ${retries} retries exhausted.`);
  throw lastError;
}

/**
 * Polls a condition until it returns true or timeout is reached.
 *
 * Usage:
 *   await poll(() => getStatus() === 'done', { timeout: 30000, interval: 1000 });
 */
export async function poll(
  condition: () => Promise<boolean> | boolean,
  options: { timeout?: number; interval?: number; label?: string } = {}
): Promise<void> {
  const { timeout = 30_000, interval = 1_000, label = 'condition' } = options;
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    if (await condition()) {
      logger.info(`✅ Poll [${label}] resolved`);
      return;
    }
    await sleep(interval);
  }

  throw new Error(`⏱️  Poll [${label}] timed out after ${timeout}ms`);
}

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
