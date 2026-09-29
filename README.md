# IntentGuard

**If you have four seconds: when other people say "deterministic", they really mean undecidable chaos.** IntentGuard brings boundary legibility to AI coding tools. It gives you the oversight to see whether an AI stuck to your specification or went off script. Instead of asking another AI to judge the work, it uses math to measure the difference between what you asked for and what was actually built. It then writes a timestamped receipt that anyone can recompute. This is double-entry bookkeeping for autonomy: developers save an insane amount of tokens, and responsible people and underwriters get a record the AI didn't write.

## Run it

```sh
cargo build --release
./target/release/intentguard --lens --text "$(cat README.md)"     # where the declared intent lands
./target/release/intentguard --lens --text "$(cat src/main.rs)"   # where the built work lands
./target/release/intentguard --help                               # regions, panel PNG, sign, verify, probes
```

Each side is placed on the same 144×144 lattice by gzip-NCD against `data/snippet-library-144.json`, then walked with the ballistic definer walk. No model sits anywhere in that path.

The receipt says where the work landed: the pixel, the fence, the walked cells, σ. Anyone can re-run it from the same bytes and get the same hash, and `--ballistic --sign` / `--verify-receipt` sign and check the exact bytes emitted. It does not say whether the work is good. That question is undecidable, and IntentGuard does not answer it.

`cargo test --test thesis` runs the claims end to end in pure Rust on the fixtures in `tests/fixtures/`: the same bytes in give the same placement and the same receipt hash, a one-byte forge fails verification, and empty or below-floor input is refused. The separation test (work written to a spec lands nearer it than work written off it) is in the file and marked ignored, because as measured it separates 1 of 4 pairs with this crate's seed; `cargo test --test thesis -- --ignored` prints the numbers. None of it tests whether the work is good.

IntentGuard is the Rust core alone. ThetaCog (github.com/wiber/thetacog-mcp) is every part moving together — the VS Code extension, /steer, the delegation.

License: MIT for the software (Part A); the financial-instrument layer built on its receipts is reserved (Part B). See `LICENSE`.
