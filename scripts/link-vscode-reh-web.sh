#!/usr/bin/env bash
# Point lib/vscode at the packaged REH-Web tree (has full out/ for browser workbench).
# Prereq (from monorepo vscode-main, Linux x64, ~30–60 min first run):
#   npm run gulp vscode-reh-web-linux-x64

set -euo pipefail
AUTH_DOCEN="$(cd "$(dirname "$0")/.." && pwd)"
STARTU="$(cd "$AUTH_DOCEN/.." && pwd)"
# Gulp emits the packaged REH-Web tree at BUILD_ROOT = dirname(vscode repo), i.e. monorepo root — not under vscode-main/.
BUILT="$STARTU/vscode-reh-web-linux-x64"
ALT="$STARTU/vscode-main/vscode-reh-web-linux-x64"

if [[ ! -f "$BUILT/out/server-main.js" && -f "$ALT/out/server-main.js" ]]; then
	BUILT="$ALT"
fi

if [[ ! -f "$BUILT/out/server-main.js" ]]; then
	echo "Missing $BUILT/out/server-main.js (also checked $ALT)"
	echo "Build it first:"
	echo "  cd $STARTU/vscode-main && npm run gulp vscode-reh-web-linux-x64"
	exit 1
fi

mkdir -p "$AUTH_DOCEN/lib"
ln -sfn "$BUILT" "$AUTH_DOCEN/lib/vscode"
echo "OK: $AUTH_DOCEN/lib/vscode -> $BUILT"
echo "Launch auth-docen with: unset VSCODE_DEV (recommended)."
