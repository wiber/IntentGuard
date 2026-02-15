/**
 * src/discord/x-poster.ts — Browser-Based X/Twitter Poster via Claude Flow
 *
 * Posts tweets to X/Twitter using Claude Flow browser automation.
 * Mouse/keyboard approach — no API keys needed, uses logged-in browser session.
 *
 * FLOW:
 *   1. Tweet appears in #x-posts Discord channel
 *   2. Admin reacts 👍 → triggers this poster
 *   3. Opens X.com in Claude Flow browser, types tweet, clicks Post
 *   4. Confirms back to Discord with ✅
 *
 * REQUIRES:
 *   - Claude Flow MCP with browser_* tools
 *   - X/Twitter logged in on the browser session
 */
import type { Logger } from '../types.js';
export interface XPostResult {
    success: boolean;
    message: string;
    tweetUrl?: string;
}
interface McpBrowserClient {
    call(tool: string, args: Record<string, unknown>): Promise<unknown>;
}
export declare class XPoster {
    private log;
    private mcpClient;
    private session;
    private postQueue;
    private processing;
    private discord;
    private xPostsChannelId;
    constructor(log: Logger);
    /**
     * Set Discord helper for reaction feedback.
     * Called by runtime to enable ✅/❌ reactions after X posting.
     */
    setDiscord(discord: {
        addReaction: (channelId: string, messageId: string, emoji: string) => Promise<void>;
    }, xPostsChannelId: string): void;
    /**
     * Set the MCP client for browser automation.
     * Called by runtime after Claude Flow is initialized.
     */
    setMcpClient(client: McpBrowserClient): void;
    /**
     * Post a tweet via browser automation.
     * Queues to avoid concurrent browser operations.
     * @param text - Tweet text (should be <= 280 chars)
     * @param discordMessageId - Discord message ID for reaction feedback
     */
    post(text: string, discordMessageId: string): Promise<XPostResult>;
    private processQueue;
    /**
     * Core browser automation flow:
     * 1. Navigate to x.com/compose/post (or x.com and click compose)
     * 2. Fill the tweet text area
     * 3. Click the Post button
     * 4. Wait for confirmation
     */
    private postViaBrowser;
    /**
     * Fallback: Post via Claude Flow shell dispatch.
     * Uses claude-flow CLI to control browser.
     */
    private postViaClaudeFlowShell;
    /**
     * Take a screenshot of current browser state (for debugging).
     */
    screenshot(): Promise<string | null>;
}
export {};
//# sourceMappingURL=x-poster.d.ts.map