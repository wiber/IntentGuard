/**
 * system-control.test.ts — Tests for System Control Skill
 *
 * Tests macOS native system control functionality:
 * - Mouse control (click, move, position)
 * - Keyboard control (type, press)
 * - Screen capture
 * - Browser automation
 * - App control
 * - Clipboard operations
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import SystemControlSkill from "./system-control.js";
import type { SkillContext } from "../types.js";

// Mock context factory
function createMockContext(shellResults: Record<string, { stdout: string; stderr: string; code: number }> = {}): SkillContext {
  return {
    shell: {
      exec: vi.fn((cmd: string) => {
        // Match command patterns to return appropriate mocks
        for (const [pattern, result] of Object.entries(shellResults)) {
          if (cmd.includes(pattern)) {
            return Promise.resolve(result);
          }
        }
        return Promise.resolve({ stdout: "", stderr: "", code: 0 });
      }),
    },
    log: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    config: { get: vi.fn() },
    fs: { read: vi.fn(), write: vi.fn() },
    http: { post: vi.fn(), get: vi.fn() },
    callSkill: vi.fn(),
  } as unknown as SkillContext;
}

describe("SystemControlSkill", () => {
  let skill: SystemControlSkill;

  beforeEach(() => {
    skill = new SystemControlSkill();
  });

  describe("initialization", () => {
    it("should initialize on macOS", async () => {
      const ctx = createMockContext({ uname: { stdout: "Darwin\n", stderr: "", code: 0 } });
      await skill.initialize(ctx);
      expect(ctx.log.info).toHaveBeenCalledWith("SystemControl initialized (macOS native)");
    });

    it("should warn on non-macOS platforms", async () => {
      const ctx = createMockContext({ uname: { stdout: "Linux\n", stderr: "", code: 0 } });
      await skill.initialize(ctx);
      expect(ctx.log.warn).toHaveBeenCalledWith("system-control: Not on macOS, some features may not work");
    });
  });

  describe("mouse operations", () => {
    it("should click at specified coordinates", async () => {
      const ctx = createMockContext({
        "CGEventCreateMouseEvent": { stdout: '{"x":100,"y":200,"clicked":true}', stderr: "", code: 0 },
      });

      const result = await skill.execute({ action: "mouse.click", x: 100, y: 200 }, ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain("Clicked at (100, 200)");
      expect(result.data).toEqual({ x: 100, y: 200 });
    });

    it("should move cursor to specified coordinates", async () => {
      const ctx = createMockContext({
        "CGEventCreateMouseEvent": { stdout: '{"x":150,"y":250}', stderr: "", code: 0 },
      });

      const result = await skill.execute({ action: "mouse.move", x: 150, y: 250 }, ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain("Moved to (150, 250)");
      expect(result.data).toEqual({ x: 150, y: 250 });
    });

    it("should get current mouse position", async () => {
      const ctx = createMockContext({
        "CGEventCreate": { stdout: '{"x":320,"y":480}', stderr: "", code: 0 },
      });

      const result = await skill.execute({ action: "mouse.position" }, ctx);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ x: 320, y: 480 });
    });

    it("should handle mouse operation failures", async () => {
      const ctx = createMockContext({
        "CGEventCreateMouseEvent": { stdout: "", stderr: "Permission denied", code: 1 },
      });

      const result = await skill.execute({ action: "mouse.click", x: 100, y: 200 }, ctx);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Click failed");
    });
  });

  describe("keyboard operations", () => {
    it("should type text", async () => {
      const ctx = createMockContext({
        "System Events": { stdout: "", stderr: "", code: 0 },
      });

      const result = await skill.execute({ action: "key.type", text: "hello world" }, ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Typed: "hello world"');
    });

    it("should truncate long text in message", async () => {
      const ctx = createMockContext({
        "System Events": { stdout: "", stderr: "", code: 0 },
      });

      const longText = "a".repeat(100);
      const result = await skill.execute({ action: "key.type", text: longText }, ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain("...");
    });

    it("should press keys with modifiers", async () => {
      const ctx = createMockContext({
        "System Events": { stdout: "", stderr: "", code: 0 },
      });

      const result = await skill.execute({
        action: "key.press",
        key: "c",
        modifiers: ["cmd", "shift"],
      }, ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain("cmd+shift+c");
    });

    it("should press special keys", async () => {
      const ctx = createMockContext({
        "System Events": { stdout: "", stderr: "", code: 0 },
      });

      const result = await skill.execute({ action: "key.press", key: "return" }, ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain("return");
    });

    it("should handle keyboard failures", async () => {
      const ctx = createMockContext({
        "System Events": { stdout: "", stderr: "Access denied", code: 1 },
      });

      const result = await skill.execute({ action: "key.type", text: "test" }, ctx);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Type failed");
    });
  });

  describe("screen operations", () => {
    it("should capture full screen", async () => {
      const ctx = createMockContext({
        "screencapture": { stdout: "", stderr: "", code: 0 },
      });

      const result = await skill.execute({ action: "screen.capture", path: "/tmp/test.png" }, ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain("Screenshot saved");
      expect(result.data).toHaveProperty("path");
    });

    it("should capture screen region", async () => {
      const ctx = createMockContext({
        "screencapture": { stdout: "", stderr: "", code: 0 },
      });

      const result = await skill.execute({
        action: "screen.capture",
        region: { x: 0, y: 0, w: 800, h: 600 },
      }, ctx);

      expect(result.success).toBe(true);
      expect(ctx.shell.exec).toHaveBeenCalledWith(expect.stringContaining("-R0,0,800,600"));
    });

    it("should get screen size", async () => {
      const ctx = createMockContext({
        "NSScreen": { stdout: '{"width":1920,"height":1080}', stderr: "", code: 0 },
      });

      const result = await skill.execute({ action: "screen.size" }, ctx);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ width: 1920, height: 1080 });
    });

    it("should capture specific window", async () => {
      const ctx = createMockContext({
        "CGWindowListCopyWindowInfo": { stdout: '{"windowId":12345}', stderr: "", code: 0 },
        "screencapture": { stdout: "", stderr: "", code: 0 },
      });

      const result = await skill.execute({
        action: "screen.capture.window",
        name: "Safari",
        path: "/tmp/safari.png",
      }, ctx);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("app", "Safari");
    });
  });

  describe("browser operations", () => {
    it("should open URL", async () => {
      const ctx = createMockContext({
        open: { stdout: "", stderr: "", code: 0 },
      });

      const result = await skill.execute({ action: "browser.open", url: "https://example.com" }, ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain("https://example.com");
      expect(result.data).toHaveProperty("url", "https://example.com");
    });

    it("should reject invalid URLs", async () => {
      const ctx = createMockContext();

      const result = await skill.execute({ action: "browser.open", url: "not-a-url" }, ctx);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid URL");
    });

    it("should list Safari tabs", async () => {
      const ctx = createMockContext({
        "Application(\"Safari\")": {
          stdout: '[{"window":0,"tab":0,"title":"Test","url":"https://test.com"}]',
          stderr: "",
          code: 0,
        },
      });

      const result = await skill.execute({ action: "browser.tabs" }, ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain("1 tabs");
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("should fall back to Chrome if Safari unavailable", async () => {
      const ctx = createMockContext({
        "Application(\"Safari\")": { stdout: "", stderr: "Safari not running", code: 1 },
        "Application(\"Google Chrome\")": {
          stdout: '[{"window":0,"tab":0,"title":"Test","url":"https://test.com"}]',
          stderr: "",
          code: 0,
        },
      });

      const result = await skill.execute({ action: "browser.tabs" }, ctx);

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("should execute JavaScript in browser", async () => {
      const ctx = createMockContext({
        "do JavaScript": { stdout: "42", stderr: "", code: 0 },
      });

      const result = await skill.execute({ action: "browser.js", script: "return 42;" }, ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain("JS executed");
    });
  });

  describe("app operations", () => {
    it("should open application", async () => {
      const ctx = createMockContext({
        "open -a": { stdout: "", stderr: "", code: 0 },
      });

      const result = await skill.execute({ action: "app.open", name: "Calculator" }, ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain("Calculator");
    });

    it("should activate application", async () => {
      const ctx = createMockContext({
        activate: { stdout: "", stderr: "", code: 0 },
      });

      const result = await skill.execute({ action: "app.activate", name: "Terminal" }, ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain("Terminal");
    });

    it("should list running applications", async () => {
      const ctx = createMockContext({
        NSWorkspace: {
          stdout: '[{"name":"Safari","pid":1234,"active":true}]',
          stderr: "",
          code: 0,
        },
      });

      const result = await skill.execute({ action: "app.list" }, ctx);

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("should quit application", async () => {
      const ctx = createMockContext({
        "to quit": { stdout: "", stderr: "", code: 0 },
      });

      const result = await skill.execute({ action: "app.quit", name: "TextEdit" }, ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain("TextEdit");
    });

    it("should switch to application", async () => {
      const ctx = createMockContext({
        "open -a": { stdout: "", stderr: "", code: 0 },
        activate: { stdout: "", stderr: "", code: 0 },
      });

      const result = await skill.execute({ action: "app.switch", name: "Finder" }, ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain("Finder");
    });
  });

  describe("clipboard operations", () => {
    it("should get clipboard content", async () => {
      const ctx = createMockContext({
        pbpaste: { stdout: "clipboard text", stderr: "", code: 0 },
      });

      const result = await skill.execute({ action: "clipboard.get" }, ctx);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("content", "clipboard text");
    });

    it("should set clipboard content", async () => {
      const ctx = createMockContext({
        pbcopy: { stdout: "", stderr: "", code: 0 },
      });

      const result = await skill.execute({ action: "clipboard.set", text: "new content" }, ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain("11 chars");
    });

    it("should paste from clipboard", async () => {
      const ctx = createMockContext({
        "System Events": { stdout: "", stderr: "", code: 0 },
      });

      const result = await skill.execute({ action: "clipboard.paste" }, ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain("Pasted from clipboard");
    });
  });

  describe("error handling", () => {
    it("should reject missing action", async () => {
      const ctx = createMockContext();

      const result = await skill.execute({}, ctx);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Missing action");
    });

    it("should reject unknown action", async () => {
      const ctx = createMockContext();

      const result = await skill.execute({ action: "unknown.action" }, ctx);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Unknown action");
    });

    it("should handle exceptions gracefully", async () => {
      const ctx = createMockContext();
      ctx.shell.exec = vi.fn(() => Promise.resolve({ stdout: "", stderr: "Fatal error", code: 1 }));

      const result = await skill.execute({ action: "mouse.click", x: 100, y: 200 }, ctx);

      expect(result.success).toBe(false);
      expect(result.message).toContain("failed");
    });
  });

  describe("special character handling", () => {
    it("should escape special characters in typed text", async () => {
      const ctx = createMockContext({
        "System Events": { stdout: "", stderr: "", code: 0 },
      });

      const result = await skill.execute({
        action: "key.type",
        text: 'text with "quotes" and \\backslashes\\',
      }, ctx);

      expect(result.success).toBe(true);
      expect(ctx.shell.exec).toHaveBeenCalledWith(expect.stringContaining("keystroke"));
    });

    it("should escape special characters in clipboard content", async () => {
      const ctx = createMockContext({
        pbcopy: { stdout: "", stderr: "", code: 0 },
      });

      const result = await skill.execute({
        action: "clipboard.set",
        text: "text with 'single quotes'",
      }, ctx);

      expect(result.success).toBe(true);
    });

    it("should escape special characters in JavaScript", async () => {
      const ctx = createMockContext({
        "do JavaScript": { stdout: "", stderr: "", code: 0 },
      });

      const result = await skill.execute({
        action: "browser.js",
        script: 'alert("hello\\nworld");',
      }, ctx);

      expect(result.success).toBe(true);
    });
  });

  describe("metadata and logging", () => {
    it("should have correct skill metadata", () => {
      expect(skill.name).toBe("system-control");
      expect(skill.description).toBe("Mouse, keyboard, screen capture, and browser control for macOS");
    });

    it("should log successful operations", async () => {
      const ctx = createMockContext({
        "CGEventCreateMouseEvent": { stdout: '{"x":100,"y":200,"clicked":true}', stderr: "", code: 0 },
      });

      await skill.execute({ action: "mouse.click", x: 100, y: 200 }, ctx);

      expect(ctx.log.info).toHaveBeenCalledWith("Mouse click at (100, 200)");
    });

    it("should log errors", async () => {
      const ctx = createMockContext();
      ctx.shell.exec = vi.fn(() => Promise.resolve({ stdout: "", stderr: "Command failed", code: 1 }));

      const result = await skill.execute({ action: "mouse.click", x: 100, y: 200 }, ctx);

      expect(result.success).toBe(false);
      expect(result.message).toContain("failed");
    });
  });
});
