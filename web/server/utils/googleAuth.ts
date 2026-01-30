/**
 * Google Cloud Identity Token Generator
 * Dùng cho Service-to-Service authentication giữa Nuxt và Agent Data
 *
 * Reference: https://cloud.google.com/run/docs/authenticating/service-to-service
 */
import { GoogleAuth } from 'google-auth-library';

let authClient: GoogleAuth | null = null;

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
	const auth = getAuthClient();
	const client = await auth.getIdTokenClient(targetAudience);
	const headers = await client.getRequestHeaders();
	const token = headers['Authorization']?.replace('Bearer ', '');

	if (!token) {
		throw new Error('Failed to obtain identity token');
	}

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
