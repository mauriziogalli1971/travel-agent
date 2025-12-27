import { TimeoutError } from '../../domain/errors';

export async function withRetries(fn, { retries = 2, baseDelayMs = 200, maxElapsedMs = 30_000 } = {}) {
	let attempt = 0;
	const start = Date.now();
	// simple backoff: 200ms, 400ms
	while (attempt <= retries) {
		try {
			return await fn();
		} catch (e) {
			const elapsed = Date.now() - start;
			if (attempt >= retries || elapsed >= maxElapsedMs || !isRetryable(e)) {
				throw e;
			}
			await delay(baseDelayMs * Math.pow(2, attempt));
			attempt += 1;
		}
	}
	// Should never reach here, but keep a final safeguard
	throw new TimeoutError(`${fn.name} failed after ${retries} attempts within ${maxElapsedMs}ms.`);
}

function isRetryable(e) {
	// network issues (no status) or 429/5xx
	return !('status' in e) || e.status === 429 || (e.status >= 500 && e.status <= 599);
}

function delay(ms) {
	return new Promise((r) => setTimeout(r, ms));
}
