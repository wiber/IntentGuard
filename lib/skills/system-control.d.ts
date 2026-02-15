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
export default class SystemControlSkill implements AgentSkill {
    name: string;
    description: string;
    initialize(ctx: SkillContext): Promise<void>;
    execute(command: unknown, ctx: SkillContext): Promise<SkillResult>;
    private mouseClick;
    private mouseMove;
    private mousePosition;
    private keyType;
    private keyPress;
    private screenCapture;
    private screenSize;
    private browserOpen;
    private browserTabs;
    private browserTabsChrome;
    private browserRunJS;
    private appOpen;
    private appActivate;
    private appList;
    private appQuit;
    private appSwitch;
    private clipboardGet;
    private clipboardSet;
    private clipboardPaste;
    private screenCaptureWindow;
}
//# sourceMappingURL=system-control.d.ts.map