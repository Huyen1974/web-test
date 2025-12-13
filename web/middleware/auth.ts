import { onAuthStateChanged } from 'firebase/auth';

export default defineNuxtRouteMiddleware(async (to, from) => {
    // Only run on client-side for SPA
    if (process.server) return;

    const { $auth } = useNuxtApp();

    const getCurrentUser = () => {
        return new Promise((resolve, reject) => {
            const unsubscribe = onAuthStateChanged($auth, (user) => {
                unsubscribe();
                resolve(user);
            }, reject);
        });
    };

    const user = await getCurrentUser();

    // If user is not logged in and trying to access portal, redirect to login
    if (!user && to.path.startsWith('/portal')) {
        return navigateTo({
            path: '/login',
            query: {
                redirect: to.fullPath,
            },
        });
    }

    // If user is logged in and trying to access login/register, redirect to portal (optional but good UX)
    if (user && (to.path === '/login' || to.path === '/register')) {
        return navigateTo('/portal');
    }
});
