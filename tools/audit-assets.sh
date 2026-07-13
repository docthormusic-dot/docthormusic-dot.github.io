#!/bin/sh
# Deployment asset audit — fails (exit 1) if the published tree contains
# source/master formats, archives, oversized files, suspicious filenames,
# or media outside approved directories. Rules: tools/audit-rules.conf
# Run locally from the repo root:  sh tools/audit-assets.sh
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONF="$ROOT/tools/audit-rules.conf"
FAIL=0

get() { grep "^$1=" "$CONF" | head -1 | cut -d= -f2-; }
EXTS="$(get BLOCKED_EXTENSIONS | tr ',' '|')"
NAMES="$(get BLOCKED_NAME_PATTERNS | tr ',' '|')"
MAXMB="$(get MAX_FILE_MB)"
MEDIA_DIRS="$(get APPROVED_MEDIA_DIRS)"

report() { # path rule detail
  SIZE=$(ls -l "$1" | awk '{printf "%.1f MB", $5/1048576}')
  TYPE="${1##*.}"
  echo "AUDIT FAIL: $1"
  echo "  type: .$TYPE   size: $SIZE   rule: $2 $3"
  FAIL=1
}

cd "$ROOT"
# 1. blocked extensions
find . -path ./.git -prune -o -type f -print | while read -r f; do
  ext=$(echo "${f##*.}" | tr '[:upper:]' '[:lower:]')
  echo "$ext" | grep -qE "^($EXTS)$" && report "$f" "blocked-extension" "(.$ext is a source/master/archive format)"
  base=$(basename "$f" | tr '[:upper:]' '[:lower:]')
  echo "$base" | grep -qE "($NAMES)" && report "$f" "suspicious-filename" "(matches private-file naming pattern)"
  true
done > /tmp/audit_part1.log
grep -q "AUDIT FAIL" /tmp/audit_part1.log && { cat /tmp/audit_part1.log; FAIL=1; }

# 2. oversized files
find . -path ./.git -prune -o -type f -size +"$MAXMB"M -print | while read -r f; do
  report "$f" "max-size" "(over ${MAXMB} MB)"
done > /tmp/audit_part2.log
grep -q "AUDIT FAIL" /tmp/audit_part2.log && { cat /tmp/audit_part2.log; FAIL=1; }

# 3. media outside approved directories
find . -path ./.git -prune -o -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.webp" -o -iname "*.mp4" -o -iname "*.webm" -o -iname "*.woff2" \) -print | grep -vE "^\./($MEDIA_DIRS)/" | while read -r f; do
  report "$f" "media-outside-approved-dirs" "(expected under: $MEDIA_DIRS/)"
done > /tmp/audit_part3.log
grep -q "AUDIT FAIL" /tmp/audit_part3.log && { cat /tmp/audit_part3.log; FAIL=1; }

if [ "$FAIL" -eq 0 ]; then
  echo "Asset audit passed: no source files, archives, oversized files or misplaced media."
  exit 0
fi
exit 1
