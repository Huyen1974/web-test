<script setup lang="ts">
const { theme, globals } = useAppConfig();

const {
	data: navigation,
	pending,
	error,
} = await useAsyncData(
	'mainNavigation',
	() => {
		return useDirectus(
			readItem('navigation', 'main', {
				fields: [
					{
						items: [
							'id',
							'has_children',
							'title',
							'icon',
							'label',
							'type',
							'url',
							{
								page: ['permalink', 'title'],
								children: [
									'id',
									'title',
									'has_children',
									'icon',
									'label',
									'type',
									'url',
									{
										page: ['permalink', 'title'],
									},
								],
							},
						],
					},
				],
			}),
		);
	},
	{
		transform: (data) => data,
	},
);

const knowledgeNavItem = {
	id: 'knowledge-nav-static',
	has_children: false,
	icon: 'menu_book',
	label: null,
	type: 'url',
	url: '/knowledge',
	title: 'Knowledge',
};

const modulesNavItem = {
	id: 'modules-nav-static',
	has_children: false,
	icon: 'view_module',
	label: null,
	type: 'url',
	url: '/knowledge/modules',
	title: 'Modules',
};

const tasksNavItem = {
	id: 'tasks-nav-static',
	has_children: false,
	icon: 'task_alt',
	label: null,
	type: 'url',
	url: '/knowledge/current-tasks',
	title: 'Tasks',
};

const workflowNavItem = {
	id: 'workflow-nav-static',
	has_children: false,
	icon: 'account_tree',
	label: null,
	type: 'url',
	url: '/knowledge/workflows',
	title: 'Workflows',
};

const registriesNavItem = {
	id: 'registries-nav-static',
	has_children: false,
	icon: 'inventory_2',
	label: null,
	type: 'url',
	url: '/knowledge/registries',
	title: 'Registries',
};

const staticNavItems = [knowledgeNavItem, modulesNavItem, tasksNavItem, workflowNavItem, registriesNavItem];

const navigationItems = computed(() => {
	const items = [...(navigation.value?.items || [])];

	for (const navItem of staticNavItems) {
		const alreadyPresent = items.some((item: any) => item?.url === navItem.url || item?.title === navItem.title);
		if (!alreadyPresent) {
			items.push(navItem);
		}
	}

	return items;
});

const navigationWithWorkflows = computed(() => {
	if (!navigation.value) return null;

	return {
		...navigation.value,
		items: navigationItems.value,
	};
});
</script>
<template>
	<header class="relative w-full mx-auto space-y-4 md:flex md:items-center md:space-y-0 md:gap-x-4">
		<div class="flex items-center bg-gray-900 justify-between py-2 px-6 md:flex-1 rounded-card">
			<NuxtLink href="/" class="py-2">
				<Logo class="h-6 text-white" />
				<span v-if="globals?.title" class="sr-only">{{ globals.title }}</span>
			</NuxtLink>
			<nav class="hidden md:flex md:space-x-4 lg:space-x-6" aria-label="Global">
				<NavigationMenuItem v-for="item in navigationItems" :key="item.id" :item="item" />
			</nav>
			<div class="flex items-center justify-end flex-shrink-0 space-x-2">
				<DarkModeToggle class="hidden text-gray-200 md:block hover:text-gray-400" bg="dark" />
			</div>
		</div>

		<div class="hidden h-full gap-4 md:flex">
			<UButton to="/contact-us" color="primary" size="xl">Let's Talk</UButton>
			<UButton to="/auth/signin" color="primary" variant="ghost" size="xl">Login</UButton>
		</div>
		<NavigationMobileMenu v-if="navigationWithWorkflows" :navigation="navigationWithWorkflows" />
	</header>
</template>
