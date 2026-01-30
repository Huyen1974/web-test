/**
 * Google Cloud Identity Token Generator
 * Dùng cho Service-to-Service authentication giữa Nuxt và Agent Data
 *
 * Reference: https://cloud.google.com/run/docs/authenticating/service-to-service
 */
import { GoogleAuth, IdTokenClient } from 'google-auth-library';

let authClient: GoogleAuth | null = null;
let idTokenClientCache: Map<string, IdTokenClient> = new Map();

/**
 * Get or create GoogleAuth client (singleton)
 */
function getAuthClient(): GoogleAuth {
	if (!authClient) {
		authClient = new GoogleAuth();
	}
	return authClient;
}

/**
 * Lấy Identity Token để gọi Cloud Run service
 * @param targetAudience - URL gốc của service cần gọi (Cloud Run URL, không phải custom domain)
 * @returns Identity Token string
 */
export async function getIdentityToken(targetAudience: string): Promise<string> {
	try {
		const auth = getAuthClient();

		// Try to get cached client or create new one
		let client = idTokenClientCache.get(targetAudience);
		if (!client) {
			client = await auth.getIdTokenClient(targetAudience);
			idTokenClientCache.set(targetAudience, client);
		}

		// Get request headers which include the Authorization header
		const headers = await client.getRequestHeaders();

		// Extract token from Authorization header
		const authHeader = headers['Authorization'] || headers['authorization'];
		if (!authHeader) {
			console.error('[GoogleAuth] No Authorization header in response:', Object.keys(headers));
			throw new Error('No Authorization header returned');
		}

		const token = authHeader.replace(/^Bearer\s+/i, '');
		if (!token || token === authHeader) {
			console.error('[GoogleAuth] Could not extract token from header:', authHeader.substring(0, 20) + '...');
			throw new Error('Could not extract token from Authorization header');
		}

		return token;
	} catch (error) {
		console.error('[GoogleAuth] Failed to get identity token:', error);

		// Try alternative method: fetch from metadata server directly
		if (isRunningOnGoogleCloud()) {
			try {
				return await fetchIdTokenFromMetadata(targetAudience);
			} catch (metadataError) {
				console.error('[GoogleAuth] Metadata fetch also failed:', metadataError);
			}
		}

		throw error;
	}
}

/**
 * Fetch ID token directly from metadata server (Cloud Run only)
 * This is a fallback method if the GoogleAuth library fails
 */
async function fetchIdTokenFromMetadata(targetAudience: string): Promise<string> {
	const metadataUrl = `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(targetAudience)}`;

	const response = await fetch(metadataUrl, {
		headers: {
			'Metadata-Flavor': 'Google',
		},
	});

	if (!response.ok) {
		throw new Error(`Metadata server returned ${response.status}: ${await response.text()}`);
	}

	const token = await response.text();
	if (!token) {
		throw new Error('Empty token from metadata server');
	}

	console.log('[GoogleAuth] Successfully got token from metadata server');
	return token;
}

/**
 * Check if running on Google Cloud (Cloud Run, GCE, etc.)
 * On Google Cloud, the metadata server is available
 */
export function isRunningOnGoogleCloud(): boolean {
	// K_SERVICE is set by Cloud Run
	// GOOGLE_CLOUD_PROJECT is often set on GCE/GKE
	return !!(process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT);
}

/**
 * Get the Cloud Run service URL (not custom domain)
 * This is important because Identity Token audience must match service URL exactly
 */
export function getCloudRunServiceUrl(baseUrl: string): string {
	// If already a run.app URL, return as-is
	if (baseUrl.includes('.run.app')) {
		return baseUrl;
	}

	// For custom domains, we need the actual Cloud Run URL
	// This should be configured via environment variable
	const cloudRunUrl = process.env.NUXT_AGENT_DATA_CLOUD_RUN_URL;
	if (cloudRunUrl) {
		return cloudRunUrl;
	}

	// Fallback to provided URL (will work for direct Cloud Run URLs)
	return baseUrl;
}
