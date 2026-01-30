/**
 * AI Search Proxy - Vector Search Endpoint
 *
 * SECURITY:
 * - Requires Bearer token authentication (AI_GATEWAY_TOKEN)
 * - Server-side only - API keys never exposed to client
 * - Rate limiting: 100 requests per minute per token
 * - All requests logged for audit trail
 *
 * CLOUD RUN AUTHENTICATION:
 * - Uses Google Identity Token for service-to-service auth
 * - Includes retry with exponential backoff for Cold Start handling
 *
 * @endpoint POST /api/ai/search
 * @auth Bearer token required
 * @body { query: string, top_k?: number, filters?: object }
 * @returns Search results from Agent Data vector store
 */

import { joinURL } from 'ufo';
import { H3Event } from 'h3';
import {
	getIdentityToken,
	isRunningOnGoogleCloud,
	getCloudRunServiceUrl,
} from '~/server/utils/googleAuth';
import { retryWithBackoff, warmUp } from '~/server/utils/retryWithBackoff';

// Simple in-memory rate limiter (per-token)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100; // requests per window
const RATE_WINDOW = 60 * 1000; // 1 minute in ms

interface SearchRequest {
	query: string;
	top_k?: number;
	filters?: Record<string, unknown>;
	session_id?: string;
}

interface AuditLog {
	timestamp: string;
	endpoint: string;
	method: string;
	token_prefix: string;
	query_length: number;
	ip: string;
	user_agent: string;
	status: 'success' | 'error' | 'rate_limited' | 'unauthorized';
	latency_ms?: number;
	error?: string;
	retries?: number;
}

function logAudit(log: AuditLog): void {
	// Structured logging for Cloud Run / Cloud Logging
	console.log(
		JSON.stringify({
			severity:
				log.status === 'error'
					? 'ERROR'
					: log.status === 'rate_limited'
						? 'WARNING'
						: 'INFO',
			message: `[AI-Gateway] ${log.method} ${log.endpoint}`,
			...log,
		})
	);
}

function getClientIp(event: H3Event): string {
	const forwarded = getHeader(event, 'x-forwarded-for');
	if (forwarded) {
		return forwarded.split(',')[0].trim();
	}
	return getHeader(event, 'x-real-ip') || 'unknown';
}

function checkRateLimit(tokenPrefix: string): {
	allowed: boolean;
	remaining: number;
	resetAt: number;
} {
	const now = Date.now();
	const entry = rateLimitMap.get(tokenPrefix);

	if (!entry || now > entry.resetAt) {
		// New window
		rateLimitMap.set(tokenPrefix, { count: 1, resetAt: now + RATE_WINDOW });
		return { allowed: true, remaining: RATE_LIMIT - 1, resetAt: now + RATE_WINDOW };
	}

	if (entry.count >= RATE_LIMIT) {
		return { allowed: false, remaining: 0, resetAt: entry.resetAt };
	}

	entry.count++;
	return { allowed: true, remaining: RATE_LIMIT - entry.count, resetAt: entry.resetAt };
}

export default defineEventHandler(async (event) => {
	const startTime = Date.now();
	const config = useRuntimeConfig();
	const ip = getClientIp(event);
	const userAgent = getHeader(event, 'user-agent') || 'unknown';
	let retryCount = 0;

	// Check if Agent Data is enabled
	// Read env vars directly (server-side) because runtimeConfig.public is bundled at build time
	const agentDataEnabled =
		process.env.NUXT_PUBLIC_AGENT_DATA_ENABLED === 'true' ||
		config.public.agentData?.enabled;
	const agentDataBaseUrl =
		process.env.NUXT_PUBLIC_AGENT_DATA_BASE_URL ||
		config.public.agentData?.baseUrl;

	if (!agentDataEnabled || !agentDataBaseUrl) {
		logAudit({
			timestamp: new Date().toISOString(),
			endpoint: '/api/ai/search',
			method: 'POST',
			token_prefix: 'none',
			query_length: 0,
			ip,
			user_agent: userAgent,
			status: 'error',
			error: `Agent Data service disabled (enabled=${agentDataEnabled}, baseUrl=${!!agentDataBaseUrl})`,
		});

		throw createError({
			statusCode: 503,
			statusMessage: 'Agent Data service is disabled',
		});
	}

	// Authenticate: Require Bearer token
	const authHeader = getHeader(event, 'authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		logAudit({
			timestamp: new Date().toISOString(),
			endpoint: '/api/ai/search',
			method: 'POST',
			token_prefix: 'missing',
			query_length: 0,
			ip,
			user_agent: userAgent,
			status: 'unauthorized',
			error: 'Missing Bearer token',
		});

		throw createError({
			statusCode: 401,
			statusMessage: 'Authorization header with Bearer token required',
		});
	}

	const token = authHeader.substring(7);
	const tokenPrefix = token.substring(0, 8) + '...'; // For logging

	// Validate token against AI_GATEWAY_TOKEN environment variable
	const validToken = process.env.AI_GATEWAY_TOKEN;
	if (!validToken || token !== validToken) {
		logAudit({
			timestamp: new Date().toISOString(),
			endpoint: '/api/ai/search',
			method: 'POST',
			token_prefix: tokenPrefix,
			query_length: 0,
			ip,
			user_agent: userAgent,
			status: 'unauthorized',
			error: 'Invalid token',
		});

		throw createError({
			statusCode: 401,
			statusMessage: 'Invalid Bearer token',
		});
	}

	// Rate limiting
	const rateLimit = checkRateLimit(tokenPrefix);
	setHeader(event, 'X-RateLimit-Limit', RATE_LIMIT.toString());
	setHeader(event, 'X-RateLimit-Remaining', rateLimit.remaining.toString());
	setHeader(event, 'X-RateLimit-Reset', Math.ceil(rateLimit.resetAt / 1000).toString());

	if (!rateLimit.allowed) {
		logAudit({
			timestamp: new Date().toISOString(),
			endpoint: '/api/ai/search',
			method: 'POST',
			token_prefix: tokenPrefix,
			query_length: 0,
			ip,
			user_agent: userAgent,
			status: 'rate_limited',
			error: 'Rate limit exceeded',
		});

		throw createError({
			statusCode: 429,
			statusMessage: 'Rate limit exceeded. Try again later.',
		});
	}

	// Parse and validate request body
	let body: SearchRequest;
	try {
		body = await readBody<SearchRequest>(event);
	} catch {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid JSON body',
		});
	}

	if (!body?.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
		logAudit({
			timestamp: new Date().toISOString(),
			endpoint: '/api/ai/search',
			method: 'POST',
			token_prefix: tokenPrefix,
			query_length: 0,
			ip,
			user_agent: userAgent,
			status: 'error',
			error: 'Missing or empty query',
		});

		throw createError({
			statusCode: 400,
			statusMessage: 'Request body must include a non-empty "query" field',
		});
	}

	// Sanitize and validate parameters
	const sanitizedBody = {
		message: body.query.trim().substring(0, 2000), // Max 2000 chars
		top_k: Math.min(Math.max(body.top_k || 5, 1), 20), // 1-20
		filters: body.filters || {},
		session_id: body.session_id,
	};

	try {
		// Use the env var-aware baseUrl we already extracted
		const baseUrl = agentDataBaseUrl;
		const apiKey = config.agentData?.apiKey;

		// Get the Cloud Run service URL for Identity Token audience
		// IMPORTANT: Identity Token audience MUST be the Cloud Run URL, not custom domain
		const cloudRunUrl = getCloudRunServiceUrl(baseUrl);
		const chatUrl = joinURL(baseUrl, '/chat');
		const healthUrl = joinURL(baseUrl, '/health');

		// Prepare headers for the request
		const requestHeaders: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		// Add Google Identity Token if running on Cloud Run
		// This is required for service-to-service authentication
		if (isRunningOnGoogleCloud()) {
			try {
				const idToken = await getIdentityToken(cloudRunUrl);
				requestHeaders['Authorization'] = `Bearer ${idToken}`;
				console.log('[AI-Gateway] Using Google Identity Token for authentication');
			} catch (authError) {
				console.error('[AI-Gateway] Failed to get identity token:', authError);
				// Fall back to API key if available
				if (apiKey) {
					requestHeaders['Authorization'] = `Bearer ${apiKey}`;
					console.log('[AI-Gateway] Falling back to API key authentication');
				}
			}
		} else if (apiKey) {
			// Local development: use API key if available
			requestHeaders['Authorization'] = `Bearer ${apiKey}`;
		}

		// Define the search operation with retry support
		const searchOperation = async () => {
			const response = await $fetch(chatUrl, {
				method: 'POST',
				headers: requestHeaders,
				body: sanitizedBody,
				timeout: 60000, // 60s timeout for RAG
			});
			return response;
		};

		// Execute with retry and exponential backoff
		// This handles Cold Start scenarios where service may take 10-30s to start
		const response = await retryWithBackoff(searchOperation, {
			maxRetries: 3,
			initialDelayMs: 2000, // 2s initial delay
			maxDelayMs: 15000, // 15s max wait
			onRetry: async (attempt, error, delayMs) => {
				retryCount = attempt;
				console.warn(
					`[AI-Gateway] Retry ${attempt}/3: ${error.message}, waiting ${delayMs}ms...`
				);

				// On first retry, try a warm-up request to wake the service
				if (attempt === 1) {
					console.log('[AI-Gateway] Sending warm-up request to Agent Data...');
					await warmUp(healthUrl, requestHeaders);
				}
			},
		});

		const latency = Date.now() - startTime;

		logAudit({
			timestamp: new Date().toISOString(),
			endpoint: '/api/ai/search',
			method: 'POST',
			token_prefix: tokenPrefix,
			query_length: sanitizedBody.message.length,
			ip,
			user_agent: userAgent,
			status: 'success',
			latency_ms: latency,
			retries: retryCount,
		});

		return response;
	} catch (error) {
		const latency = Date.now() - startTime;

		logAudit({
			timestamp: new Date().toISOString(),
			endpoint: '/api/ai/search',
			method: 'POST',
			token_prefix: tokenPrefix,
			query_length: sanitizedBody.message.length,
			ip,
			user_agent: userAgent,
			status: 'error',
			latency_ms: latency,
			error: error instanceof Error ? error.message : 'Unknown error',
			retries: retryCount,
		});

		console.error('[AI-Gateway] Search failed after retries:', error);

		const statusCode =
			typeof error === 'object' && error !== null && 'statusCode' in error
				? (error.statusCode as number)
				: 503;

		throw createError({
			statusCode,
			statusMessage: 'Knowledge search temporarily unavailable. Please try again.',
			data: {
				hint: 'Service may be warming up. Retry in 30 seconds.',
				retryAfter: 30,
			},
		});
	}
});
