/**
 * System Control Skill
 *
 * Mouse, keyboard, screen capture, and browser automation for macOS.
 * Uses native osascript (AppleScript/JXA) — no external dependencies.
 *
 * Commands (via execute):
 *   mouse.click    { x, y }
 *   mouse.move     { x, y }
 *   mouse.position {}
 *   key.type       { text }
 *   key.press      { key, modifiers? }
 *   screen.capture { path?, region? }
 *   screen.size    {}
 *   browser.open   { url }
 *   browser.tabs   {}
 *   browser.js     { script }
 *   app.open       { name }
 *   app.activate   { name }
 *   app.list       {}
 *   app.quit       { name }
 *   app.switch     { name }
 *   clipboard.get  {}
 *   clipboard.set  { text }
 *   clipboard.paste {}
 *   screen.capture.window { name, path? }
 */

import type { AgentSkill, SkillContext, SkillResult } from "../types.js";

interface SystemCommand {
  action: string;
  x?: number;
  y?: number;
  text?: string;
  key?: string;
  modifiers?: string[];
  path?: string;
  region?: { x: number; y: number; w: number; h: number };
  url?: string;
  name?: string;
  script?: string;
}

export default class SystemControlSkill implements AgentSkill {
  name = "system-control";
  description = "Mouse, keyboard, screen capture, and browser control for macOS";

  async initialize(ctx: SkillContext): Promise<void> {
    // Verify we're on macOS
    const { stdout } = await ctx.shell.exec("uname");
    if (!stdout.trim().startsWith("Darwin")) {
      ctx.log.warn("system-control: Not on macOS, some features may not work");
    }
    ctx.log.info("SystemControl initialized (macOS native)");
  }

  async execute(command: unknown, ctx: SkillContext): Promise<SkillResult> {
    const cmd = command as SystemCommand;
    if (!cmd.action) {
      return { success: false, message: "Missing action" };
    }

    try {
      switch (cmd.action) {
        // ── Mouse ──────────────────────────────────────────────
        case "mouse.click":
          return this.mouseClick(cmd.x!, cmd.y!, ctx);
        case "mouse.move":
          return this.mouseMove(cmd.x!, cmd.y!, ctx);
        case "mouse.position":
          return this.mousePosition(ctx);

        // ── Keyboard ───────────────────────────────────────────
        case "key.type":
          return this.keyType(cmd.text!, ctx);
        case "key.press":
          return this.keyPress(cmd.key!, cmd.modifiers || [], ctx);

        // ── Screen ─────────────────────────────────────────────
        case "screen.capture":
          return this.screenCapture(cmd.path, cmd.region, ctx);
        case "screen.size":
          return this.screenSize(ctx);

        // ── Browser ────────────────────────────────────────────
        case "browser.open":
          return this.browserOpen(cmd.url!, ctx);
        case "browser.tabs":
          return this.browserTabs(ctx);
        case "browser.js":
          return this.browserRunJS(cmd.script!, ctx);

        // ── Apps ───────────────────────────────────────────────
        case "app.open":
          return this.appOpen(cmd.name!, ctx);
        case "app.activate":
          return this.appActivate(cmd.name!, ctx);
        case "app.list":
          return this.appList(ctx);
        case "app.quit":
          return this.appQuit(cmd.name!, ctx);
        case "app.switch":
          return this.appSwitch(cmd.name!, ctx);

        // ── Clipboard ────────────────────────────────────────────
        case "clipboard.get":
          return this.clipboardGet(ctx);
        case "clipboard.set":
          return this.clipboardSet(cmd.text!, ctx);
        case "clipboard.paste":
          return this.clipboardPaste(ctx);

        // ── Extended Screen ──────────────────────────────────────
        case "screen.capture.window":
          return this.screenCaptureWindow(cmd.name!, cmd.path, ctx);

        default:
          return { success: false, message: `Unknown action: ${cmd.action}` };
      }
    } catch (error) {
      ctx.log.error(`system-control error: ${error}`);
      return { success: false, message: `${error}` };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Mouse (via cliclick or AppleScript + CGEvent via JXA)
  // ═══════════════════════════════════════════════════════════════

  private async mouseClick(x: number, y: number, ctx: SkillContext): Promise<SkillResult> {
    const script = `
      ObjC.import('CoreGraphics');
      var point = $.CGPointMake(${x}, ${y});
      var mouseDown = $.CGEventCreateMouseEvent(null, $.kCGEventLeftMouseDown, point, $.kCGMouseButtonLeft);
      var mouseUp = $.CGEventCreateMouseEvent(null, $.kCGEventLeftMouseUp, point, $.kCGMouseButtonLeft);
      $.CGEventPost($.kCGHIDEventTap, mouseDown);
      $.delay(0.05);
      $.CGEventPost($.kCGHIDEventTap, mouseUp);
      JSON.stringify({x: ${x}, y: ${y}, clicked: true});
    `;
    const { stdout, stderr, code } = await ctx.shell.exec(`osascript -l JavaScript -e '${script.replace(/'/g, "'\\''")}'`);
    if (code !== 0) {
      return { success: false, message: `Click failed: ${stderr}` };
    }
    ctx.log.info(`Mouse click at (${x}, ${y})`);
    return { success: true, message: `Clicked at (${x}, ${y})`, data: { x, y } };
  }

  private async mouseMove(x: number, y: number, ctx: SkillContext): Promise<SkillResult> {
    const script = `
      ObjC.import('CoreGraphics');
      var point = $.CGPointMake(${x}, ${y});
      var move = $.CGEventCreateMouseEvent(null, $.kCGEventMouseMoved, point, $.kCGMouseButtonLeft);
      $.CGEventPost($.kCGHIDEventTap, move);
      JSON.stringify({x: ${x}, y: ${y}});
    `;
    const { stdout, stderr, code } = await ctx.shell.exec(`osascript -l JavaScript -e '${script.replace(/'/g, "'\\''")}'`);
    if (code !== 0) {
      return { success: false, message: `Move failed: ${stderr}` };
    }
    return { success: true, message: `Moved to (${x}, ${y})`, data: { x, y } };
  }

  private async mousePosition(ctx: SkillContext): Promise<SkillResult> {
    const script = `
      ObjC.import('CoreGraphics');
      var event = $.CGEventCreate(null);
      var point = $.CGEventGetLocation(event);
      JSON.stringify({x: point.x, y: point.y});
    `;
    const { stdout, stderr, code } = await ctx.shell.exec(`osascript -l JavaScript -e '${script.replace(/'/g, "'\\''")}'`);
    if (code !== 0) {
      return { success: false, message: `Position query failed: ${stderr}` };
    }
    const pos = JSON.parse(stdout.trim());
    return { success: true, message: `Mouse at (${pos.x}, ${pos.y})`, data: pos };
  }

  // ═══════════════════════════════════════════════════════════════
  // Keyboard (via AppleScript System Events)
  // ═══════════════════════════════════════════════════════════════

  private async keyType(text: string, ctx: SkillContext): Promise<SkillResult> {
    // Escape for AppleScript string
    const escaped = text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const script = `tell application "System Events" to keystroke "${escaped}"`;
    const { stderr, code } = await ctx.shell.exec(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
    if (code !== 0) {
      return { success: false, message: `Type failed: ${stderr}` };
    }
    ctx.log.info(`Typed ${text.length} characters`);
    return { success: true, message: `Typed: "${text.substring(0, 50)}${text.length > 50 ? "..." : ""}"` };
  }

  private async keyPress(key: string, modifiers: string[], ctx: SkillContext): Promise<SkillResult> {
    // Map common key names to AppleScript key codes
    const keyCodeMap: Record<string, number> = {
      return: 36, tab: 48, space: 49, delete: 51, escape: 53,
      left: 123, right: 124, down: 125, up: 126,
      f1: 122, f2: 120, f3: 99, f4: 118, f5: 96, f6: 97,
    };

    const modMap: Record<string, string> = {
      cmd: "command down", command: "command down",
      shift: "shift down", alt: "option down", option: "option down",
      ctrl: "control down", control: "control down",
    };

    const modStr = modifiers.map((m) => modMap[m.toLowerCase()] || m).join(", ");
    const keyCode = keyCodeMap[key.toLowerCase()];

    let script: string;
    if (keyCode !== undefined) {
      script = modStr
        ? `tell application "System Events" to key code ${keyCode} using {${modStr}}`
        : `tell application "System Events" to key code ${keyCode}`;
    } else {
      // Single character
      script = modStr
        ? `tell application "System Events" to keystroke "${key}" using {${modStr}}`
        : `tell application "System Events" to keystroke "${key}"`;
    }

    const { stderr, code } = await ctx.shell.exec(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
    if (code !== 0) {
      return { success: false, message: `Key press failed: ${stderr}` };
    }
    const desc = modifiers.length ? `${modifiers.join("+")}+${key}` : key;
    ctx.log.info(`Key press: ${desc}`);
    return { success: true, message: `Pressed: ${desc}` };
  }

  // ═══════════════════════════════════════════════════════════════
  // Screen (via /usr/sbin/screencapture CLI)
  // ═══════════════════════════════════════════════════════════════

  private async screenCapture(
    path?: string,
    region?: { x: number; y: number; w: number; h: number },
    ctx?: SkillContext
  ): Promise<SkillResult> {
    const outputPath = path || `/tmp/openclaw-screenshot-${Date.now()}.png`;
    let cmd = "/usr/sbin/screencapture -x"; // -x = no sound

    if (region) {
      cmd += ` -R${region.x},${region.y},${region.w},${region.h}`;
    }

    cmd += ` "${outputPath}"`;

    const { stderr, code } = await ctx!.shell.exec(cmd);
    if (code !== 0) {
      return { success: false, message: `Screenshot failed: ${stderr}` };
    }
    ctx!.log.info(`Screenshot saved: ${outputPath}`);
    return { success: true, message: `Screenshot saved`, data: { path: outputPath } };
  }

  private async screenSize(ctx: SkillContext): Promise<SkillResult> {
    const script = `
      ObjC.import('AppKit');
      var screen = $.NSScreen.mainScreen;
      var frame = screen.frame;
      JSON.stringify({width: frame.size.width, height: frame.size.height});
    `;
    const { stdout, stderr, code } = await ctx.shell.exec(`osascript -l JavaScript -e '${script.replace(/'/g, "'\\''")}'`);
    if (code !== 0) {
      return { success: false, message: `Screen size failed: ${stderr}` };
    }
    const size = JSON.parse(stdout.trim());
    return { success: true, message: `Screen: ${size.width}x${size.height}`, data: size };
  }

  // ═══════════════════════════════════════════════════════════════
  // Browser (Safari via AppleScript — no install needed)
  // ═══════════════════════════════════════════════════════════════

  private async browserOpen(url: string, ctx: SkillContext): Promise<SkillResult> {
    // Validate URL to prevent injection
    try {
      new URL(url);
    } catch {
      return { success: false, message: `Invalid URL: ${url}` };
    }

    const { stderr, code } = await ctx.shell.exec(`open "${url}"`);
    if (code !== 0) {
      return { success: false, message: `Open URL failed: ${stderr}` };
    }
    ctx.log.info(`Opened URL: ${url}`);
    return { success: true, message: `Opened: ${url}`, data: { url } };
  }

  private async browserTabs(ctx: SkillContext): Promise<SkillResult> {
    const script = `
      var safari = Application("Safari");
      var tabs = [];
      safari.windows().forEach(function(win, wi) {
        win.tabs().forEach(function(tab, ti) {
          tabs.push({window: wi, tab: ti, title: tab.name(), url: tab.url()});
        });
      });
      JSON.stringify(tabs);
    `;
    const { stdout, stderr, code } = await ctx.shell.exec(`osascript -l JavaScript -e '${script.replace(/'/g, "'\\''")}'`);
    if (code !== 0) {
      // Try Chrome instead
      return this.browserTabsChrome(ctx);
    }
    const tabs = JSON.parse(stdout.trim());
    return { success: true, message: `${tabs.length} tabs`, data: tabs };
  }

  private async browserTabsChrome(ctx: SkillContext): Promise<SkillResult> {
    const script = `
      var chrome = Application("Google Chrome");
      var tabs = [];
      chrome.windows().forEach(function(win, wi) {
        win.tabs().forEach(function(tab, ti) {
          tabs.push({window: wi, tab: ti, title: tab.title(), url: tab.url()});
        });
      });
      JSON.stringify(tabs);
    `;
    const { stdout, stderr, code } = await ctx.shell.exec(`osascript -l JavaScript -e '${script.replace(/'/g, "'\\''")}'`);
    if (code !== 0) {
      return { success: false, message: `No browser accessible: ${stderr}` };
    }
    const tabs = JSON.parse(stdout.trim());
    return { success: true, message: `${tabs.length} tabs`, data: tabs };
  }

  private async browserRunJS(script: string, ctx: SkillContext): Promise<SkillResult> {
    // Run JavaScript in the frontmost Safari tab
    const escaped = script.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const appleScript = `tell application "Safari" to do JavaScript "${escaped}" in front document`;
    const { stdout, stderr, code } = await ctx.shell.exec(`osascript -e '${appleScript.replace(/'/g, "'\\''")}'`);
    if (code !== 0) {
      return { success: false, message: `JS execution failed: ${stderr}` };
    }
    return { success: true, message: "JS executed", data: { result: stdout.trim() } };
  }

  // ═══════════════════════════════════════════════════════════════
  // App Control
  // ═══════════════════════════════════════════════════════════════

  private async appOpen(name: string, ctx: SkillContext): Promise<SkillResult> {
    const { stderr, code } = await ctx.shell.exec(`open -a "${name}"`);
    if (code !== 0) {
      return { success: false, message: `Failed to open ${name}: ${stderr}` };
    }
    ctx.log.info(`Opened app: ${name}`);
    return { success: true, message: `Opened: ${name}` };
  }

  private async appActivate(name: string, ctx: SkillContext): Promise<SkillResult> {
    const script = `tell application "${name}" to activate`;
    const { stderr, code } = await ctx.shell.exec(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
    if (code !== 0) {
      return { success: false, message: `Failed to activate ${name}: ${stderr}` };
    }
    return { success: true, message: `Activated: ${name}` };
  }

  private async appList(ctx: SkillContext): Promise<SkillResult> {
    const script = `
      ObjC.import('AppKit');
      var apps = $.NSWorkspace.sharedWorkspace.runningApplications;
      var result = [];
      for (var i = 0; i < apps.count; i++) {
        var app = apps.objectAtIndex(i);
        if (app.activationPolicy === 0) {
          result.push({name: app.localizedName.js, pid: app.processIdentifier, active: app.isActive});
        }
      }
      JSON.stringify(result);
    `;
    const { stdout, stderr, code } = await ctx.shell.exec(`osascript -l JavaScript -e '${script.replace(/'/g, "'\\''")}'`);
    if (code !== 0) {
      return { success: false, message: `App list failed: ${stderr}` };
    }
    const apps = JSON.parse(stdout.trim());
    return { success: true, message: `${apps.length} running apps`, data: apps };
  }

  private async appQuit(name: string, ctx: SkillContext): Promise<SkillResult> {
    const script = `tell application "${name}" to quit`;
    const { stderr, code } = await ctx.shell.exec(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
    if (code !== 0) {
      return { success: false, message: `Failed to quit ${name}: ${stderr}` };
    }
    ctx.log.info(`Quit app: ${name}`);
    return { success: true, message: `Quit: ${name}` };
  }

  private async appSwitch(name: string, ctx: SkillContext): Promise<SkillResult> {
    // More reliable than Cmd+Space: open -a activates and brings to front
    const { stderr, code } = await ctx.shell.exec(`open -a "${name}"`);
    if (code !== 0) {
      return { success: false, message: `Failed to switch to ${name}: ${stderr}` };
    }
    // Also explicitly activate via AppleScript for focus
    await ctx.shell.exec(`osascript -e 'tell application "${name}" to activate'`);
    ctx.log.info(`Switched to app: ${name}`);
    return { success: true, message: `Switched to: ${name}` };
  }

  // ═══════════════════════════════════════════════════════════════
  // Clipboard
  // ═══════════════════════════════════════════════════════════════

  private async clipboardGet(ctx: SkillContext): Promise<SkillResult> {
    const { stdout, stderr, code } = await ctx.shell.exec("pbpaste");
    if (code !== 0) {
      return { success: false, message: `Clipboard read failed: ${stderr}` };
    }
    return { success: true, message: `Clipboard: ${stdout.length} chars`, data: { content: stdout } };
  }

  private async clipboardSet(text: string, ctx: SkillContext): Promise<SkillResult> {
    // Pipe text to pbcopy via printf to handle special chars
    const escaped = text.replace(/'/g, "'\\''");
    const { stderr, code } = await ctx.shell.exec(`printf '%s' '${escaped}' | pbcopy`);
    if (code !== 0) {
      return { success: false, message: `Clipboard write failed: ${stderr}` };
    }
    ctx.log.info(`Clipboard set: ${text.length} chars`);
    return { success: true, message: `Clipboard set: ${text.length} chars` };
  }

  private async clipboardPaste(ctx: SkillContext): Promise<SkillResult> {
    // Cmd+V into the frontmost app
    const script = `tell application "System Events" to keystroke "v" using command down`;
    const { stderr, code } = await ctx.shell.exec(`osascript -e '${script}'`);
    if (code !== 0) {
      return { success: false, message: `Clipboard paste failed: ${stderr}` };
    }
    return { success: true, message: "Pasted from clipboard" };
  }

  // ═══════════════════════════════════════════════════════════════
  // Extended Screen Capture
  // ═══════════════════════════════════════════════════════════════

  private async screenCaptureWindow(appName: string, path: string | undefined, ctx: SkillContext): Promise<SkillResult> {
    const outputPath = path || `/tmp/openclaw-window-${Date.now()}.png`;
    // Get window ID for the app, then capture that specific window
    const script = `
      ObjC.import('Cocoa');
      var windows = $.CGWindowListCopyWindowInfo($.kCGWindowListOptionOnScreenOnly, $.kCGNullWindowID);
      var count = $.CFArrayGetCount(windows);
      var targetId = -1;
      for (var i = 0; i < count; i++) {
        var info = $.CFArrayGetValueAtIndex(windows, i);
        var owner = $.CFDictionaryGetValue(info, $("kCGWindowOwnerName"));
        if (owner && $(owner).js.includes("${appName.replace(/"/g, '\\"')}")) {
          targetId = $($.CFDictionaryGetValue(info, $("kCGWindowNumber"))).js;
          break;
        }
      }
      JSON.stringify({windowId: targetId});
    `;
    const { stdout } = await ctx.shell.exec(`osascript -l JavaScript -e '${script.replace(/'/g, "'\\''")}'`);

    let windowFlag = "";
    try {
      const { windowId } = JSON.parse(stdout.trim());
      if (windowId > 0) windowFlag = `-l ${windowId}`;
    } catch { /* capture full screen as fallback */ }

    const { stderr, code } = await ctx.shell.exec(`/usr/sbin/screencapture -x ${windowFlag} "${outputPath}"`);
    if (code !== 0) {
      return { success: false, message: `Window capture failed: ${stderr}` };
    }
    ctx.log.info(`Window capture saved: ${outputPath} (app: ${appName})`);
    return { success: true, message: `Window captured: ${appName}`, data: { path: outputPath, app: appName } };
  }
}
