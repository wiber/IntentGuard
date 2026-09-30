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
