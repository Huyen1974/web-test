/**
 * AI Info Proxy - System Information Endpoint
 *
 * SECURITY:
 * - Public endpoint (no auth required) for health/status checks
 * - Server-side proxy - Agent Data API key never exposed
 * - Rate limiting: 200 requests per minute (higher limit for status checks)
 * - Cached for 30 seconds to reduce backend load
 *
 * CLOUD RUN AUTHENTICATION:
 * - Uses Google Identity Token for service-to-service auth
 * - Includes retry for Cold Start handling
 *
 * @endpoint GET /api/ai/info
 * @auth None required (public)
 * @returns System information from Agent Data backend
 */

import { joinURL } from 'ufo';
import { H3Event } from 'h3';
import {
	getIdentityToken,
	isRunningOnGoogleCloud,
	getCloudRunServiceUrl,
} from '~/server/utils/googleAuth';
import { retryWithBackoff } from '~/server/utils/retryWithBackoff';

// Simple cache for info endpoint
let cachedInfo: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 30 * 1000; // 30 seconds

// Rate limiter for info endpoint (by IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 200; // requests per window
const RATE_WINDOW = 60 * 1000; // 1 minute

function getClientIp(event: H3Event): string {
	const forwarded = getHeader(event, 'x-forwarded-for');
	if (forwarded) {
		return forwarded.split(',')[0].trim();
	}
	return getHeader(event, 'x-real-ip') || 'unknown';
}

function checkRateLimit(ip: string): boolean {
	const now = Date.now();
	const entry = rateLimitMap.get(ip);

	if (!entry || now > entry.resetAt) {
		rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
		return true;
	}

	if (entry.count >= RATE_LIMIT) {
		return false;
	}

	entry.count++;
	return true;
}

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig();
	const ip = getClientIp(event);

	// Check if Agent Data is enabled
	if (!config.public.agentData?.enabled || !config.public.agentData?.baseUrl) {
		return {
			status: 'disabled',
			message: 'Agent Data service is not configured',
			timestamp: new Date().toISOString(),
		};
	}

	// Rate limiting by IP
	if (!checkRateLimit(ip)) {
		throw createError({
			statusCode: 429,
			statusMessage: 'Rate limit exceeded',
		});
	}

	// Return cached response if valid
	const now = Date.now();
	if (cachedInfo && now - cachedInfo.timestamp < CACHE_TTL) {
		setHeader(event, 'X-Cache', 'HIT');
		return cachedInfo.data;
	}

	setHeader(event, 'X-Cache', 'MISS');

	try {
		const baseUrl = config.public.agentData.baseUrl;
		const apiKey = config.agentData?.apiKey;

		// Get the Cloud Run service URL for Identity Token audience
		const cloudRunUrl = getCloudRunServiceUrl(baseUrl);
		const infoUrl = joinURL(baseUrl, '/info');

		// Prepare headers
		const requestHeaders: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		// Add Google Identity Token if running on Cloud Run
		if (isRunningOnGoogleCloud()) {
			try {
				const idToken = await getIdentityToken(cloudRunUrl);
				requestHeaders['Authorization'] = `Bearer ${idToken}`;
			} catch (authError) {
				console.error('[AI-Gateway] Info: Failed to get identity token:', authError);
				if (apiKey) {
					requestHeaders['Authorization'] = `Bearer ${apiKey}`;
				}
			}
		} else if (apiKey) {
			requestHeaders['Authorization'] = `Bearer ${apiKey}`;
		}

		// Execute with retry (shorter retries for info endpoint)
		const response = await retryWithBackoff(
			async () => {
				return await $fetch(infoUrl, {
					method: 'GET',
					headers: requestHeaders,
					timeout: 30000,
				});
			},
			{
				maxRetries: 2,
				initialDelayMs: 1000,
				maxDelayMs: 5000,
			}
		);

		// Cache the response
		cachedInfo = { data: response, timestamp: now };

		return response;
	} catch (error) {
		console.error('[AI-Gateway] Info check failed:', error);

		// Return degraded status instead of error
		return {
			status: 'degraded',
			message: 'Agent Data backend temporarily unavailable',
			timestamp: new Date().toISOString(),
			cached: false,
		};
	}
});
