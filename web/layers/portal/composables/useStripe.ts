import { loadStripe } from '@stripe/stripe-js';
import type { Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

// Create the Stripe instance
const getStripe = (stripePublishableKey: string) => {
	if (!stripePromise) {
		stripePromise = loadStripe(stripePublishableKey);
	}

	return stripePromise;
};

export default function useStripe() {
	const toast = useToast();

	const runtimeConfig = useRuntimeConfig();

	const { stripePublishableKey } = runtimeConfig.public;

	const loading = ref<boolean>(false);
	const backendUnavailable = !stripePublishableKey;

	// Create a Checkout Session and redirect to the Checkout page
	const handleCheckout = async (invoiceId: string) => {
		loading.value = true;

		try {
			if (backendUnavailable) {
				throw createError('Payments are disabled in this SPA build.');
			}

			const stripe = await getStripe(stripePublishableKey);

			if (!stripe) {
				throw createError('Problem loading payment processor');
			}

			throw createError('Checkout session endpoint is unavailable.');
		} catch (error) {
			toast.add({
				id: 'stripe-checkout-error',
				title: 'Oops! Something went wrong.',
				description: (error as any).data.message ?? 'An unexpected error occurred.',
				color: 'red',
				icon: 'material-symbols:warning-outline-rounded',
			});
		} finally {
			loading.value = false;
		}
	};

	// Create a Customer Portal session and redirect to the Customer Portal page
	async function getPortalLink(customerId: string) {
		loading.value = true;

		try {
			throw createError('Customer portal is disabled in this SPA build.');
		} catch (error) {
			toast.add({
				id: 'stripe-portal-error',
				title: 'Oops! Something went wrong.',
				description: (error as any).data.message ?? 'An unexpected error occurred.',
				color: 'red',
				icon: 'material-symbols:warning-outline-rounded',
			});
		}
	}

	return {
		loading,
		handleCheckout,
		getPortalLink,
	};
}
