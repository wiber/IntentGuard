/**
 * tesseract-trainer.test.ts — Tests for Tesseract Trainer Skill
 *
 * Tests attention signal processing:
 * - Corpus updates (JSONL append)
 * - Pointer creation (confidence threshold)
 * - Heat map updates
 * - Weight calculation (emoji × source × confidence)
 * - Content summarization (truncation)
 * - Stats retrieval
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import TesseractTrainerSkill from "./tesseract-trainer.js";
import type { SkillContext } from "../types.js";

function createMockContext(overrides: {
  configValues?: Record<string, unknown>;
  fsReadResults?: Record<string, string>;
} = {}): SkillContext {
  const configValues = overrides.configValues || {};
  const fsReadResults = overrides.fsReadResults || {};

  return {
    shell: { exec: vi.fn() },
    log: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    config: {
      get: vi.fn((path: string) => configValues[path]),
    },
    fs: {
      read: vi.fn((path: string) => {
        if (path in fsReadResults) return Promise.resolve(fsReadResults[path]);
        return Promise.reject(new Error("File not found"));
      }),
      write: vi.fn().mockResolvedValue(undefined),
    },
    http: {
      post: vi.fn().mockResolvedValue({ pointer_id: "ptr_123" }),
      get: vi.fn(),
    },
    discord: { reply: vi.fn(), sendToChannel: vi.fn(), editMessage: vi.fn(), sendFile: vi.fn() },
    callSkill: vi.fn(),
  } as unknown as SkillContext;
}

function makeSignal(overrides: Partial<{
  source: string;
  content: string;
  confidence: number;
  emoji: string;
  tile_id: string;
}> = {}) {
  return {
    source: overrides.source || "message",
    content: overrides.content || "Test content for training",
    category: {
      row: "A",
      col: "2",
      tile_id: overrides.tile_id || "A2",
      confidence: overrides.confidence ?? 0.85,
      tier: "GREEN" as const,
    },
    reaction: {
      emoji: overrides.emoji || "👍",
      timestamp: "2026-02-17T10:00:00Z",
    },
    metadata: {},
  };
}

describe("TesseractTrainerSkill", () => {
  let skill: TesseractTrainerSkill;
  let ctx: SkillContext;

  beforeEach(async () => {
    vi.clearAllMocks();
    skill = new TesseractTrainerSkill();
    ctx = createMockContext();
    await skill.initialize(ctx);
  });

  describe("initialize", () => {
    it("should initialize and log", async () => {
      expect(ctx.log.info).toHaveBeenCalledWith("TesseractTrainer initialized");
    });

    it("should read supabase config", async () => {
      const customCtx = createMockContext({
        configValues: {
          "integrations.supabase.url": "https://my.supabase.co",
          "integrations.supabase.anonKey": "anon-key-123",
        },
      });
      const s = new TesseractTrainerSkill();
      await s.initialize(customCtx);
      expect(customCtx.config.get).toHaveBeenCalledWith("integrations.supabase.url");
      expect(customCtx.config.get).toHaveBeenCalledWith("integrations.supabase.anonKey");
    });
  });

  describe("train", () => {
    it("should update corpus and heat map on success", async () => {
      const signal = makeSignal();
      const result = await skill.train(signal, ctx);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        corpusUpdated: true,
        pointerCreated: true, // confidence >= 0.7, so createPointer runs (even if supabase skips internally)
        heatUpdated: true,
      });
    });

    it("should write signal to corpus JSONL", async () => {
      const signal = makeSignal({ content: "Important signal" });
      await skill.train(signal, ctx);

      expect(ctx.fs.write).toHaveBeenCalledWith(
        "data/attention-corpus/signals.jsonl",
        expect.stringContaining('"Important signal"'),
      );
    });

    it("should append to existing corpus", async () => {
      const ctxWithExisting = createMockContext({
        fsReadResults: {
          "data/attention-corpus/signals.jsonl": '{"existing":"line"}\n',
        },
      });
      await skill.initialize(ctxWithExisting);

      await skill.train(makeSignal(), ctxWithExisting);

      const writeCall = (ctxWithExisting.fs.write as any).mock.calls.find(
        (c: string[]) => c[0] === "data/attention-corpus/signals.jsonl",
      );
      expect(writeCall[1]).toContain('{"existing":"line"}');
    });

    it("should update heat map with correct weight", async () => {
      await skill.train(makeSignal({ tile_id: "B1", emoji: "👍", confidence: 0.85 }), ctx);

      const heatWriteCall = (ctx.fs.write as any).mock.calls.find(
        (c: string[]) => c[0] === "data/attention-corpus/heat.json",
      );
      expect(heatWriteCall).toBeDefined();
      const heat = JSON.parse(heatWriteCall[1]);
      expect(heat["B1"]).toBeGreaterThan(0);
    });

    it("should create pointer when confidence >= 0.7 and supabase is configured", async () => {
      const ctxWithSupabase = createMockContext({
        configValues: {
          "integrations.supabase.url": "https://my.supabase.co",
          "integrations.supabase.anonKey": "anon-key-123",
        },
      });
      const s = new TesseractTrainerSkill();
      await s.initialize(ctxWithSupabase);

      const signal = makeSignal({ confidence: 0.9 });
      const result = await s.train(signal, ctxWithSupabase);

      expect(result.data).toMatchObject({ pointerCreated: true });
      expect(ctxWithSupabase.http.post).toHaveBeenCalledWith(
        expect.stringContaining("/rest/v1/rpc/create_tesseract_pointer"),
        expect.objectContaining({ p_tile_id: "A2" }),
        expect.objectContaining({ headers: expect.any(Object) }),
      );
    });

    it("should NOT create pointer when confidence < 0.7", async () => {
      const ctxWithSupabase = createMockContext({
        configValues: {
          "integrations.supabase.url": "https://my.supabase.co",
          "integrations.supabase.anonKey": "anon-key-123",
        },
      });
      const s = new TesseractTrainerSkill();
      await s.initialize(ctxWithSupabase);

      const signal = makeSignal({ confidence: 0.5 });
      const result = await s.train(signal, ctxWithSupabase);

      expect(result.data).toMatchObject({ pointerCreated: false });
      expect(ctxWithSupabase.http.post).not.toHaveBeenCalled();
    });

    it("should handle train error gracefully", async () => {
      const failCtx = createMockContext();
      (failCtx.fs.write as any).mockRejectedValue(new Error("Disk full"));
      await skill.initialize(failCtx);

      const result = await skill.train(makeSignal(), failCtx);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Training failed");
    });
  });

  describe("weight calculation", () => {
    // Access private method through train + heat map inspection
    async function getWeight(signal: ReturnType<typeof makeSignal>): Promise<number> {
      const freshCtx = createMockContext();
      const s = new TesseractTrainerSkill();
      await s.initialize(freshCtx);
      await s.train(signal, freshCtx);

      const heatCall = (freshCtx.fs.write as any).mock.calls.find(
        (c: string[]) => c[0] === "data/attention-corpus/heat.json",
      );
      const heat = JSON.parse(heatCall[1]);
      return heat[signal.category.tile_id];
    }

    it("should weight fire emoji highest", async () => {
      const fireWeight = await getWeight(makeSignal({ emoji: "🔥", confidence: 1.0, source: "message" }));
      const thumbsWeight = await getWeight(makeSignal({ emoji: "👍", confidence: 1.0, source: "message" }));
      expect(fireWeight).toBeGreaterThan(thumbsWeight);
    });

    it("should weight voice_memo source higher than message", async () => {
      const voiceWeight = await getWeight(makeSignal({ source: "voice_memo", confidence: 1.0, emoji: "👍" }));
      const messageWeight = await getWeight(makeSignal({ source: "message", confidence: 1.0, emoji: "👍" }));
      expect(voiceWeight).toBeGreaterThan(messageWeight);
    });

    it("should scale weight by confidence", async () => {
      const highConf = await getWeight(makeSignal({ confidence: 1.0, emoji: "👍", source: "message" }));
      const lowConf = await getWeight(makeSignal({ confidence: 0.5, emoji: "👍", source: "message" }));
      expect(highConf).toBeGreaterThan(lowConf);
    });
  });

  describe("getHeatMap", () => {
    it("should return heat data when available", async () => {
      const ctxWithHeat = createMockContext({
        fsReadResults: {
          "data/attention-corpus/heat.json": JSON.stringify({ A2: 5, B1: 3 }),
        },
      });
      await skill.initialize(ctxWithHeat);

      const result = await skill.getHeatMap(ctxWithHeat);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("heat");
      expect(result.data).toHaveProperty("categories");
      expect((result.data as any).heat.A2).toBe(5);
    });

    it("should return empty heat when no data exists", async () => {
      const result = await skill.getHeatMap(ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain("No heat data");
    });
  });

  describe("getStats", () => {
    it("should parse signal stats from JSONL", async () => {
      const lines = [
        JSON.stringify({ source: "message", category: { tile_id: "A2" }, reaction: { emoji: "👍" } }),
        JSON.stringify({ source: "voice_memo", category: { tile_id: "A2" }, reaction: { emoji: "🔥" } }),
        JSON.stringify({ source: "message", category: { tile_id: "B1" }, reaction: { emoji: "👍" } }),
      ].join("\n");

      const ctxWithSignals = createMockContext({
        fsReadResults: { "data/attention-corpus/signals.jsonl": lines },
      });
      await skill.initialize(ctxWithSignals);

      const result = await skill.getStats(ctxWithSignals);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.totalSignals).toBe(3);
      expect(data.bySource.message).toBe(2);
      expect(data.bySource.voice_memo).toBe(1);
      expect(data.byTile.A2).toBe(2);
      expect(data.byTile.B1).toBe(1);
      expect(data.byEmoji["👍"]).toBe(2);
      expect(data.byEmoji["🔥"]).toBe(1);
    });

    it("should return zero stats when no data exists", async () => {
      const result = await skill.getStats(ctx);

      expect(result.success).toBe(true);
      expect((result.data as any).totalSignals).toBe(0);
    });
  });
});
