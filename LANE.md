# IntentGuard — the lane signal

You already run agents under something that can stop them: a process manager, a queue, an orchestrator. That control is yours and stays yours. What IntentGuard adds is a reading it can act on: `intentguard --lane --tolerance <percent>` writes the turn's card and exits with where the turn landed against the spec you declared.

- `0` in lane: admissible placement, off-lane share under your tolerance. Nothing on stderr.
- `3` out of lane: admissible placement, off-lane share at or past your tolerance. One JSON line on stderr, `{"event":"intentguard.out_of_lane","off_pct":…,"tolerance_pct":…,"pixel":…,"input_sha256":…,"bulk_sha256":…}`.
- `4` unmeasured: the seed's own null test does not admit the placement. One line, `{"event":"intentguard.unmeasured",…}`. Never read it as in lane.
- `1` error.

The off-lane share is the card's own partition, `|out_of_role| / (|in_role| + |out_of_role|)`, recomputable from the card bytes. The tolerance has no default, because it is yours to declare. **The halt is yours to wire.** IntentGuard detects, places and prices the turn and dispatches the signal; what your process manager does with exit 3 is your call:

```sh
agent-turn | intentguard --lane --tolerance 40 --bulk "$(cat spec.md)" > card.json; code=$?
case $code in
  3) systemctl stop my-agent ;;                      # your halt, on your process manager
  4) logger -t intentguard "unmeasured turn" ;;
esac
```

In Node, `createHarness({ spec, tapePath, tolerance: 40, onOutOfLane: (reading) => yourHalt(reading) })` calls your function for an out-of-lane turn after its receipt is on the tape and before the action runs. `laneReading(card, tolerance)` is the same reading as a function. The receipt says where the turn landed; whether the turn was good is undecidable (Rice), and IntentGuard does not claim it.
