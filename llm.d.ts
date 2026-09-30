// llm.d.ts — `intentguard/llm` (C498): any LLM workload writes receipts. See llm.js for the contract.
import type { LanguageModelV1Middleware } from 'ai';

export interface LLMPlacement { receipt: string | null; seq: number | null; sha256: string | null; unmeasured?: string }
export interface LLMReceiptEvent extends LLMPlacement { kind: 'generate' | 'stream' | 'call'; model: string }

export interface LLMReceiptOptions {
  /** The declared spec text every call is placed against (opened once per warm instance). */
  spec: string;
  /** The local ndjson tape (default: $TMPDIR/intentguard-llm on Vercel/Lambda, else $INTENTGUARD_HOME or ~/.intentguard). */
  tape?: string;
  /** The witness endpoint (POST /api/notary/ingest shape), or { url, licence }. Posts are queued, never awaited. */
  witness?: string | { url: string; licence?: string } | null;
  licence?: string | null;
  /** A 32-byte hex signing seed; default INTENTGUARD_SIGNING_SEED. */
  seed?: string;
  /** A robot key home (robot/key.js, C493) instead of a seed. */
  keyHome?: string;
  /** The loaded napi addon (e.g. from the host's loader); default the addon bundled with this package. */
  addon?: unknown;
  /** Why `addon` is absent, when it is. */
  addonReason?: string;
  /** Called once per placed call, after placement, with the receipt or the UNMEASURED reason. */
  onReceipt?: (event: LLMReceiptEvent) => void;
  job?: string;
  retry?: { tries: number; baseMs: number };
  fetch?: typeof fetch;
  postTimeoutMs?: number;
}

/** An AI SDK LanguageModelV1Middleware for wrapLanguageModel: places each call after it returns; the output is untouched. */
export function receiptMiddleware(opts: LLMReceiptOptions): LanguageModelV1Middleware;
/** Place one call made with any other client (OpenAI, Anthropic, fetch), after the model answered. Never throws. */
export function placeLLM(opts: LLMReceiptOptions & { prompt: unknown; completion: unknown; model?: string | { provider?: string; modelId?: string } }): LLMPlacement;
/** Wait for every queued witness post (tests and shutdown). */
export function flush(timeoutMs?: number): Promise<{ posted: number; unwitnessed: number; pending: number }>;
/** On Vercel: hand the queued posts to the request's waitUntil. Returns false where there is no request context. */
export function flushAfterResponse(timeoutMs?: number): boolean;
export function stats(): Array<Record<string, unknown>>;
export function actionText(call: { kind: string; model: unknown; prompt: unknown; completion: unknown }): string;
/** null, or the UNMEASURED reason this runtime cannot place (the Edge runtime). */
export const unavailable: string | null;
export const SEED_ENV: 'INTENTGUARD_SIGNING_SEED';
