#!/usr/bin/env bash
# sync-skills.sh — Detect changes between openclaw skills and IntentGuard skills
#
# Usage: ./scripts/sync-skills.sh [--copy] [--force]
#   --copy   Copy changed files (default: dry-run)
#   --force  Overwrite even if IntentGuard version is newer

set -euo pipefail

OPENCLAW_SKILLS="/Users/thetadriven/github/thetadrivencoach/openclaw/skills"
INTENTGUARD_SKILLS="$(cd "$(dirname "$0")/.." && pwd)/src/skills"
REGISTRY="${INTENTGUARD_SKILLS}/registry.json"

COPY=false
FORCE=false
for arg in "$@"; do
  case "$arg" in
    --copy) COPY=true ;;
    --force) FORCE=true ;;
  esac
done

# Skills that originated from openclaw
PORTED_SKILLS=(
  "claude-flow-bridge"
  "voice-memo-reactor"
  "thetasteer-categorize"
  "llm-controller"
  "system-control"
  "tesseract-trainer"
)

echo "=== IntentGuard Skill Sync ==="
echo "OpenClaw: ${OPENCLAW_SKILLS}"
echo "IntentGuard: ${INTENTGUARD_SKILLS}"
echo ""

changed=0
synced=0
missing=0

for skill in "${PORTED_SKILLS[@]}"; do
  oc_file="${OPENCLAW_SKILLS}/${skill}.ts"
  ig_file="${INTENTGUARD_SKILLS}/${skill}.ts"

  if [ ! -f "$oc_file" ]; then
    echo "  SKIP  ${skill} — not found in openclaw"
    continue
  fi

  if [ ! -f "$ig_file" ]; then
    echo "  MISS  ${skill} — not yet ported to IntentGuard"
    ((missing++))
    if $COPY; then
      cp "$oc_file" "$ig_file"
      # Fix import path
      sed -i '' 's|from "../src/types.js"|from "../types.js"|g' "$ig_file"
      echo "        → copied + fixed imports"
      ((synced++))
    fi
    continue
  fi

  # Compare hashes (ignoring import path differences)
  oc_hash=$(sed 's|from "../src/types.js"|from "../types.js"|g' "$oc_file" | md5 -q)
  ig_hash=$(md5 -q "$ig_file")

  if [ "$oc_hash" = "$ig_hash" ]; then
    echo "  OK    ${skill} — in sync"
  else
    echo "  DIFF  ${skill} — openclaw differs from IntentGuard"
    ((changed++))

    if $COPY; then
      if $FORCE; then
        cp "$oc_file" "$ig_file"
        sed -i '' 's|from "../src/types.js"|from "../types.js"|g' "$ig_file"
        echo "        → overwritten (--force)"
        ((synced++))
      else
        # Check which is newer
        oc_mtime=$(stat -f %m "$oc_file")
        ig_mtime=$(stat -f %m "$ig_file")
        if [ "$oc_mtime" -gt "$ig_mtime" ]; then
          cp "$oc_file" "$ig_file"
          sed -i '' 's|from "../src/types.js"|from "../types.js"|g' "$ig_file"
          echo "        → updated (openclaw is newer)"
          ((synced++))
        else
          echo "        → skipped (IntentGuard is newer, use --force to overwrite)"
        fi
      fi
    fi
  fi
done

echo ""
echo "Summary: ${changed} changed, ${missing} missing, ${synced} synced"

# Update registry hashes if any were synced
if [ $synced -gt 0 ]; then
  echo ""
  echo "Updating registry hashes..."
  for skill in "${PORTED_SKILLS[@]}"; do
    ig_file="${INTENTGUARD_SKILLS}/${skill}.ts"
    if [ -f "$ig_file" ]; then
      new_hash=$(md5 -q "$ig_file")
      # Update hash in registry.json using python (portable)
      python3 -c "
import json, sys
with open('${REGISTRY}') as f: reg = json.load(f)
if '${skill}' in reg['skills']:
    reg['skills']['${skill}']['hash'] = '${new_hash}'
    reg['skills']['${skill}']['lastSync'] = '$(date -u +%Y-%m-%dT%H:%M:%SZ)'
with open('${REGISTRY}', 'w') as f: json.dump(reg, f, indent=2)
" 2>/dev/null || true
    fi
  done
  echo "Registry updated."
fi
