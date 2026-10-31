#!/usr/bin/env bash
# Runs the repository's guarded deployment script on the Pulse VPS.
# The caller supplies SSH authentication (the local agent or GitHub Actions); this script never stores credentials.
set -euo pipefail

HOST=${PULSE_VPS_HOST:-}
PORT=${PULSE_VPS_PORT:-41122}
USER_NAME=${PULSE_VPS_USER:-altlabs}
REMOTE_PATH=${PULSE_VPS_PATH:-/home/altlabs/services/pulse}
BRANCH=${PULSE_VPS_BRANCH:-main}

die() {
  printf 'deploy-vps: %s\n' "$*" >&2
  exit 1
}

[ -n "$HOST" ] || die "PULSE_VPS_HOST is required"
[ -n "$PORT" ] || die "PULSE_VPS_PORT is required"
[ -n "$USER_NAME" ] || die "PULSE_VPS_USER is required"
[ -n "$REMOTE_PATH" ] || die "PULSE_VPS_PATH is required"
[ -n "$BRANCH" ] || die "PULSE_VPS_BRANCH is required"

quote_for_remote_shell() {
  printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"
}

REMOTE_COMMAND="cd $(quote_for_remote_shell "$REMOTE_PATH") && if [ -n \"\$(git status --porcelain --untracked-files=all)\" ]; then echo 'deploy-vps: remote checkout is not clean; review it before deploying' >&2; exit 1; fi && exec ./scripts/deploy.sh --branch $(quote_for_remote_shell "$BRANCH")"

exec ssh \
  -p "$PORT" \
  -o BatchMode=yes \
  -o StrictHostKeyChecking=yes \
  "$USER_NAME@$HOST" \
  "$REMOTE_COMMAND"
