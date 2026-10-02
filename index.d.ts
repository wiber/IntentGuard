// Types for `intentguard` 2.x — the napi addon's calls, unchanged.
export interface Verdict { ok: boolean; payloadBytes?: number; pubkeyB64?: string; reason?: string }
/** The one canonical artifact: the card JSON line, byte-reproducible on any host. */
export function card(text: string, bulk?: string): Buffer;
/** The card plus its attestation line; the key is INTENTGUARD_SIGNING_SEED, else the macOS host key. */
export function cardSigned(text: string, bulk?: string): Buffer;
/** The placement as JSON, including wall-clock fields. */
export function lens(text: string, bulk?: string, seed?: string): string;
export function walk(grid: number[], start?: string, maxDepth?: number, decay?: number): string;
export function sign(payload: string | Buffer): string;
export function signReceipt(payload: string | Buffer): Buffer;
export function verify(receipt: string | Buffer): Verdict;
export function load(): { addon: object; path: string } | { addon: null; reason: string };
export function addonFileName(platform?: string, arch?: string): string;
export const PLATFORMS: string[];
/** The addon file this host loaded, or null. */
export const addonPath: string | null;
/** Why no addon loaded on this host, or null when one did. */
export const unavailable: string | null;
/** C491: the declared spec opened once. place(text) is cardSigned(text, bulk) byte for byte; specSha256 is fixed at open. */
export interface SpecHandle {
  readonly specSha256: string | null;
  place(text: string): Buffer;
  card(text: string): Buffer;
  /** C492: the signed card with seq and prev (receiptSha256 of the receipt before it; null for the first) inside the signed line. */
  placeChained(text: string, prev: string | null, seq: number): Buffer;
}
export function openSpec(bulk?: string | null): SpecHandle;
/** C492: the hash a chained receipt's successor carries as prev (sha256 over the receipt with one trailing newline). */
export function receiptSha256(receipt: string | Buffer): string;
export interface BrokenLink { index: number; seq?: number; reason: string }
export interface ChainReport { ok: boolean; n: number; gaps: number[]; gapCount: number; broken: BrokenLink[]; firstSeq?: number; lastSeq?: number; tipSha256?: string }
/** C492: read chained receipts in tape order; a missing seq is a counted gap, a wrong or reordered link is named in broken. */
export function chain(receipts: Array<string | Buffer>): ChainReport;
/** C492: the ballistic walk as NDJSON lines (--ballistic --stream); with sign, one attestation line last. onLine → count, else the lines. */
export function walkStream(grid: number[], start?: string | null, maxDepth?: number | null, decay?: number | null, sign?: boolean | null, onLine?: (line: string) => void): number | string[];
/** C494: the reference robot harness (robot/harness.js). Tape, not brake: it never blocks, filters or halts an action. */
export interface HarnessOptions {
  /** The declared spec, opened once (openSpec). */
  spec: string;
  /** The local ndjson tape; one row per action: { job?, seq, action, receipt, ts, spec_sha256, witnessed }. */
  tapePath: string;
  /** The witness endpoint (POST /api/notary/ingest shape: { records: [{ kind: 'robot-receipt', receipt }] }); omitted → tape only. */
  witnessUrl?: string | null;
  /** The entitlement JWT the robot key is registered against (POST /api/notary/keys, once, before the first post). */
  licence?: string | null;
  /** Where robot/key.js mints and reads robot.key (default $INTENTGUARD_HOME or ~/.intentguard). */
  keyHome?: string;
  /** Bounded retry per post. */
  retry?: { tries: number; baseMs: number };
  /** Stamped on every tape row (the C497 corpus exporter groups by it). */
  job?: string;
  /** C593: the off-lane tolerance in percent — yours to declare; with it every receipted placement carries `lane`. */
  tolerance?: number;
  /** C593: called for an out_of_lane turn after its row is on the tape, before fn runs. The halt is yours to wire here. */
  onOutOfLane?: (reading: LaneReading, placement: HarnessPlacement) => void;
}
export interface HarnessPlacement { receipt: string | null; seq: number; sha256: string | null; unmeasured?: string; lane?: LaneReading }
export interface HarnessStats { placed: number; posted: number; unwitnessed: number; specSha256: string; tipSha256: string | null; pending?: number; unmeasured?: number }
export interface Harness {
  /** Places + chains + signs + appends BEFORE running fn; never awaits the post. Resolves to fn's result. */
  withReceipt<T>(action: string, fn: () => T | Promise<T>): Promise<T>;
  /** The same receipt without fn (an LLM call placed after it returns). */
  place(action: string): HarnessPlacement;
  /** Wait for the queued posts — tests and shutdown only. */
  flush(timeoutMs?: number): Promise<{ posted: number; unwitnessed: number; pending?: number }>;
  stats(): HarnessStats;
}
export function createHarness(opts: HarnessOptions): Harness;
/** C593: one card's lane state against a tolerance the deployer declares. exit is the CLI's `--lane` exit code. */
export interface LaneReading {
  state: 'in_lane' | 'out_of_lane' | 'unmeasured';
  /** null for in_lane; 'intentguard.out_of_lane' or 'intentguard.unmeasured' otherwise. */
  event: 'intentguard.out_of_lane' | 'intentguard.unmeasured' | null;
  exit: 0 | 3 | 4;
  /** 100·|out_of_role|/(|in_role|+|out_of_role|); null when unmeasured. */
  off_pct: number | null;
  out_of_role: number; walked: number; admissible: boolean; tolerance_pct: number;
  pixel: string | null; input_sha256: string | null; bulk_sha256: string | null; why?: string;
}
/** C593: the lane reading of a card, a receipt (its first line) or a parsed card. Throws without a tolerance. */
export function laneReading(card: string | Buffer | object, tolerancePct: number | string): LaneReading;
export const LANE_EVENTS: { OUT_OF_LANE: 'intentguard.out_of_lane'; UNMEASURED: 'intentguard.unmeasured' };
export const LANE_EXIT: { IN_LANE: 0; ERROR: 1; OUT_OF_LANE: 3; UNMEASURED: 4 };
