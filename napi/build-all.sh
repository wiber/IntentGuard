#!/usr/bin/env bash
# napi/build-all.sh — build the Node addon for every platform the card is measured on, into napi/dist/:
#   intentguard.darwin-arm64.node   native (this Mac)
#   intentguard.darwin-x64.node     cargo --target x86_64-apple-darwin (runs under Rosetta)
#   intentguard.linux-arm64.node    inside rust:1-bullseye, linux/arm64 (glibc 2.31 — older than Vercel's runtime)
#   intentguard.linux-x64.node      inside rust:1-bullseye, linux/amd64
# The Linux legs need a docker daemon (colima on this Mac). A leg that cannot run prints SKIPPED with the
# reason and the script carries on — a missing file is read downstream as UNMEASURED, never as a pass.
# Build artifacts: napi/dist/ is gitignored and never committed.
set -uo pipefail
cd "$(dirname "$0")"
NAPI="$(pwd)"; ROOT="$(cd .. && pwd)"; DIST="$NAPI/dist"; mkdir -p "$DIST"

if [ "$(uname -s)" = Darwin ]; then
  cargo build --release --target aarch64-apple-darwin >/dev/null 2>&1 \
    && cp target/aarch64-apple-darwin/release/libintentguard_napi.dylib "$DIST/intentguard.darwin-arm64.node" \
    && echo "BUILT darwin-arm64" || echo "SKIPPED darwin-arm64: cargo build failed"
  if rustup target list --installed | grep -qx x86_64-apple-darwin; then
    cargo build --release --target x86_64-apple-darwin >/dev/null 2>&1 \
      && cp target/x86_64-apple-darwin/release/libintentguard_napi.dylib "$DIST/intentguard.darwin-x64.node" \
      && echo "BUILT darwin-x64" || echo "SKIPPED darwin-x64: cargo build failed"
  else
    echo "SKIPPED darwin-x64: rustup target add x86_64-apple-darwin"
  fi
fi

if ! docker info >/dev/null 2>&1; then
  echo "SKIPPED linux-arm64, linux-x64: no docker daemon (colima start --vm-type vz --vz-rosetta)"; exit 0
fi
# colima shares $HOME only — the repo must live under it.
for pair in arm64:arm64 amd64:x64; do
  plat="${pair%%:*}"; na="${pair##*:}"
  docker run --rm --platform "linux/$plat" -v "$ROOT:/src:ro" -v "$DIST:/out" rust:1-bullseye bash -c "
    set -e; cp -r /src /tmp/ig; cd /tmp/ig/napi
    CARGO_TARGET_DIR=/tmp/t cargo build --release >/dev/null 2>&1
    cp /tmp/t/release/libintentguard_napi.so /out/intentguard.linux-$na.node" \
    && echo "BUILT linux-$na (glibc $(docker run --rm --platform linux/$plat rust:1-bullseye ldd --version | head -1 | awk '{print $NF}'))" \
    || echo "SKIPPED linux-$na: container build failed"
done
