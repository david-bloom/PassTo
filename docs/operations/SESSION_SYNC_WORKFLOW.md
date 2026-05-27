# PassTo Session Sync Workflow

GitHub is the canonical PassTo workspace.

The local folder is only a working mirror. At the start and end of each Codex or Claude session, update local files from GitHub before reading status, task files, PRD files, or architecture docs.

## Standard Rule

Run:

```bash
bash scripts/sync-from-github.sh
```

## What The Script Does

- If the local folder is a git checkout, it runs a fast-forward pull from `origin/main`.
- If the local folder is not a git checkout, it clones `david-bloom/PassTo` into a temporary directory and copies GitHub files into the local folder.
- It preserves local-only legacy files instead of deleting them.

## Session Start

1. Sync from GitHub.
2. Read task status from the synced files.
3. Treat GitHub as canonical if local files conflict with David's stated GitHub state.

## Session End

1. Sync from GitHub again.
2. Confirm the next task from synced GitHub files.
3. State whether local files were updated successfully.

## One-Time Cleanup Recommendation

The best long-term fix is to replace the current local folder with a real git checkout of `david-bloom/PassTo`. Until that is done, the script provides a safe mirror update without deleting local-only legacy files.
