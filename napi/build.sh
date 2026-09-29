#!/usr/bin/env bash
# napi/build.sh — build the Node addon for THIS host and put it where test.mjs (and a require) finds it:
# napi/intentguard.<platform>-<arch>.node. The .node file is a build artifact and is never committed.
set -euo pipefail
cd "$(dirname "$0")"
cargo build --release
plat="$(node -p 'process.platform + "-" + process.arch')"
case "$(uname -s)" in Darwin) lib=libintentguard_napi.dylib ;; Linux) lib=libintentguard_napi.so ;; *) echo "unsupported host" >&2; exit 2 ;; esac
cp "target/release/$lib" "intentguard.$plat.node"
echo "napi/intentguard.$plat.node"
