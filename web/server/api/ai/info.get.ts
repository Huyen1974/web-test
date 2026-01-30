/**
 * AI Info Proxy - System Information Endpoint
 *
 * SECURITY:
 * - Public endpoint (no auth required) for health/status checks
 * - Server-side proxy - Agent Data API key never exposed
 * - Rate limiting: 200 requests per minute (higher limit for status checks)
 * - Cached for 30 seconds to reduce backend load
 *
 * @endpoint GET /api/ai/info
 * @auth None required (public)
 * @returns System information from Agent Data backend
 */

import { joinURL } from 'ufo';
import { H3Event } from 'h3';

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
	if (cachedInfo && (now - cachedInfo.timestamp) < CACHE_TTL) {
		setHeader(event, 'X-Cache', 'HIT');
		return cachedInfo.data;
	}

	setHeader(event, 'X-Cache', 'MISS');

	try {
		const baseUrl = config.public.agentData.baseUrl;
		const apiKey = config.agentData?.apiKey;
		const infoUrl = joinURL(baseUrl, '/info');

		const response = await $fetch(infoUrl, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				...(apiKey && { Authorization: `Bearer ${apiKey}` }),
			},
			timeout: 30000,
		});

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
