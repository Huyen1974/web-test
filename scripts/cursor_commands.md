# Cursor Custom Commands Cheatsheet

These notes mirror the `.cursor` integration so that CI-triggered path filters include command updates.

## `@save_report`

```bash
@save_report <file_path> [--title <title>] [--parent <parent_id>] [--visible]
```

Wraps `.cursor/commands/save_report.sh` and ultimately calls `tools/save_report.sh` to create a knowledge document. The helper resolves the title (defaulting to the file name) and relies on `AGENT_DATA_API_KEY`.

## `@move_document`

```bash
@move_document <doc_id> --to <new_parent_id> [--base-url <url>] [--dry-run]
```

Delegates to `.cursor/commands/move_document.sh`, which posts to `POST /documents/{doc_id}/move` via `tools/move_document.sh`. Use `--dry-run` to print the generated `curl` command without mutating data.

> For full details see `.cursor/README.md` and `.cursor/commands.yaml`.
