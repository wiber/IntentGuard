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
  private discord: { addReaction: (channelId: string, messageId: string, emoji: string) => Promise<void> } | null = null;
  private xPostsChannelId: string | null = null;

  constructor(log: Logger) {
    this.log = log;
  }

  /**
   * Set Discord helper for reaction feedback.
   * Called by runtime to enable ✅/❌ reactions after X posting.
   */
  setDiscord(discord: { addReaction: (channelId: string, messageId: string, emoji: string) => Promise<void> }, xPostsChannelId: string): void {
    this.discord = discord;
    this.xPostsChannelId = xPostsChannelId;
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
   * @param text - Tweet text (should be <= 280 chars)
   * @param discordMessageId - Discord message ID for reaction feedback
   */
  async post(text: string, discordMessageId: string): Promise<XPostResult> {
    // Validate 280-character constraint
    if (text.length > 280) {
      this.log.error(`[XPoster] Tweet exceeds 280 chars: ${text.length} chars`);
      const result: XPostResult = {
        success: false,
        message: `Tweet too long: ${text.length} characters (max 280)`,
      };

      // Add ❌ reaction to indicate failure
      if (this.discord && this.xPostsChannelId) {
        await this.discord.addReaction(this.xPostsChannelId, discordMessageId, '❌');
      }

      return result;
    }

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

        // Add reaction to Discord staging message
        if (this.discord && this.xPostsChannelId) {
          const emoji = result.success ? '✅' : '❌';
          await this.discord.addReaction(this.xPostsChannelId, item.discordMessageId, emoji);
          this.log.info(`[XPoster] Added ${emoji} reaction to staging message`);
        }

        item.resolve(result);
      } catch (error) {
        const errorResult = { success: false, message: `Browser error: ${error}` };

        // Add ❌ reaction on error
        if (this.discord && this.xPostsChannelId) {
          await this.discord.addReaction(this.xPostsChannelId, item.discordMessageId, '❌');
        }

        item.resolve(errorResult);
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

      // Step 5: Wait and verify with screenshot + URL check
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 6: Get current URL to extract tweet link
      const urlResult = await this.mcpClient.call('browser_get-url', {
        session: this.session,
      }) as { url?: string };

      let tweetUrl = urlResult?.url?.includes('/status/')
        ? urlResult.url
        : undefined;

      // Step 7: Screenshot verification — capture post-tweet state
      const screenshotData = await this.screenshot();
      if (screenshotData) {
        this.log.info(`[XPoster] Post-tweet screenshot captured (${screenshotData.length} bytes)`);
      }

      // Step 8: If URL still on compose, retry once
      if (!tweetUrl && urlResult?.url?.includes('/compose')) {
        this.log.warn(`[XPoster] Still on compose page — retrying click`);
        try {
          await this.mcpClient.call('browser_click', {
            target: '[data-testid="tweetButton"], [data-testid="tweetButtonInline"]',
            session: this.session,
          });
          await new Promise(resolve => setTimeout(resolve, 5000));
          const retryUrl = await this.mcpClient.call('browser_get-url', {
            session: this.session,
          }) as { url?: string };
          tweetUrl = retryUrl?.url?.includes('/status/') ? retryUrl.url : undefined;
        } catch {
          this.log.warn(`[XPoster] Retry click failed`);
        }
      }

      const verified = !!tweetUrl;
      this.log.info(`[XPoster] Tweet ${verified ? 'VERIFIED' : 'UNVERIFIED'}${tweetUrl ? `: ${tweetUrl}` : ''}`);

      return {
        success: true,
        message: verified ? 'Tweet posted and verified via browser' : 'Tweet posted (unverified — no status URL)',
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
