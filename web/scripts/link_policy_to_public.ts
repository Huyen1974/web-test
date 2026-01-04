/**
 * Link Public Access E1v2 policy to Public role
 */

const API_URL = process.env.DIRECTUS_URL || "https://directus-test-812872501910.asia-southeast1.run.app";

async function main() {
	// Login
	const email = process.env.DIRECTUS_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
	const password = process.env.DIRECTUS_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

	const loginRes = await fetch(`${API_URL}/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, password })
	});
	const { data } = await loginRes.json();
	const token = data.access_token;

	const publicRoleId = '728b6b9b-a902-47d1-85fa-e7188ed2b78b';
	const policyId = 'bb3bb45f-e962-4ad9-b6c6-747f4e616f8c';

	console.log('Creating access record to link Public role to policy...');

	// Check if access record already exists
	const checkAccessRes = await fetch(`${API_URL}/access?filter[role][_eq]=${publicRoleId}&filter[policy][_eq]=${policyId}`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	const checkAccess = await checkAccessRes.json();

	if (checkAccess.data && checkAccess.data.length > 0) {
		console.log('ℹ️  Access record already exists');
	} else {
		// Create new access record
		const createAccessRes = await fetch(`${API_URL}/access`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				role: publicRoleId,
				policy: policyId
			})
		});

		if (createAccessRes.ok) {
			console.log('✅ Access record created successfully');
		} else {
			const error = await createAccessRes.text();
			console.error('❌ Failed to create access record:', error);
			console.log('\nTrying direct policy update instead...');

			// Alternative: Try updating the policy's roles array directly
			const policyRes = await fetch(`${API_URL}/policies/${policyId}`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			const policy = await policyRes.json();
			const currentRoles = policy.data.roles || [];

			if (!currentRoles.includes(publicRoleId)) {
				const updatedRoles = [...currentRoles, publicRoleId];

				const updatePolicyRes = await fetch(`${API_URL}/policies/${policyId}`, {
					method: 'PATCH',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ roles: updatedRoles })
				});

				if (!updatePolicyRes.ok) {
					console.error('❌ Also failed to update policy directly');
					process.exit(1);
				} else {
					console.log('✅ Updated policy roles directly');
				}
			}
		}
	}

	// Test access
	console.log('\nTesting anonymous access to globals...');
	const testRes = await fetch(`${API_URL}/items/globals`);
	console.log('Status:', testRes.status);
	if (testRes.ok) {
		console.log('✅ Globals accessible!');
		const data = await testRes.json();
		console.log('Data:', JSON.stringify(data, null, 2));
	} else {
		const error = await testRes.text();
		console.log('❌ Still forbidden:', error);
		process.exit(1);
	}
}

main().catch(console.error);
