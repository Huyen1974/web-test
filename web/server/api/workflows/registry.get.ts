import { getQuery } from 'h3';
import { getWorkflowStepCounts, listWorkflowRecords } from '~/server/utils/directusService';

export default defineEventHandler(async (event) => {
	const query = getQuery(event);
	const page = Math.max(1, Number(query.page || 1));
	const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 25)));
	const offset = (page - 1) * pageSize;
	const search = typeof query.search === 'string' ? query.search : undefined;
	const status = typeof query.status === 'string' ? query.status : null;
	const level = query.level ? Number(query.level) : null;

	const items = await listWorkflowRecords({
		limit: pageSize + 1,
		offset,
		search,
		status,
		level: Number.isFinite(level) ? level : null,
	});

	const hasNextPage = items.length > pageSize;
	const pagedItems = items.slice(0, pageSize);
	const workflowIds = pagedItems.map((item) => item.id);
	const stepRows = await getWorkflowStepCounts(workflowIds);

	const stepCountByWorkflow = stepRows.reduce<Record<number, number>>((counts, row) => {
		counts[row.workflow_id] = (counts[row.workflow_id] || 0) + 1;
		return counts;
	}, {});

	return {
		items: pagedItems.map((item) => ({
			...item,
			stepCount: stepCountByWorkflow[item.id] || 0,
		})),
		page,
		pageSize,
		hasNextPage,
	};
});
