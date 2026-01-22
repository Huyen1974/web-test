/**
 * E2 Task #013: Sentry Client Plugin
 *
 * Captures JavaScript runtime errors, unhandled promise rejections,
 * and console errors in the browser.
 *
 * Configuration:
 * - Set NUXT_PUBLIC_SENTRY_DSN environment variable with your Sentry DSN
 * - Or update the placeholder DSN below
 */

import * as Sentry from '@sentry/nuxt';

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();

  // Get DSN from environment or use placeholder
  const dsn = config.public.sentryDsn || '';

  // Only initialize if DSN is provided and not placeholder
  if (!dsn || dsn.includes('examplePublicKey')) {
    console.warn('[Sentry] No valid DSN configured. Set NUXT_PUBLIC_SENTRY_DSN environment variable.');
    return;
  }

  Sentry.init({
    dsn,

    // Environment identification
    environment: process.env.NODE_ENV || 'development',

    // Release tracking (use git commit hash or package version)
    release: `web-test@${config.public.appVersion || '1.0.0'}`,

    // Sample rate for performance monitoring (1.0 = 100%)
    tracesSampleRate: 0.1, // 10% of transactions

    // Sample rate for error events (1.0 = 100%)
    sampleRate: 1.0, // Capture all errors

    // Capture unhandled promise rejections
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Capture 10% of all sessions
        sessionSampleRate: 0.1,
        // Capture 100% of sessions with errors
        errorSampleRate: 1.0,
      }),
    ],

    // Filter out known non-critical errors
    beforeSend(event, hint) {
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[Sentry] Captured event:', event.message || event.exception?.values?.[0]?.value);
      }

      // Filter out specific errors if needed
      const error = hint.originalException as Error | undefined;
      if (error?.message?.includes('ResizeObserver')) {
        // Common benign error
        return null;
      }

      return event;
    },

    // Add user context (anonymous)
    initialScope: {
      tags: {
        source: 'client',
      },
    },
  });

  // Capture Vue errors
  nuxtApp.vueApp.config.errorHandler = (error, instance, info) => {
    Sentry.captureException(error, {
      extra: {
        componentInfo: info,
        componentName: instance?.$options?.name,
      },
    });

    // Also log to console
    console.error('[Vue Error]', error);
  };

  // Capture unhandled promise rejections
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      Sentry.captureException(event.reason, {
        extra: {
          type: 'unhandledrejection',
        },
      });
    });
  }

  console.log('[Sentry] Initialized successfully');
});
