#!/usr/bin/env bash
# Updates local screenshot baselines from a GitHub Actions artifact.
#
# Usage:
#   GITHUB_TOKEN=<token> ./scripts/update-screenshots.sh [run-id]
#
# If run-id is omitted, the latest failed vitest run on the current branch is used.
#
# Requires: curl, jq, unzip

set -euo pipefail

REPO="MichaelKohler/tv-tracker"
ARTIFACT_NAME="vitest-screenshot-failures"
SCREENSHOTS_DIR="app/components/__screenshots__"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "Error: GITHUB_TOKEN environment variable is required" >&2
  exit 1
fi

for cmd in curl jq unzip; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Error: '$cmd' is required but not found" >&2
    exit 1
  fi
done

api() {
  curl -fsSL \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "$@"
}

if [[ -n "${1:-}" ]]; then
  RUN_ID="$1"
  echo "Using provided run ID: $RUN_ID"
else
  BRANCH="$(git rev-parse --abbrev-ref HEAD)"
  echo "Querying latest failed vitest run on branch: $BRANCH"

  RUN_ID="$(api "https://api.github.com/repos/$REPO/actions/runs?branch=$BRANCH&status=failure&per_page=10" \
    | jq -r '.workflow_runs[] | select(.name == "🚀 Test") | .id' \
    | head -1)"

  if [[ -z "$RUN_ID" ]]; then
    echo "Error: No failed test run found for branch '$BRANCH'" >&2
    exit 1
  fi
  echo "Found run ID: $RUN_ID"
fi

echo "Fetching artifacts for run $RUN_ID..."
ARTIFACT_ID="$(api "https://api.github.com/repos/$REPO/actions/runs/$RUN_ID/artifacts" \
  | jq -r --arg name "$ARTIFACT_NAME" '.artifacts[] | select(.name == $name) | .id' \
  | head -1)"

if [[ -z "$ARTIFACT_ID" ]]; then
  echo "Error: No artifact named '$ARTIFACT_NAME' found in run $RUN_ID" >&2
  echo "Available artifacts:" >&2
  api "https://api.github.com/repos/$REPO/actions/runs/$RUN_ID/artifacts" \
    | jq -r '.artifacts[].name' >&2
  exit 1
fi

echo "Downloading artifact $ARTIFACT_ID..."
DOWNLOAD_URL="https://api.github.com/repos/$REPO/actions/artifacts/$ARTIFACT_ID/zip"
curl -fsSL \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  -L "$DOWNLOAD_URL" \
  -o "$TMP_DIR/artifact.zip"

echo "Extracting artifact..."
unzip -q "$TMP_DIR/artifact.zip" -d "$TMP_DIR/extracted"

echo "Mapping and copying screenshots..."
UPDATED=0
SKIPPED=0

while IFS= read -r -d '' src; do
  rel="${src#$TMP_DIR/extracted/}"

  # Only process actual screenshots (files containing "-actual-" in their name)
  filename="$(basename "$rel")"
  if [[ "$filename" != *"-actual-"* ]]; then
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # Remove "-actual" from the filename
  # e.g. header-actual-chromium-linux.png → header-chromium-linux.png
  new_filename="${filename/-actual-/-}"

  # The artifact path is: app/components/<test-file>/<name>-actual-<browser>-linux.png
  # Target path should be: app/components/__screenshots__/<test-file>/<name>-<browser>-linux.png
  dir_part="$(dirname "$rel")"
  # Insert __screenshots__ after "app/components"
  target_dir="${SCREENSHOTS_DIR}/$(basename "$dir_part")"
  target="$target_dir/$new_filename"

  mkdir -p "$target_dir"
  cp "$src" "$target"
  echo "  Updated: $target"
  UPDATED=$((UPDATED + 1))
done < <(find "$TMP_DIR/extracted" -name "*.png" -print0)

echo ""
echo "Done. Updated $UPDATED screenshot(s), skipped $SKIPPED file(s)."
