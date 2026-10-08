# vendor/wasm-libc-shim — the six libc headers the vendored zlib's deflate side touches, for wasm32-unknown-unknown

wasm32-unknown-unknown ships no libc, and `cargo check --target wasm32-unknown-unknown` died at
`zconf.h:461: 'sys/types.h' file not found`. These headers declare exactly what `adler32.c cpu_features.c crc32.c
deflate.c trees.c zutil.c` reach under `CPU_NO_SIMD`, nothing more:

- `malloc` / `calloc` / `free` — provided by `src/wasm_libc.rs` (Rust's allocator behind a size header)
- `memcpy` / `memset` / `memcmp` — provided by Rust's compiler-builtins on wasm32
- `off_t` and `SEEK_*` — `long` and 0/1/2; zconf.h reaches sys/types.h and unistd.h only to spell `z_off_t`
- `assert` — a no-op; the vendored source is compiled without ZLIB_DEBUG
- `errno` — declared, never referenced by the deflate side (gz* is not compiled)

build.rs adds this directory with `-ffreestanding -nostdlibinc` ONLY when the target arch is wasm32; native builds never
see it. vendor/zlib stays verbatim (parity provenance). Guard: tests/ops/wasm-walker-builds.test.mjs
