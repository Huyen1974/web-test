-- ==============================================================================
-- Task 0047C: Schema Migration Proposal
-- Author: Antigravity (Gemini 3.x)
-- Date: 2025-12-04
-- Target Table: knowledge_documents
--
-- WARNING: DO NOT EXECUTE DIRECTLY.
-- This file is for Claude/Codex review only as part of Task 0047C.
--
-- Purpose:
-- Add fields and indexes required for Content Versioning & Approval Workflow
-- as defined in reports/0047a_versioning_design.md.
-- ==============================================================================

-- 1. Add Workflow & Versioning Fields
-- Note: Using CHAR(36) for UUIDs as per standard Directus/MySQL practice.
-- Note: Using TINYINT(1) for Boolean.

ALTER TABLE `knowledge_documents`
    ADD COLUMN `workflow_status` VARCHAR(32) NOT NULL DEFAULT 'draft' COMMENT 'Current workflow state: draft, under_review, approved, published, archived',
    ADD COLUMN `version_group_id` CHAR(36) NOT NULL COMMENT 'Groups all versions of the same logical document',
    ADD COLUMN `version_number` INT NOT NULL DEFAULT 1 COMMENT 'Sequential version number within the group',
    ADD COLUMN `is_current_version` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'TRUE for the currently active version in the group',
    ADD COLUMN `previous_version_id` CHAR(36) NULL COMMENT 'Links to the previous version in the version chain',
    ADD COLUMN `reviewed_by` CHAR(36) NULL COMMENT 'Editor who reviewed the document',
    ADD COLUMN `reviewed_at` TIMESTAMP NULL COMMENT 'When the document was reviewed',
    ADD COLUMN `approved_by` CHAR(36) NULL COMMENT 'Editor who approved the document',
    ADD COLUMN `approved_at` TIMESTAMP NULL COMMENT 'When the document was approved',
    ADD COLUMN `publisher_id` CHAR(36) NULL COMMENT 'Admin who published the document',
    ADD COLUMN `rejection_reason` TEXT NULL COMMENT 'Reason for rejection',
    ADD COLUMN `purge_after` TIMESTAMP NULL COMMENT 'Scheduled purge timestamp for old revisions';

-- 2. Add Parent-Child Hierarchy Fields

ALTER TABLE `knowledge_documents`
    ADD COLUMN `parent_document_id` CHAR(36) NULL COMMENT 'Points to the parent document for hierarchy',
    ADD COLUMN `child_order` INT NULL COMMENT 'Display order among siblings';

-- 3. Create Indexes for Performance & Query Patterns

-- Index 1: Fetch current published version by taxonomy
CREATE INDEX `idx_current_published`
    ON `knowledge_documents` (`workflow_status`, `is_current_version`, `category`, `language`, `visibility`);

-- Index 2: List version history for a document group
CREATE INDEX `idx_version_history`
    ON `knowledge_documents` (`version_group_id`, `version_number` DESC);

-- Index 3: Find versions pending purge
-- Note: MySQL does not support partial indexes (WHERE clause) in standard CREATE INDEX.
-- We create a standard index on purge_after.
CREATE INDEX `idx_purge_candidates`
    ON `knowledge_documents` (`purge_after`);

-- Index 4: Workflow status for admin dashboards
CREATE INDEX `idx_workflow_dashboard`
    ON `knowledge_documents` (`workflow_status`, `date_updated` DESC);

-- Index 5: User approval tracking
CREATE INDEX `idx_approval_tracking`
    ON `knowledge_documents` (`approved_by`, `approved_at` DESC);

-- Index 6: Parent-Child hierarchy navigation
CREATE INDEX `idx_parent_child_hierarchy`
    ON `knowledge_documents` (`parent_document_id`, `child_order`);

-- ==============================================================================
-- End of Proposal
-- ==============================================================================
