#!/usr/bin/env bash
set -euo pipefail

# Build the Spool LSP binary for the current or specified platform.
# Usage: ./build.sh [GOOS] [GOARCH]
#
# Called by vscode:prepublish to bundle the binary into the extension.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPOOL_SRC="$(cd "${SPOOL_SRC:-${SCRIPT_DIR}/../Spool}" && pwd)"
GOOS="${1:-$(go env GOOS)}"
GOARCH="${2:-$(go env GOARCH)}"

EXT=""
if [ "$GOOS" = "windows" ]; then
    EXT=".exe"
fi

OUT="${SCRIPT_DIR}/dist/spool${EXT}"

echo "Building spool for ${GOOS}/${GOARCH} → ${OUT}"
mkdir -p "${SCRIPT_DIR}/dist"
cd "$SPOOL_SRC"
GOOS="$GOOS" GOARCH="$GOARCH" CGO_ENABLED=0 go build -ldflags="-s -w" -o "$OUT" ./cmd/spool
echo "Done: $(ls -lh "$OUT" | awk '{print $5}')"
