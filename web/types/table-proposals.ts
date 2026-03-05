/**
 * Type definitions for table_proposals collection (TABLE-MODULE-V2)
 * Schema created by dot-schema-table-proposals-ensure v1.0.0
 */

export type ProposalType = 'add_row' | 'add_column' | 'modify' | 'delete';
export type PositionType = 'row' | 'column';
export type ProposalStatus = 'draft' | 'reviewing' | 'approved' | 'applied' | 'rejected';

export interface TableProposal {
	id: number;
	source_collection: string;
	proposal_type: ProposalType;
	position_type: PositionType;
	position_index: number;
	position_context?: string | null;
	description: string;
	status: ProposalStatus;
	user_created?: string | null;
	date_created?: string;
}

export const PROPOSAL_TYPE_LABELS: Record<ProposalType, string> = {
	add_row: 'Thêm hàng',
	add_column: 'Thêm cột',
	modify: 'Sửa đổi',
	delete: 'Xóa',
};

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
	draft: 'Nháp',
	reviewing: 'Đang xem xét',
	approved: 'Đã duyệt',
	applied: 'Đã áp dụng',
	rejected: 'Từ chối',
};
