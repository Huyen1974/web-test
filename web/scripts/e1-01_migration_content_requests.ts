/**
 * Wrapper for Task E1-01 content_requests migration script.
 * Keeps the canonical implementation in /scripts while providing a web/scripts entrypoint.
 */

import { runContentRequestsMigration } from '../../scripts/e1-01_migration_content_requests';

runContentRequestsMigration().catch((error) => {
	console.error('\n❌ Migration failed:', error instanceof Error ? error.message : String(error));
	process.exit(1);
});
