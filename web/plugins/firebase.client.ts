import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

export default defineNuxtPlugin((nuxtApp) => {
    const config = useRuntimeConfig();

    const hasFirebaseConfig = Boolean(
        config.public.firebase.apiKey &&
            config.public.firebase.authDomain &&
            config.public.firebase.projectId,
    );

    if (!hasFirebaseConfig) {
        if (import.meta.dev) {
            // eslint-disable-next-line no-console
            console.warn('[Firebase] Missing config; skipping initialization.');
        }

        return {
            provide: {
                auth: null,
                firebaseApp: null,
            },
        };
    }

    const firebaseConfig = {
        apiKey: config.public.firebase.apiKey,
        authDomain: config.public.firebase.authDomain,
        projectId: config.public.firebase.projectId,
        storageBucket: config.public.firebase.storageBucket,
        messagingSenderId: config.public.firebase.messagingSenderId,
        appId: config.public.firebase.appId,
        measurementId: config.public.firebase.measurementId
    };

    const apps = getApps();
    const firebaseApp = apps.length === 0 ? initializeApp(firebaseConfig) : apps[0];
    const auth = getAuth(firebaseApp);

    return {
        provide: {
            auth,
            firebaseApp
        }
    }
});
