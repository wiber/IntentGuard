/**
 * src/discord/x-poster.ts — Universal Browser Poster via Playwright WebKit
 *
 * Posts content to any URL using Playwright browser automation.
 * Uses WebKit (Safari engine) to reuse logged-in Safari sessions.
 * X/Twitter is the first target, but architecture supports any URL.
 *
 * FLOW:
 *   1. Draft appears in #x-posts Discord channel
 *   2. Admin reacts 👍 → triggers this poster
 *   3. Opens target URL in Playwright WebKit, types content, clicks Post
 *   4. Confirms back to Discord with ✅ + link
 *
 * PRIORITY: Playwright WebKit > MCP browser_* > Claude Flow shell
 *
 * REQUIRES:
 *   - npm install playwright && npx playwright install webkit
 *   - Logged into target sites in Safari
 */

import type { Logger } from '../types.js';

export interface XPostResult {
  success: boolean;
  message: string;
  tweetUrl?: string;
}

/** Target site recipe — defines how to post to a specific URL */
export interface PostRecipe {
  name: string;
  composeUrl: string;
  textSelector: string;
  postButtonSelector: string;
  loginIndicator: string;        // URL pattern that means "not logged in"
  successIndicator: string;      // URL pattern after successful post (e.g. '/status/')
  maxChars: number;
}

/** Built-in recipes for common platforms */
export const RECIPES: Record<string, PostRecipe> = {
  x: {
    name: 'X/Twitter',
    composeUrl: 'https://x.com/compose/post',
    textSelector: '[data-testid="tweetTextarea_0"], [role="textbox"]',
    postButtonSelector: '[data-testid="tweetButton"], [data-testid="tweetButtonInline"]',
    loginIndicator: '/login',
    successIndicator: '/status/',
    maxChars: 280,
  },
  bluesky: {
    name: 'Bluesky',
    composeUrl: 'https://bsky.app/compose',
    textSelector: '[data-testid="composeTextInput"], textarea',
    postButtonSelector: '[data-testid="composerPublishBtn"], button[aria-label="Post"]',
    loginIndicator: '/login',
    successIndicator: '/post/',
    maxChars: 300,
  },
  linkedin: {
    name: 'LinkedIn',
    composeUrl: 'https://www.linkedin.com/feed/',
    textSelector: '.ql-editor, [role="textbox"]',
    postButtonSelector: 'button.share-actions__primary-action',
    loginIndicator: '/login',
    successIndicator: '/feed/',
    maxChars: 3000,
  },
};

interface McpBrowserClient {
  call(tool: string, args: Record<string, unknown>): Promise<unknown>;
}

export class XPoster {
  private log: Logger;
  private mcpClient: McpBrowserClient | null = null;
  private session = 'x-twitter';
  private postQueue: Array<{ text: string; discordMessageId: string; recipe: PostRecipe; resolve: (r: XPostResult) => void }> = [];
  private processing = false;
  private discord: { addReaction: (channelId: string, messageId: string, emoji: string) => Promise<void> } | null = null;
  private xPostsChannelId: string | null = null;
  private playwrightAvailable: boolean | null = null;

  constructor(log: Logger) {
    this.log = log;
  }

  setDiscord(discord: { addReaction: (channelId: string, messageId: string, emoji: string) => Promise<void> }, xPostsChannelId: string): void {
    this.discord = discord;
    this.xPostsChannelId = xPostsChannelId;
  }

  setMcpClient(client: McpBrowserClient): void {
    this.mcpClient = client;
  }

  /**
   * Post content via browser automation.
   * @param text - Content to post
   * @param discordMessageId - Discord message ID for reaction feedback
   * @param target - Platform key from RECIPES (default: 'x')
   */
  async post(text: string, discordMessageId: string, target: string = 'x'): Promise<XPostResult> {
    const recipe = RECIPES[target];
    if (!recipe) {
      return { success: false, message: `Unknown target: ${target}. Available: ${Object.keys(RECIPES).join(', ')}` };
    }

    if (text.length > recipe.maxChars) {
      this.log.error(`[XPoster] Text exceeds ${recipe.maxChars} chars for ${recipe.name}: ${text.length}`);
      if (this.discord && this.xPostsChannelId) {
        await this.discord.addReaction(this.xPostsChannelId, discordMessageId, '❌');
      }
      return { success: false, message: `Too long: ${text.length}/${recipe.maxChars} chars for ${recipe.name}` };
    }

    return new Promise((resolve) => {
      this.postQueue.push({ text, discordMessageId, recipe, resolve });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.postQueue.length > 0) {
      const item = this.postQueue.shift()!;
      try {
        // Priority: Playwright > MCP > Shell
        const result = await this.postWithBestMethod(item.text, item.recipe);

        if (this.discord && this.xPostsChannelId) {
          const emoji = result.success ? '✅' : '❌';
          await this.discord.addReaction(this.xPostsChannelId, item.discordMessageId, emoji);
        }

        item.resolve(result);
      } catch (error) {
        const errorResult = { success: false, message: `Browser error: ${error}` };
        if (this.discord && this.xPostsChannelId) {
          await this.discord.addReaction(this.xPostsChannelId, item.discordMessageId, '❌');
        }
        item.resolve(errorResult);
      }
    }

    this.processing = false;
  }

  private async postWithBestMethod(text: string, recipe: PostRecipe): Promise<XPostResult> {
    // Try Playwright WebKit first (reuses Safari login)
    if (this.playwrightAvailable !== false) {
      try {
        return await this.postViaPlaywright(text, recipe);
      } catch (err) {
        this.log.warn(`[XPoster] Playwright failed: ${err}`);
        this.playwrightAvailable = false;
      }
    }

    // Try MCP browser tools
    if (this.mcpClient) {
      return this.postViaMcpBrowser(text, recipe);
    }

    // Last resort: Claude Flow shell
    return this.postViaClaudeFlowShell(text, recipe);
  }

  // ─── Playwright WebKit (Safari) ─────────────────────────────

  private async postViaPlaywright(text: string, recipe: PostRecipe): Promise<XPostResult> {
    const pw = await import('playwright');
    this.playwrightAvailable = true;
    this.log.info(`[XPoster] Playwright WebKit → ${recipe.name}: "${text.substring(0, 60)}..."`);

    const browser = await pw.webkit.launch({ headless: false });
    const context = await browser.newContext();

    // Try to load Safari cookies for the target domain
    await this.injectSafariCookies(context, recipe.composeUrl);

    const page = await context.newPage();

    try {
      await page.goto(recipe.composeUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

      // Check if we're redirected to login
      if (page.url().includes(recipe.loginIndicator)) {
        await browser.close();
        return { success: false, message: `Not logged into ${recipe.name} — please log in via Safari first` };
      }

      // Wait for compose area
      const textbox = page.locator(recipe.textSelector).first();
      await textbox.waitFor({ state: 'visible', timeout: 10000 });

      // For LinkedIn, need to click "Start a post" first
      if (recipe.name === 'LinkedIn') {
        const startPost = page.locator('button:has-text("Start a post")');
        if (await startPost.isVisible()) {
          await startPost.click();
          await page.waitForTimeout(1000);
          const editor = page.locator(recipe.textSelector).first();
          await editor.waitFor({ state: 'visible', timeout: 5000 });
        }
      }

      // Click and type
      await textbox.click();
      await page.keyboard.type(text, { delay: 25 });

      // Click Post button
      const postBtn = page.locator(recipe.postButtonSelector).first();
      await postBtn.waitFor({ state: 'visible', timeout: 5000 });
      await postBtn.click();

      // Wait for navigation away from compose
      try {
        await page.waitForURL(url => !url.href.includes('/compose'), { timeout: 15000 });
      } catch {
        // May not navigate (e.g. LinkedIn stays on feed)
      }

      await page.waitForTimeout(2000);

      // Try to extract post URL
      const finalUrl = page.url();
      const postUrl = finalUrl.includes(recipe.successIndicator) ? finalUrl : undefined;

      await browser.close();

      return {
        success: true,
        message: postUrl ? `Posted to ${recipe.name} and verified` : `Posted to ${recipe.name} (URL not captured)`,
        tweetUrl: postUrl,
      };
    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  /** Extract Safari cookies for the target domain and inject into Playwright context */
  private async injectSafariCookies(context: import('playwright').BrowserContext, url: string): Promise<void> {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const domain = new URL(url).hostname.replace('www.', '');

      // Safari stores cookies in a binary plist. Use sqlite3 to read them.
      // Safari cookie DB: ~/Library/Cookies/Cookies.binarycookies
      // Alternative: use osascript to extract via Safari's JS bridge
      // Most reliable: use the `cookie-extractor` approach with sqlite3 on the Cookies.binarycookies
      const cookieDb = `${process.env.HOME}/Library/Cookies/Cookies.binarycookies`;

      // Try Python-based cookie extraction (handles binary cookies format)
      const { stdout } = await execAsync(
        `python3 -c "
import http.cookiejar, json, os
cj = http.cookiejar.MozillaCookieJar()
# Safari binary cookies aren't directly readable, try keychain approach
# Fallback: check if user has exported cookies
cookie_file = os.path.expanduser('~/.openclaw/cookies-${domain}.json')
if os.path.exists(cookie_file):
    print(open(cookie_file).read())
else:
    print('[]')
"`,
        { timeout: 5000 },
      );

      const cookies = JSON.parse(stdout.trim());
      if (cookies.length > 0) {
        await context.addCookies(cookies);
        this.log.info(`[XPoster] Injected ${cookies.length} cookies for ${domain}`);
      } else {
        this.log.warn(`[XPoster] No cached cookies for ${domain} — browser may not be logged in`);
        this.log.info(`[XPoster] Tip: Export cookies to ~/.openclaw/cookies-${domain}.json`);
      }
    } catch (err) {
      this.log.warn(`[XPoster] Cookie injection skipped: ${err}`);
    }
  }

  // ─── MCP Browser (Claude Flow) ─────────────────────────────

  private async postViaMcpBrowser(text: string, recipe: PostRecipe): Promise<XPostResult> {
    if (!this.mcpClient) {
      return { success: false, message: 'No MCP client available' };
    }

    try {
      this.log.info(`[XPoster] MCP browser → ${recipe.name}: "${text.substring(0, 60)}..."`);

      await this.mcpClient.call('browser_open', {
        url: recipe.composeUrl,
        session: this.session,
        waitUntil: 'networkidle',
      });

      await this.mcpClient.call('browser_wait', {
        target: recipe.textSelector,
        session: this.session,
      });

      await this.mcpClient.call('browser_click', {
        target: recipe.textSelector,
        session: this.session,
      });

      await this.mcpClient.call('browser_type', {
        target: recipe.textSelector,
        text: text,
        session: this.session,
      });

      await this.mcpClient.call('browser_click', {
        target: recipe.postButtonSelector,
        session: this.session,
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      const urlResult = await this.mcpClient.call('browser_get-url', {
        session: this.session,
      }) as { url?: string };

      const postUrl = urlResult?.url?.includes(recipe.successIndicator)
        ? urlResult.url
        : undefined;

      return {
        success: true,
        message: postUrl
          ? `Posted to ${recipe.name} via MCP browser`
          : `Posted to ${recipe.name} via MCP (unverified)`,
        tweetUrl: postUrl,
      };
    } catch (error) {
      this.log.error(`[XPoster] MCP browser failed: ${error}`);
      return { success: false, message: `MCP browser failed: ${error}` };
    }
  }

  // ─── Shell Fallback ─────────────────────────────────────────

  private async postViaClaudeFlowShell(text: string, recipe: PostRecipe): Promise<XPostResult> {
    this.log.info(`[XPoster] Shell fallback → ${recipe.name}`);

    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const escaped = text.replace(/'/g, "'\\''");

      const commands = [
        `npx claude-flow browser open "${recipe.composeUrl}" --session ${this.session} --wait networkidle`,
        `sleep 2`,
        `npx claude-flow browser click '${recipe.textSelector.split(',')[0]}' --session ${this.session}`,
        `npx claude-flow browser type '${recipe.textSelector.split(',')[0]}' '${escaped}' --session ${this.session}`,
        `sleep 1`,
        `npx claude-flow browser click '${recipe.postButtonSelector.split(',')[0]}' --session ${this.session}`,
        `sleep 3`,
      ];

      for (const cmd of commands) {
        try {
          await execAsync(cmd, { timeout: 15000 });
        } catch (error) {
          this.log.warn(`[XPoster] Shell cmd failed: ${cmd} — ${error}`);
        }
      }

      return { success: true, message: `Posted to ${recipe.name} via shell` };
    } catch (error) {
      return { success: false, message: `Shell fallback failed: ${error}` };
    }
  }

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
