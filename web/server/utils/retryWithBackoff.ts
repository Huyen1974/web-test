/**
 * Retry with Exponential Backoff
 * Đặc biệt quan trọng cho Cold Start scenarios trên Cloud Run
 *
 * Cold Start có thể mất 10-30 giây, retry mechanism giúp đảm bảo
 * request không fail ngay khi service đang warming up.
 */

export interface RetryOptions {
	maxRetries: number;
	initialDelayMs: number;
	maxDelayMs: number;
	backoffMultiplier: number;
	onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

const DEFAULT_OPTIONS: RetryOptions = {
	maxRetries: 3,
	initialDelayMs: 2000, // 2 seconds - good for cold start
	maxDelayMs: 15000, // 15 seconds max
	backoffMultiplier: 2,
};

/**
 * Execute an async operation with retry and exponential backoff
 * @param operation - Async function to execute
 * @param options - Retry configuration
 * @returns Result from the operation
 * @throws Last error after all retries exhausted
 */
export async function retryWithBackoff<T>(
	operation: () => Promise<T>,
	options: Partial<RetryOptions> = {}
): Promise<T> {
	const opts = { ...DEFAULT_OPTIONS, ...options };
	let lastError: Error | null = null;
	let delay = opts.initialDelayMs;

	for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error as Error;

			// Check if error is retryable
			const retryable = isRetryableError(error);

			if (!retryable || attempt === opts.maxRetries) {
				throw error;
			}

			// Call onRetry callback if provided
			if (opts.onRetry) {
				opts.onRetry(attempt, lastError, delay);
			} else {
				console.warn(
					`[Retry ${attempt}/${opts.maxRetries}] Operation failed, retrying in ${delay}ms...`,
					{ error: lastError.message }
				);
			}

			await sleep(delay);
			delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
		}
	}

	throw lastError;
}

/**
 * Check if an error is retryable
 * Retryable errors: 503, 429, network errors, timeouts
 */
function isRetryableError(error: unknown): boolean {
	if (error instanceof Error) {
		const message = error.message.toLowerCase();

		// HTTP status codes that are retryable
		const retryableStatuses = ['503', '429', '502', '504'];
		if (retryableStatuses.some((status) => message.includes(status))) {
			return true;
		}

		// Network errors
		const networkErrors = [
			'econnrefused',
			'etimedout',
			'econnreset',
			'enetunreach',
			'fetch failed',
			'network error',
			'service unavailable',
			'bad gateway',
			'gateway timeout',
		];
		if (networkErrors.some((err) => message.includes(err))) {
			return true;
		}
	}

	// Check for fetch response with retryable status
	if (typeof error === 'object' && error !== null && 'statusCode' in error) {
		const statusCode = (error as { statusCode: number }).statusCode;
		return [502, 503, 504, 429].includes(statusCode);
	}

	return false;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a warm-up request before the main operation
 * Useful for waking up cold Cloud Run instances
 *
 * @param healthUrl - URL to ping for warm-up (typically /health endpoint)
 * @param headers - Optional headers to include
 * @returns true if warm-up succeeded, false otherwise
 */
export async function warmUp(
	healthUrl: string,
	headers?: Record<string, string>
): Promise<boolean> {
	try {
		const response = await fetch(healthUrl, {
			method: 'GET',
			headers: {
				...headers,
			},
			// Short timeout - we just want to wake it up
			signal: AbortSignal.timeout(10000),
		});

		return response.ok || response.status === 403; // 403 means service is up but needs auth
	} catch {
		// Warm-up failed, but that's okay - main request will retry
		return false;
	}
}
