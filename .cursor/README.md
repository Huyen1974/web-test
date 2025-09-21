# Cursor Command Helpers

This directory hosts wrappers that make it easier to call the Agent Data APIs from within Cursor.

## Available commands

| Command | Description | Under the hood |
|---------|-------------|----------------|
| `@save_report <file_path> [--title <title>] [--parent <id>] [--visible]` | Uploads a local Markdown/JSON report through the create document API. | Executes `.cursor/commands/save_report.sh`, which forwards to `tools/save_report.sh`. |
| `@move_document <doc_id> --to <new_parent_id> [--base-url <url>] [--dry-run]` | Moves a document to a new parent in the knowledge tree. | Executes `.cursor/commands/move_document.sh`, which posts to `POST /documents/{doc_id}/move`. |

> Cursor's chat UI treats commands prefixed with `@` as shortcuts. When running from a shell, invoke the scripts directly (e.g. `.cursor/commands/move_document.sh ...`).

## Usage from a shell session

1. Ensure the environment is configured:
   - `AGENT_DATA_API_KEY` (required; if missing, the scripts will attempt to read it from Secret Manager via `gcloud`).
   - `AGENT_DATA_BASE_URL` (optional; defaults to `http://localhost:8000`).
   - `AGENT_DATA_PARENT_ID`, `AGENT_DATA_REPORT_TAGS` (optional for `@save_report`).

2. Call the wrapper scripts, for example:
   ```bash
   ./.cursor/commands/save_report.sh reports/week42.md --title "Week 42" --visible
   ./.cursor/commands/move_document.sh doc-abc --to folder-root
   ```
   The scripts return non-zero exit codes (and print diagnostic JSON) if the API rejects the request.

3. For automation in Cursor chat, define a custom command pointing to the wrapper script (see `.cursor/commands.yaml`).

### Dry-run support

Append `--dry-run` to `@move_document` to print the generated `curl` call without mutating data. This is helpful for validating configuration in CI or during onboarding.

### Dependencies

- `curl`
- `python3`
- optional `gcloud` (only needed if the API key is retrieved from Secret Manager)
