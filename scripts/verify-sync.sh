#!/usr/bin/env bash
# Verifies "synchronization complete" per docs/team_charter/AI_COLLABORATION_RULES.md
# (In-Progress Drafts and Branches) instead of relying on a narrated claim.
#
# Checks, against the CURRENT branch's remote tracking ref — not necessarily main,
# since in-progress work on a feature branch is fully sync-compliant on its own:
#   1. Working tree is clean (no uncommitted changes).
#   2. Local HEAD equals the current branch's remote tracking ref.
#   3. Each path given on argv is present in the diff of the latest pushed commit.
#
# Usage: scripts/verify-sync.sh [doc-or-code-path ...]
# Exit 0 = sync verified. Exit 1 = not synced; prints which check failed.

set -euo pipefail

fail() {
  echo "NOT SYNCED: $1" >&2
  exit 1
}

branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$branch" = "HEAD" ]; then
  fail "detached HEAD — not on a branch."
fi

if [ -n "$(git status --porcelain)" ]; then
  fail "working tree is not clean (uncommitted changes present)."
fi

upstream="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"
if [ -z "$upstream" ]; then
  fail "branch '$branch' has no remote tracking ref configured."
fi

git fetch --quiet "$(echo "$upstream" | cut -d/ -f1)" "$branch" 2>/dev/null || true

local_head="$(git rev-parse HEAD)"
remote_head="$(git rev-parse "$upstream")"
if [ "$local_head" != "$remote_head" ]; then
  fail "local HEAD ($local_head) != $upstream ($remote_head)."
fi

if [ "$#" -gt 0 ]; then
  changed_paths="$(git diff --name-only HEAD~1 HEAD 2>/dev/null || true)"
  for path in "$@"; do
    if ! echo "$changed_paths" | grep -qF -- "$path"; then
      fail "expected path not present in the latest commit: $path"
    fi
  done
fi

echo "SYNCED: branch=$branch commit=$local_head upstream=$upstream"
