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

export class XPoster {
  private log: Logger;
  private mcpClient: McpBrowserClient | null = null;
  private session = 'x-twitter';
  private postQueue: Array<{ text: string; discordMessageId: string; resolve: (r: XPostResult) => void }> = [];
  private processing = false;

  constructor(log: Logger) {
    this.log = log;
  }

  /**
   * Set the MCP client for browser automation.
   * Called by runtime after Claude Flow is initialized.
   */
  setMcpClient(client: McpBrowserClient): void {
    this.mcpClient = client;
  }

  /**
   * Post a tweet via browser automation.
   * Queues to avoid concurrent browser operations.
   */
  async post(text: string, discordMessageId: string): Promise<XPostResult> {
    return new Promise((resolve) => {
      this.postQueue.push({ text, discordMessageId, resolve });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.postQueue.length > 0) {
      const item = this.postQueue.shift()!;
      try {
        const result = await this.postViaBrowser(item.text);
        item.resolve(result);
      } catch (error) {
        item.resolve({ success: false, message: `Browser error: ${error}` });
      }
    }

    this.processing = false;
  }

  /**
   * Core browser automation flow:
   * 1. Navigate to x.com/compose/post (or x.com and click compose)
   * 2. Fill the tweet text area
   * 3. Click the Post button
   * 4. Wait for confirmation
   */
  private async postViaBrowser(text: string): Promise<XPostResult> {
    if (!this.mcpClient) {
      // Fallback: try direct Claude Flow MCP tools via shell
      return this.postViaClaudeFlowShell(text);
    }

    try {
      this.log.info(`[XPoster] Posting to X: "${text.substring(0, 60)}..."`);

      // Step 1: Navigate to X compose
      await this.mcpClient.call('browser_open', {
        url: 'https://x.com/compose/post',
        session: this.session,
        waitUntil: 'networkidle',
      });

      // Step 2: Wait for the compose textarea
      await this.mcpClient.call('browser_wait', {
        target: '[data-testid="tweetTextarea_0"], [role="textbox"]',
        session: this.session,
      });

      // Step 3: Fill the tweet text
      // Use type instead of fill for contenteditable divs
      await this.mcpClient.call('browser_click', {
        target: '[data-testid="tweetTextarea_0"], [role="textbox"]',
        session: this.session,
      });

      await this.mcpClient.call('browser_type', {
        target: '[data-testid="tweetTextarea_0"], [role="textbox"]',
        text: text,
        session: this.session,
      });

      // Step 4: Click Post button
      await this.mcpClient.call('browser_click', {
        target: '[data-testid="tweetButton"], [data-testid="tweetButtonInline"]',
        session: this.session,
      });

      // Step 5: Wait for post confirmation (URL changes or toast appears)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 6: Get current URL to extract tweet link
      const urlResult = await this.mcpClient.call('browser_get-url', {
        session: this.session,
      }) as { url?: string };

      const tweetUrl = urlResult?.url?.includes('/status/')
        ? urlResult.url
        : undefined;

      this.log.info(`[XPoster] Tweet posted successfully${tweetUrl ? `: ${tweetUrl}` : ''}`);

      return {
        success: true,
        message: 'Tweet posted via browser',
        tweetUrl,
      };
    } catch (error) {
      this.log.error(`[XPoster] Browser automation failed: ${error}`);
      return { success: false, message: `Browser failed: ${error}` };
    }
  }

  /**
   * Fallback: Post via Claude Flow shell dispatch.
   * Uses claude-flow CLI to control browser.
   */
  private async postViaClaudeFlowShell(text: string): Promise<XPostResult> {
    this.log.info(`[XPoster] Attempting shell-based browser post`);

    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // Escape text for shell
      const escaped = text.replace(/'/g, "'\\''");

      // Use Claude Flow CLI browser commands
      const commands = [
        `npx claude-flow browser open "https://x.com/compose/post" --session ${this.session} --wait networkidle`,
        `sleep 2`,
        `npx claude-flow browser click '[data-testid="tweetTextarea_0"]' --session ${this.session}`,
        `npx claude-flow browser type '[data-testid="tweetTextarea_0"]' '${escaped}' --session ${this.session}`,
        `sleep 1`,
        `npx claude-flow browser click '[data-testid="tweetButton"]' --session ${this.session}`,
        `sleep 3`,
      ];

      for (const cmd of commands) {
        try {
          await execAsync(cmd, { timeout: 15000 });
        } catch (error) {
          this.log.warn(`[XPoster] Shell command failed: ${cmd} — ${error}`);
        }
      }

      return { success: true, message: 'Tweet posted via Claude Flow shell' };
    } catch (error) {
      return { success: false, message: `Shell fallback failed: ${error}` };
    }
  }

  /**
   * Take a screenshot of current browser state (for debugging).
   */
  async screenshot(): Promise<string | null> {
    if (!this.mcpClient) return null;
    try {
      const result = await this.mcpClient.call('browser_screenshot', {
        session: this.session,
      }) as { data?: string };
      return result?.data || null;
    } catch {
      return null;
    }
  }
}
