/**
 * src/discord/x-poster.ts — Brain-side Post Coordinator
 *
 * IntentGuard (brain) decides WHAT to post and validates it.
 * OpenClaw (body) handles HOW via browser-poster skill.
 *
 * FLOW:
 *   1. Draft appears in #x-posts Discord channel
 *   2. Admin reacts 👍 → XPoster.post() called
 *   3. Writes task to data/task-queue/poster.jsonl
 *   4. OpenClaw EventWorker picks it up → browser-poster skill executes
 *   5. Result written to data/browser-post-state.json
 *   6. IntentGuard reads state, reacts ✅/❌ on Discord
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
  loginIndicator: string;
  successIndicator: string;
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

/** Current state of the browser posting pipeline — readable by rooms/OpenClaw */
export interface BrowserPostState {
  status: 'idle' | 'drafting' | 'composing' | 'awaiting-click' | 'posted' | 'error';
  target?: string;
  text?: string;
  charCount?: number;
  openedAt?: string;
  postedAt?: string;
  error?: string;
}

/** Task written to poster.jsonl for OpenClaw to consume */
interface PosterTask {
  id: string;
  action: string;
  text?: string;
  recipe?: string;
  target?: string;
  discordMessageId?: string;
  timestamp: string;
}

export class XPoster {
  private log: Logger;
  private postQueue: Array<{ text: string; discordMessageId: string; recipe: PostRecipe; target: string; resolve: (r: XPostResult) => void }> = [];
  private processing = false;
  private discord: { addReaction: (channelId: string, messageId: string, emoji: string) => Promise<void> } | null = null;
  private xPostsChannelId: string | null = null;
  private taskQueueDir: string;
  private stateFile: string;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  /** Observable state — read from OpenClaw's persisted file */
  browserState: BrowserPostState = { status: 'idle' };

  /** Callback when state changes — set by runtime to notify rooms */
  onStateChange?: (state: BrowserPostState) => void;

  constructor(log: Logger) {
    this.log = log;
    const cwd = process.cwd();
    const { join } = require('path');
    this.taskQueueDir = join(cwd, 'data', 'task-queue');
    this.stateFile = join(cwd, 'data', 'browser-post-state.json');

    // Ensure task-queue dir exists
    const { mkdirSync } = require('fs');
    mkdirSync(this.taskQueueDir, { recursive: true });

    // Start polling for state changes from OpenClaw
    this.startStatePoller();
  }

  setDiscord(discord: { addReaction: (channelId: string, messageId: string, emoji: string) => Promise<void> }, xPostsChannelId: string): void {
    this.discord = discord;
    this.xPostsChannelId = xPostsChannelId;
  }

  /**
   * Post content via OpenClaw's browser-poster skill.
   * Writes a task to data/task-queue/poster.jsonl and waits for result.
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
      this.postQueue.push({ text, discordMessageId, recipe, target, resolve });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.postQueue.length > 0) {
      const item = this.postQueue.shift()!;
      try {
        const result = await this.dispatchToOpenClaw(item.text, item.target, item.discordMessageId);

        if (this.discord && this.xPostsChannelId) {
          const emoji = result.success ? '✅' : '❌';
          await this.discord.addReaction(this.xPostsChannelId, item.discordMessageId, emoji);
        }

        item.resolve(result);
      } catch (error) {
        const errorResult = { success: false, message: `Dispatch error: ${error}` };
        if (this.discord && this.xPostsChannelId) {
          await this.discord.addReaction(this.xPostsChannelId, item.discordMessageId, '❌');
        }
        item.resolve(errorResult);
      }
    }

    this.processing = false;
  }

  /**
   * Write a post task to data/task-queue/poster.jsonl for OpenClaw to pick up.
   * Then poll data/browser-post-state.json for the result.
   */
  private async dispatchToOpenClaw(text: string, target: string, discordMessageId: string): Promise<XPostResult> {
    const { appendFileSync, readFileSync } = require('fs');
    const { join } = require('path');

    const task: PosterTask = {
      id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      action: 'post.auto',
      text,
      recipe: target,
      discordMessageId,
      timestamp: new Date().toISOString(),
    };

    const queueFile = join(this.taskQueueDir, 'poster.jsonl');
    appendFileSync(queueFile, JSON.stringify(task) + '\n');
    this.log.info(`[XPoster] Dispatched to OpenClaw: ${task.id} (${target})`);

    // Poll for result — check browser-post-state.json for up to 30s
    const startTime = Date.now();
    const timeout = 30000;

    while (Date.now() - startTime < timeout) {
      await new Promise(r => setTimeout(r, 2000));

      try {
        const stateStr = readFileSync(this.stateFile, 'utf-8');
        const state: BrowserPostState = JSON.parse(stateStr);

        if (state.status === 'posted' && state.text === text) {
          return {
            success: true,
            message: `Posted to ${target} via OpenClaw`,
          };
        }

        if (state.status === 'error' && state.text === text) {
          return {
            success: false,
            message: state.error || `OpenClaw browser-poster failed`,
          };
        }
      } catch {
        // State file not written yet — keep polling
      }
    }

    // Timeout — check if it was at least opened
    this.log.warn(`[XPoster] Timed out waiting for OpenClaw result (${timeout / 1000}s)`);
    return {
      success: false,
      message: 'Timed out waiting for OpenClaw browser-poster — check if OpenClaw runtime is running',
    };
  }

  /**
   * Request OpenClaw to close tabs for a domain.
   */
  async closeTabs(target: string = 'x.com'): Promise<void> {
    const { appendFileSync } = require('fs');
    const { join } = require('path');

    const task: PosterTask = {
      id: `t-${Date.now()}`,
      action: 'tabs.close',
      target,
      timestamp: new Date().toISOString(),
    };

    const queueFile = join(this.taskQueueDir, 'poster.jsonl');
    appendFileSync(queueFile, JSON.stringify(task) + '\n');
    this.log.info(`[XPoster] Tab close dispatched to OpenClaw: ${target}`);
  }

  /** Read current browser state from disk (written by OpenClaw) */
  readState(): BrowserPostState {
    try {
      const { readFileSync } = require('fs');
      const stateStr = readFileSync(this.stateFile, 'utf-8');
      this.browserState = JSON.parse(stateStr);
    } catch {
      // File doesn't exist yet
    }
    return this.browserState;
  }

  /** Poll for state changes from OpenClaw every 3s */
  private startStatePoller(): void {
    this.pollInterval = setInterval(() => {
      const oldStatus = this.browserState.status;
      this.readState();
      if (this.browserState.status !== oldStatus) {
        this.onStateChange?.(this.browserState);
      }
    }, 3000);
  }

  /** Stop the state poller */
  destroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}
