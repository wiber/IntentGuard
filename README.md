# IntentGuard

**If you have four seconds: when other people say "deterministic", they really mean undecidable chaos.** IntentGuard brings boundary legibility to any agentic AI, like AI coding tools or edge LLM deployments. It gives you the oversight to see whether an AI stuck to your specification or went off script. Instead of asking another AI to judge the work, it uses math to measure the difference between what you asked for and what was actually built. It then writes a timestamped receipt that anyone can recompute. This is double-entry bookkeeping for autonomy: developers save an insane amount of tokens, and responsible people and underwriters get a record the AI didn't write.

## Run it

```sh
cargo build --release
./target/release/intentguard --lens --text "$(cat README.md)"     # where the declared intent lands
./target/release/intentguard --lens --text "$(cat src/main.rs)"   # where the built work lands
./target/release/intentguard --help                               # regions, panel PNG, sign, verify, probes
```

Each side is placed on the same 144×144 lattice by gzip-NCD against `data/snippet-library-144.json`, then walked with the ballistic definer walk. No model sits anywhere in that path.

Short text placed naked measures mostly length, so the placement has a matched mode: `--bulk "$(cat SPEC.md)"` (or `--bulk-file SPEC.md`, or `--seed matched` with no bulk) rides your own context with the text, cuts each lattice cell to the text's length, and scores what the text's word order adds over its own shuffle. The bulk is yours to name — a spec, a README, house rules; nothing is supplied for you. The output's `seed_fit.better_than_random` is the seed's verdict on whether the pixel is a measurement at all; when it is false the row is unmeasured and the pixel is not worth reading. `--perm 8` replaces the one-rung threshold with an exact paired permutation of the line.

The receipt says where the work landed: the pixel, the fence, the walked cells, σ. Anyone can re-run it from the same bytes and get the same hash, and `--ballistic --sign` / `--verify-receipt` sign and check the exact bytes emitted. It does not say whether the work is good. That question is undecidable, and IntentGuard does not answer it.

`cargo test --test thesis` runs the claims end to end in pure Rust on the fixtures in `tests/fixtures/`: the same bytes in give the same placement and the same receipt hash, a one-byte forge fails verification, and empty or below-floor input is refused. The separation test (work written to a spec lands nearer it than work written off it) is in the file and marked ignored, because as measured it separates 1 of 4 pairs with the naked seed and 3 of 4 with the matched seed and the spec as bulk, and 10 to 12 of the 12 placements per arm fail the seed's own admissibility test; `cargo test --test thesis -- --ignored` prints the table, and the comment above the test says why in plain words (the 144 cells are prose about operating archetypes, the fixtures are code diffs about payments, logins and email; at 500 characters gzip reads register before topic, so the lattice's vocabulary does not span what these fixtures are about). A seen-red test that is not ignored swaps on and off and checks the verdicts invert under both seeds. None of it tests whether the work is good.

IntentGuard is the Rust core alone. ThetaCog (github.com/wiber/thetacog-mcp) is every part moving together — the VS Code extension, /steer, the delegation.

License: MIT for the software (Part A); the financial-instrument layer built on its receipts is reserved (Part B). See `LICENSE`.
