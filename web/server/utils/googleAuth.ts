/**
 * DEPRECATED: Cloud Run Identity Token helpers (P18, 2026-02-14)
 *
 * All services migrated to VPS since 2026-02-13.
 * These functions are kept as stubs for import compatibility.
 * They will never be called — VPS uses API key auth via agentDataAuth.ts.
 */

export async function getIdentityToken(_targetAudience: string): Promise<string> {
	throw new Error('Cloud Run auth deprecated — all services on VPS');
}

export function isRunningOnGoogleCloud(): boolean {
	return false;
}

export function getCloudRunServiceUrl(baseUrl: string): string {
	return baseUrl;
}
