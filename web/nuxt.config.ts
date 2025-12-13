// import { formatFonts } from './utils/fonts';
import { theme } from './theme';

export default defineNuxtConfig({
	// https://nuxt.com/docs/api/configuration/nuxt-config
	ssr: false,

	nitro: {
		preset: 'static',
	},

	routeRules: {
		// '/**': {
		// 	prerender: true,
		// },
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
		'./modules/directus',
		'@nuxt/image',
		'@nuxt/ui', // https://ui.nuxt.com
		'@nuxtjs/color-mode', // https://color-mode.nuxtjs.org
		'@nuxtjs/google-fonts', // https://google-fonts.nuxtjs.org
		'@nuxtjs/seo', // https://nuxtseo.com
		'@formkit/auto-animate/nuxt',
		'@vueuse/motion/nuxt', // https://motion.vueuse.org/nuxt.html
		'@vueuse/nuxt', // https://vueuse.org/
		'@nuxt/icon', // https://github.com/nuxt-modules/icon
		'@nuxtjs/i18n',
	],

	i18n: {
		locales: [
			{ code: 'vi', file: 'vi.json' },
			{ code: 'en', file: 'en.json' },
			{ code: 'ja', file: 'ja.json' },
		],
		lazy: true,
		langDir: 'locales',
		defaultLocale: 'vi',
		strategy: 'no_prefix', // Or 'prefix_except_default' as per preference. 'no_prefix' for SPA is often simpler if language is state-based, but URL-based is better for SEO. Let's use 'no_prefix' effectively for this internal tool or 'prefix_except_default'. Plan says 'VN default'. Let's stick to simple first.
		// Actually, plan says "switch lang /vi -> VN text", imply URL prefix? 
		// "VN default, JA/EN ready". "switch lang /vi". 
		// strategy: 'prefix_except_default' is best.
		strategy: 'prefix_except_default',
		detectBrowserLanguage: false,
		vueI18n: './i18n.config.ts' // Optional, or inline. Let's start with basic.
	},

	experimental: {
		componentIslands: true,
		asyncContext: true, // https://nuxt.com/docs/guide/going-further/experimental-features#asynccontext
	},

	runtimeConfig: {
		// Private runtime config (server-side only)
		agentData: {
			apiKey: process.env.AGENT_DATA_API_KEY || '',
		},
		// Public runtime config (exposed to client)
		public: {
			siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
			directusUrl: process.env.NUXT_PUBLIC_DIRECTUS_URL || process.env.DIRECTUS_URL || 'http://localhost:8055', // Added directusUrl
			firebase: {
				apiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY,
				authDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
				projectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID,
				storageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
				messagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
				appId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID,
				measurementId: process.env.NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
			},
			directus: {
				url: process.env.NUXT_PUBLIC_DIRECTUS_URL || process.env.DIRECTUS_URL || 'http://localhost:8055',
				nuxtBaseUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
			},
			agentData: {
				baseUrl: process.env.NUXT_PUBLIC_AGENT_DATA_BASE_URL || '',
				enabled: process.env.NUXT_PUBLIC_AGENT_DATA_ENABLED === 'true',
			},
		},
	},

	// Directus module configuration
	directus: {
		rest: {
			baseUrl: process.env.NUXT_PUBLIC_DIRECTUS_URL || process.env.DIRECTUS_URL || 'http://localhost:8055',
			nuxtBaseUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
		},
		auth: {
			enabled: true,
			enableGlobalAuthMiddleware: false,
			userFields: ['*', { contacts: ['*'] }],
			redirect: {
				login: '/auth/signin',
				logout: '/',
				home: '/portal',
				resetPassword: '/auth/reset-password',
				callback: '/auth/callback',
			},
		},
	},

	typescript: {
		strict: false,
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
			baseURL: `${process.env.NUXT_PUBLIC_DIRECTUS_URL || process.env.DIRECTUS_URL}/assets/`,
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
		enabled: false,
		defaults: {
			component: 'OgImageTemplate',
			width: 1200,
			height: 630,
		},
		// @TODO: Fix font families for OG Image
		// fonts: formatFonts(fontFamilies),
	},

	// Sitemap Configuration - https://nuxtseo.com/sitemap/getting-started/how-it-works
	sitemap: {
		sources: ['/api/_sitemap-urls'],
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
