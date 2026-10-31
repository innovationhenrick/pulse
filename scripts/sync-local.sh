#!/usr/bin/env bash
# Safely synchronises one local branch with its branch on the fork.
#
#   scripts/sync-local.sh                 # current branch
#   scripts/sync-local.sh feat/pt-br
#
# It never resets, force-updates or hides local work. A clean tree is required and the update is fast-forward only.
set -euo pipefail

REMOTE=${PULSE_GIT_REMOTE:-origin}
BRANCH=${1:-}

die() {
  printf 'sync-local: %s\n' "$*" >&2
  exit 1
}

cd "$(git rev-parse --show-toplevel)"

if [ -z "$BRANCH" ]; then
  BRANCH=$(git branch --show-current)
fi
[ -n "$BRANCH" ] || die "detached HEAD; pass a branch name"
[ "$#" -le 1 ] || die "usage: scripts/sync-local.sh [branch]"

git check-ref-format --branch "$BRANCH" >/dev/null || die "invalid branch name: $BRANCH"

if ! git diff --quiet HEAD || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  git status --short --branch >&2
  die "working tree is not clean; commit or move local changes before syncing"
fi

printf 'Fetching %s/%s…\n' "$REMOTE" "$BRANCH"
git fetch --prune "$REMOTE" "$BRANCH"

CURRENT=$(git branch --show-current)
if [ "$CURRENT" != "$BRANCH" ]; then
  if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
    git switch "$BRANCH"
  else
    git switch --track -c "$BRANCH" "$REMOTE/$BRANCH"
  fi
fi

git merge --ff-only "$REMOTE/$BRANCH"
git status --short --branch
