declare function useDirectus(request?: any): any;
declare function useDirectusAuth(): any;
declare function useFiles(): any;
declare function readFolder(id: string | number): Promise<any>;
declare function readFiles(options?: any): Promise<any>;
declare function uploadFiles(files: any, options?: any): Promise<any>;

declare module 'nuxt/schema' {
	interface NuxtConfig {
		directus?: any;
	}

	interface NuxtOptions {
		directus?: any;
	}
}

export {};
