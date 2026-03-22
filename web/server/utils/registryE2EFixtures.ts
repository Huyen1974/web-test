export interface RegistryHealthFixture {
	collections: Array<{
		collection_name: string;
		noi_chua: number;
		noi_sinh: number;
		gap: number;
		status: 'KHOP' | 'ORPHAN' | 'PHANTOM';
	}>;
	totals: {
		khop: number;
		orphan: number;
		phantom: number;
		totalGap: number;
	};
	cachedAt: string;
}

export interface RegistryUnmanagedFixture {
	collections: Array<{
		collection_name: string;
		governance_role: 'observed' | 'excluded';
	}>;
	totals: {
		observed: number;
		excluded: number;
		total: number;
	};
	cachedAt: string;
}

export function isRegistryE2EFixtureMode() {
	return process.env.REGISTRY_E2E_FIXTURES === '1' || process.env.REGISTRY_E2E_FIXTURES === 'true';
}

export const registryHealthFixture: RegistryHealthFixture = {
	collections: [
		{ collection_name: 'entity_species', noi_chua: 33, noi_sinh: 33, gap: 0, status: 'KHOP' },
		{ collection_name: 'materials_registry', noi_chua: 48, noi_sinh: 48, gap: 0, status: 'KHOP' },
		{ collection_name: 'product_registry', noi_chua: 21, noi_sinh: 21, gap: 0, status: 'KHOP' },
	],
	totals: {
		khop: 3,
		orphan: 0,
		phantom: 0,
		totalGap: 0,
	},
	cachedAt: 'fixture',
};

export const registryUnmanagedFixture: RegistryUnmanagedFixture = {
	collections: [
		{ collection_name: 'observed_registry', governance_role: 'observed' },
		{ collection_name: 'legacy_registry', governance_role: 'excluded' },
	],
	totals: {
		observed: 1,
		excluded: 1,
		total: 2,
	},
	cachedAt: 'fixture',
};
