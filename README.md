# IntentGuard

**When an AI breaks something, the receipt shows whether the instruction or the work left the lane. Deciding fault was impossible from the AI's own account. Now you can.** IntentGuard brings boundary legibility to any agentic AI, like AI coding tools or edge LLM deployments. It gives you the oversight to see whether an AI stuck to your specification or went off script. Instead of asking another AI to judge the work, it uses math to MAP and MEASURE WHERE the work drifted from what you specified. It then writes a timestamped receipt that anyone can recompute. This is double-entry bookkeeping for autonomy: developers save an insane amount of tokens, and responsible people and underwriters get a record the AI didn't write.

IntentGuard is the Rust heart of [ThetaCog](https://github.com/wiber/thetacog-mcp), the dependency that does the measuring. It holds two things: the gzip-NCD compression sensor that places text on a 144×144 lattice, and the ballistic walk that reads where it landed. No model sits anywhere in that path.

It does not own an infinity; it owns the finite floor that stops one. Every definition it places ends at an address within eight forward steps on the 144×144, 20,736-cell lattice, the same address on every machine — the dictionary regress (Harnad 1990), halted.

License: MIT for the software (Part A); the financial-instrument layer built on its receipts is reserved (Part B). See `LICENSE` (MIT) and `INSTRUMENT-TERMS.md`.
