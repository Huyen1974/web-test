/**
 * Agent Data Authentication Helper — WEB-56
 *
 * Builds auth headers for Agent Data API calls.
 * VPS deployment (since 2026-02-13): uses API key via Bearer token.
 *
 * DEPRECATED: Cloud Run auth paths commented out in P19 (2026-02-14).
 * Kept for reference — all services now run on VPS.
 */

// DEPRECATED: Cloud Run - VPS only since 2026-02-13
// import { execSync } from 'node:child_process';
// import {
// 	getIdentityToken,
// 	isRunningOnGoogleCloud,
// 	getCloudRunServiceUrl,
// } from '~/server/utils/googleAuth';

// DEPRECATED: Cloud Run - VPS only since 2026-02-13
// Cache gcloud token for 50 minutes (tokens are valid for 60 min)
// let gcloudTokenCache: { token: string; expiresAt: number } | null = null;

// DEPRECATED: Cloud Run - VPS only since 2026-02-13
// /**
//  * Get Identity Token via gcloud CLI (fallback for local dev)
//  * Uses generic token (no --audiences flag) which works for Cloud Run
//  */
// function getGcloudIdentityToken(_audience: string): string | null {
// 	// Check cache
// 	if (gcloudTokenCache && Date.now() < gcloudTokenCache.expiresAt) {
// 		return gcloudTokenCache.token;
// 	}
//
// 	try {
// 		const token = execSync(
// 			'gcloud auth print-identity-token',
// 			{ encoding: 'utf-8', timeout: 10000 },
// 		).trim();
//
// 		if (token) {
// 			gcloudTokenCache = {
// 				token,
// 				expiresAt: Date.now() + 50 * 60 * 1000, // 50 minutes
// 			};
// 			return token;
// 		}
// 	} catch {
// 		// gcloud not available or not authenticated
// 	}
//
// 	return null;
// }

/**
 * Build auth headers for Agent Data API calls
 */
export async function buildAgentDataHeaders(baseUrl: string, apiKey?: string): Promise<Record<string, string>> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
	};

	// DEPRECATED: Cloud Run - VPS only since 2026-02-13
	// const isCloudRunTarget = baseUrl.includes('.run.app');
	//
	// if (!isCloudRunTarget) {
	// 	// Localhost target: use API key if available
	// 	if (apiKey) {
	// 		headers['Authorization'] = `Bearer ${apiKey}`;
	// 	}
	// 	return headers;
	// }
	//
	// // Cloud Run target: need Identity Token
	// const cloudRunUrl = getCloudRunServiceUrl(baseUrl);
	//
	// // Method 1: google-auth-library (works on Cloud Run via metadata server)
	// if (isRunningOnGoogleCloud()) {
	// 	try {
	// 		const idToken = await getIdentityToken(cloudRunUrl);
	// 		headers['Authorization'] = `Bearer ${idToken}`;
	// 		return headers;
	// 	} catch {
	// 		// Fall through to gcloud CLI
	// 	}
	// }
	//
	// // Method 2: gcloud CLI (works locally if gcloud is configured)
	// const gcloudToken = getGcloudIdentityToken(cloudRunUrl);
	// if (gcloudToken) {
	// 	headers['Authorization'] = `Bearer ${gcloudToken}`;
	// 	return headers;
	// }
	//
	// // Method 3: API key fallback (may not work for Cloud Run IAM)

	// VPS: use API key auth
	if (apiKey) {
		headers['Authorization'] = `Bearer ${apiKey}`;
	}

	return headers;
}
