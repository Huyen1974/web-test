/**
 * GET /api/registry/system-issues-subgroups?issue_class=render_fault
 *
 * Returns Layer 3 sub_class breakdown for a given issue_class.
 * Used by Layer 3 page. Điều 31 §IV.6-B.
 */

const SUB_CLASS_LABELS: Record<string, string> = {
	orphan_dep_target: 'Dependency trỏ đến entity đã xoá',
	orphan_dep_source: 'Dependency từ entity đã xoá',
	missing_registry_config: 'Thiếu config Layer 2',
	stale_check: 'Check cũ (đã thay thế)',
	no_dependencies: 'Entity chưa có quan hệ',
	missing_identifier: 'Thiếu mã định danh',
	catalog_incomplete: 'Catalog thiếu thông tin',
	count_drift: 'Sai lệch số đếm',
	cascade_failure: 'Cascade failure',
	runner_liveness: 'WATCHDOG — runner sống',
	unclassified: 'Chưa phân loại',
};

export default defineEventHandler(async (event) => {
	const query = getQuery(event);
	const issueClass = String(query.issue_class || '');

	if (!issueClass) {
		throw createError({ statusCode: 400, message: 'issue_class query param required' });
	}

	const config = useRuntimeConfig();
	const baseUrl = config.directusInternalUrl || config.public?.directusUrl || 'https://directus.incomexsaigoncorp.vn';
	const token = config.directusServiceToken || process.env.NUXT_DIRECTUS_SERVICE_TOKEN;

	if (!token) {
		return { issue_class: issueClass, sub_groups: [], totals: { all: 0, critical: 0, warning: 0 } };
	}

	const headers = { Authorization: `Bearer ${token}` };

	try {
		const [bySubClass, bySeverity] = await Promise.all([
			$fetch<any>(`${baseUrl}/items/system_issues`, {
				params: {
					'filter[issue_class][_eq]': issueClass,
					'groupBy[]': ['sub_class', 'severity'],
					'aggregate[count]': '*',
				},
				headers,
			}),
			$fetch<any>(`${baseUrl}/items/system_issues`, {
				params: {
					'filter[issue_class][_eq]': issueClass,
					'groupBy[]': 'severity',
					'aggregate[count]': '*',
				},
				headers,
			}),
		]);

		// Build sub_class groups with severity breakdown
		const groupMap = new Map<string, { count: number; critical: number; warning: number }>();
		for (const row of (bySubClass?.data || [])) {
			const sc = row.sub_class || 'unclassified';
			const sev = (row.severity || '').toUpperCase();
			const cnt = Number(row.count?.['*'] ?? row.count ?? 0);
			if (!groupMap.has(sc)) groupMap.set(sc, { count: 0, critical: 0, warning: 0 });
			const g = groupMap.get(sc)!;
			g.count += cnt;
			if (sev === 'CRITICAL') g.critical += cnt;
			else if (sev === 'WARNING') g.warning += cnt;
		}

		const subGroups = Array.from(groupMap.entries())
			.map(([sc, g]) => ({
				sub_class: sc,
				label: SUB_CLASS_LABELS[sc] || sc.replace(/_/g, ' '),
				count: g.count,
				critical: g.critical,
				warning: g.warning,
				severity_max: g.critical > 0 ? 'critical' : g.warning > 0 ? 'warning' : 'info',
			}))
			.sort((a, b) => b.count - a.count);

		// Totals
		let totalAll = 0, totalCritical = 0, totalWarning = 0;
		for (const s of (bySeverity?.data || [])) {
			const cnt = Number(s.count?.['*'] ?? s.count ?? 0);
			totalAll += cnt;
			if ((s.severity || '').toUpperCase() === 'CRITICAL') totalCritical = cnt;
			else if ((s.severity || '').toUpperCase() === 'WARNING') totalWarning = cnt;
		}

		return {
			issue_class: issueClass,
			sub_groups: subGroups,
			totals: { all: totalAll, critical: totalCritical, warning: totalWarning },
		};
	} catch (e) {
		return { issue_class: issueClass, sub_groups: [], totals: { all: 0, critical: 0, warning: 0 }, error: String(e) };
	}
});
