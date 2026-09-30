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
}
export function openSpec(bulk?: string | null): SpecHandle;
