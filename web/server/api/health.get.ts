/**
 * E2 Task #013: Comprehensive Health Check Endpoint
 *
 * Returns detailed health status of the application and its dependencies.
 *
 * GET /api/health
 *
 * Response:
 * {
 *   "status": "ok|degraded|error",
 *   "services": {
 *     "directus": { "status": "ok", "latency": 123 },
 *     "auth": { "status": "ok|error", "error": "..." }
 *   },
 *   "timestamp": "2024-01-22T10:00:00.000Z"
 * }
 */

interface ServiceHealth {
  status: 'ok' | 'error' | 'degraded';
  latency?: number;
  error?: string;
}

interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  services: {
    directus: ServiceHealth;
    auth: ServiceHealth;
  };
  timestamp: string;
  version?: string;
  environment?: string;
}

export default defineEventHandler(async (event): Promise<HealthResponse> => {
  const config = useRuntimeConfig();
  const startTime = Date.now();

  const services: HealthResponse['services'] = {
    directus: { status: 'error' },
    auth: { status: 'error' },
  };

  // Check Directus connectivity
  const directusUrl =
    config.directusInternalUrl ||
    process.env.DIRECTUS_INTERNAL_URL ||
    'https://directus.incomexsaigoncorp.vn';

  try {
    const directusStart = Date.now();
    const directusResponse = await $fetch(`${directusUrl}/server/ping`, {
      timeout: 5000,
    });
    services.directus = {
      status: 'ok',
      latency: Date.now() - directusStart,
    };
  } catch (error: any) {
    services.directus = {
      status: 'error',
      error: error.message || 'Failed to connect to Directus',
    };
  }

  // Check Auth endpoint
  try {
    const authStart = Date.now();
    // Just check if auth endpoint is reachable (don't actually login)
    const authResponse = await $fetch.raw(`${directusUrl}/auth/login`, {
      method: 'POST',
      body: { email: '', password: '' },
      timeout: 5000,
      ignoreResponseError: true,
    });

    // Expecting 400 (bad request) since we sent empty credentials
    // This means the endpoint is working
    if (authResponse.status === 400 || authResponse.status === 401) {
      services.auth = {
        status: 'ok',
        latency: Date.now() - authStart,
      };
    } else {
      services.auth = {
        status: 'degraded',
        latency: Date.now() - authStart,
        error: `Unexpected status: ${authResponse.status}`,
      };
    }
  } catch (error: any) {
    services.auth = {
      status: 'error',
      error: error.message || 'Failed to reach auth endpoint',
    };
  }

  // Determine overall status
  const allOk = Object.values(services).every((s) => s.status === 'ok');
  const anyError = Object.values(services).some((s) => s.status === 'error');

  let overallStatus: 'ok' | 'degraded' | 'error';
  if (allOk) {
    overallStatus = 'ok';
  } else if (anyError) {
    overallStatus = 'error';
  } else {
    overallStatus = 'degraded';
  }

  // Set appropriate HTTP status code
  if (overallStatus === 'error') {
    setResponseStatus(event, 503); // Service Unavailable
  } else if (overallStatus === 'degraded') {
    setResponseStatus(event, 200); // Still OK, but with warnings
  }

  return {
    status: overallStatus,
    services,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'production',
  };
});
