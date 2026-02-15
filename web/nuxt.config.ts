// import { formatFonts } from './utils/fonts';
import { theme } from './theme';

export default defineNuxtConfig({
	// https://nuxt.com/docs/api/configuration/nuxt-config
	ssr: true,

	nitro: {
		// Use node-server preset for Cloud Run deployment
		// This creates a standalone Node.js server (not static generation)
		preset: process.env.NITRO_PRESET || 'node-server',
		prerender: {
			crawlLinks: false,
			routes: [],
			failOnError: false,
		},
	},

	routeRules: {
		'/admin/**': { prerender: false },
		'/approval-desk': { prerender: false },
		'/approval-desk/**': { prerender: false },
		'/knowledge-tree': { prerender: false },
		'/knowledge-tree/**': { prerender: false },
		'/profile': { prerender: false },
		'/portal': { prerender: false },
		'/portal/**': { prerender: false },
		// Redirect legacy /docs routes to /knowledge (P16)
		'/docs': { redirect: { to: '/knowledge', statusCode: 301 } },
		'/docs/**': { redirect: { to: '/knowledge', statusCode: 301 } },
		// Cache: permanent until content changes (WEB-70B + P26)
		'/knowledge': { swr: 31536000, prerender: false },
		'/knowledge/**': { swr: 31536000, prerender: false },
		'/api/knowledge/**': { swr: 31536000 },
		// CDN cache for public pages (P26 — strip-cookie middleware removes set-cookie)
		'/': { swr: 3600 },
		'/posts': { swr: 3600 },
		'/posts/**': { swr: 3600 },
		'/projects': { swr: 3600 },
		'/blueprints': { swr: 3600 },
		'/blueprints/**': { swr: 3600 },
		'/help': { swr: 3600 },
		'/help/**': { swr: 3600 },
		'/_nuxt/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
	},

	extends: [
		'./layers/proposals', // Proposals module
		'./layers/portal', // Client portal module
	],

	components: [
		// Disable prefixing base components with `Base`
		{ path: '~/components/base', pathPrefix: false },
		// Auto import components from `~/components`
		'~/components',
	],

	css: ['~/assets/css/tailwind.css', '~/assets/css/main.css'],

	modules: [
		'@nuxt/image',
		'@nuxt/ui', // https://ui.nuxt.com
		'@nuxtjs/color-mode', // https://color-mode.nuxtjs.org
		'@nuxtjs/google-fonts', // https://google-fonts.nuxtjs.org
		'@nuxtjs/seo', // https://nuxtseo.com
		'@formkit/auto-animate/nuxt',
		'@vueuse/motion/nuxt', // https://motion.vueuse.org/nuxt.html
		'@vueuse/nuxt', // https://vueuse.org/
		'@nuxt/icon', // https://github.com/nuxt-modules/icon
	],

	experimental: {
		componentIslands: true,
		asyncContext: true, // https://nuxt.com/docs/guide/going-further/experimental-features#asynccontext
	},

	runtimeConfig: {
		// Server-side Directus URL for SSR/proxy (Docker internal or Cloud Run)
		// NUXT_DIRECTUS_URL is for Docker internal network (http://directus:8055)
		// Falls back to public URL if not set
		directusInternalUrl: process.env.NUXT_DIRECTUS_URL || process.env.DIRECTUS_INTERNAL_URL || process.env.NUXT_PUBLIC_DIRECTUS_URL || 'https://directus.incomexsaigoncorp.vn',
		agentData: {
			apiKey: process.env.AGENT_DATA_API_KEY || '',
		},
		public: {
			siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://github-chatgpt-ggcloud.web.app',
			// Standard Directus runtime config (env-first, golden fallback)
			directus: {
				url: process.env.NUXT_PUBLIC_DIRECTUS_URL || process.env.DIRECTUS_URL || 'https://directus.incomexsaigoncorp.vn',
				rest: {
					baseUrl: process.env.NUXT_PUBLIC_DIRECTUS_URL || process.env.DIRECTUS_URL || 'https://directus.incomexsaigoncorp.vn',
					nuxtBaseUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://github-chatgpt-ggcloud.web.app',
				},
			},
			// Legacy key kept for compatibility
			directusUrl: process.env.NUXT_PUBLIC_DIRECTUS_URL || process.env.DIRECTUS_URL || 'https://directus.incomexsaigoncorp.vn',
			agentData: {
				baseUrl: process.env.NUXT_PUBLIC_AGENT_DATA_BASE_URL || '',
				enabled: process.env.NUXT_PUBLIC_AGENT_DATA_ENABLED === 'true',
			},
			firebase: {
				apiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY || '',
				authDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
				projectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || '',
				storageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
				messagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
				appId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID || '',
				measurementId: process.env.NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
			},
			// E2 Task #013: Sentry error tracking
			// Set NUXT_PUBLIC_SENTRY_DSN with your Sentry project DSN
			sentryDsn: process.env.NUXT_PUBLIC_SENTRY_DSN || '',
			appVersion: process.env.npm_package_version || '1.0.0',
		},
	},

	// Directus Configuration
	// Note: baseUrl is used for SSR calls. For browser, NUXT_PUBLIC_DIRECTUS_URL is used via runtimeConfig.
	directus: {
		rest: {
			baseUrl: process.env.NUXT_DIRECTUS_URL || process.env.NUXT_PUBLIC_DIRECTUS_URL || process.env.DIRECTUS_URL || 'https://directus.incomexsaigoncorp.vn',
			nuxtBaseUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
		},
		auth: {
			enabled: true,
			enableGlobalAuthMiddleware: false, // Enable auth middleware on every page
			userFields: ['*'], // Select user fields (strip manual contacts dependency)
			redirect: {
				login: '/auth/signin', // Path to redirect when login is required
				logout: '/', // Path to redirect after logout
				home: '/portal', // Path to redirect after successful login
				resetPassword: '/auth/reset-password', // Path to redirect for password reset
				callback: '/auth/callback', // Path to redirect after login with provider
			},
		},
	},

	// Nuxt DevTools - https://devtools.nuxtjs.org/
	devtools: { enabled: true },

	// Color Mode Configuration - https://color-mode.nuxtjs.org/
	colorMode: {
		classSuffix: '', // This is so we play nice with TailwindCSS
	},

	// Image Configuration - https://image.nuxt.com/providers/directus
	image: {
		provider: 'directus',
		directus: {
			baseURL: `${process.env.NUXT_PUBLIC_DIRECTUS_URL || process.env.DIRECTUS_URL || 'https://directus.incomexsaigoncorp.vn'}/assets/`,
		},
	},

	// Google Fonts Configuration - https://google-fonts.nuxtjs.org/
	googleFonts: {
		families: theme.googleFonts,
		display: 'swap',
		download: true,
	},

	// OG Image Configuration - https://nuxtseo.com/og-image/getting-started/installation
	ogImage: {
		defaults: {
			component: 'OgImageTemplate',
			width: 1200,
			height: 630,
		},
		// @TODO: Fix font families for OG Image
		// fonts: formatFonts(fontFamilies),
	},

	postcss: {
		plugins: {
			'postcss-import': {},
			'tailwindcss/nesting': {},
			tailwindcss: {},
			autoprefixer: {},
		},
	},

	build: {
		transpile: ['v-perfect-signature'],
	},

	compatibilityDate: '2024-07-28',
});
