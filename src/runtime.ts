/**
 * src/runtime.ts — IntentGuard Runtime (Sovereign Engine)
 *
 * The main orchestrator. Wires together:
 *   - OpenClaw gateway (spawned as child process via wrapper.ts)
 *   - Discord.js client (9 cognitive rooms + #trust-debt-public)
 *   - FIM geometric auth (permission checks on every tool call)
 *   - Skills (voice-memo, claude-flow-bridge, thetasteer, llm-controller)
 *   - Transparency engine (public trust-debt reporting)
 *   - Authorized handles (thetaking, mortarcombat = instant execute)
 *
 * USAGE:
 *   npx tsx src/runtime.ts
 *
 * ENV VARS:
 *   DISCORD_BOT_TOKEN      — Discord bot token
 *   DISCORD_APPLICATION_ID — Discord app ID
 *   THETADRIVEN_GUILD_ID   — Discord server ID
 *   ANTHROPIC_API_KEY       — For Claude Sonnet (optional, uses CLI OAuth)
 *   OPENCLAW_GATEWAY_PORT   — Gateway port (default: 18789)
 */

import {
  Client, GatewayIntentBits, Partials, Events,
  type Message, type Attachment, TextChannel, AttachmentBuilder,
} from 'discord.js';
import { readFileSync, existsSync, mkdirSync, writeFileSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ChannelManager } from './discord/channel-manager.js';
import { TaskStore } from './discord/task-store.js';
import { OutputCapture } from './discord/output-capture.js';
import { OutputPoller } from './discord/output-poller.js';
import { TransparencyEngine } from './discord/transparency-engine.js';
import { HandleAuthority } from './discord/authorized-handles.js';
import { SteeringLoop, type ExecutionTier } from './discord/steering-loop.js';
import { TweetComposer } from './discord/tweet-composer.js';
import { XPoster } from './discord/x-poster.js';
import { ProactiveScheduler } from './cron/scheduler.js';
import { loadIdentityFromPipeline } from './auth/geometric.js';
import { FimInterceptor } from './auth/fim-interceptor.js';
import type {
  SkillContext, SkillResult, VoiceMemoEvent, ReactionEvent,
  OrchestratorConfig, Logger as ILogger, ConfigHelper as IConfigHelper,
} from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ═══════════════════════════════════════════════════════════════
// Load .env
// ═══════════════════════════════════════════════════════════════

const envPath = join(ROOT, '.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#]\w*)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Config types
// ═══════════════════════════════════════════════════════════════

interface IntentGuardConfig {
  agent: { name: string; description: string; model: { provider: string; model: string } };
  channels: {
    discord: {
      enabled: boolean;
      token: string;
      application_id: string;
      guild_ids: string[];
      features: { voiceMemos: boolean; reactions: boolean; threads: boolean };
      voiceMemo: {
        autoTranscribe: boolean;
        transcribeOnReaction: boolean;
        reactionTriggers: string[];
        authorizedReactors: string[];
      };
    };
  };
  skills: { enabled: string[]; directory: string };
  permissions: {
    filesystem: { read: string[]; write: string[] };
    shell: { enabled: boolean; allowlist: string[] };
    network: { enabled: boolean; allowlist: string[] };
  };
  integrations: {
    claudeFlow: { enabled: boolean; projectDir?: string };
    thetaSteer: { enabled: boolean; socket: string };
    ollama: { endpoint: string };
  };
  orchestrator: OrchestratorConfig;
  transparency: { enabled: boolean; spikeThreshold: number; reportIntervalMs: number };
  logging: { level: string; file: string };
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

class Logger implements ILogger {
  private level: string;
  private logFile: string;

  constructor(level: string, logFile: string) {
    this.level = level;
    this.logFile = join(ROOT, logFile);
    const logDir = dirname(this.logFile);
    if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
  }

  private write(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${level}] ${message}\n`;
    console.log(line.trim());
    appendFileSync(this.logFile, line);
  }

  debug(message: string): void { if (this.level === 'debug') this.write('DEBUG', message); }
  info(message: string): void { this.write('INFO', message); }
  warn(message: string): void { this.write('WARN', message); }
  error(message: string): void { this.write('ERROR', message); }
}

class ConfigHelper implements IConfigHelper {
  private config: IntentGuardConfig;
  constructor(config: IntentGuardConfig) { this.config = config; }

  get(path: string): unknown {
    const parts = path.split('.');
    let value: unknown = this.config;
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else { return undefined; }
    }
    return value;
  }
}

class FileSystem {
  private root: string;
  constructor(root: string) { this.root = root; }

  async read(path: string): Promise<string> {
    return readFileSync(join(this.root, path), 'utf-8');
  }

  async write(path: string, content: string): Promise<void> {
    const fullPath = join(this.root, path);
    const dir = dirname(fullPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(fullPath, content);
  }
}

class HttpClient {
  async post(url: string, body: unknown, options?: { headers?: Record<string, string> }): Promise<unknown> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: JSON.stringify(body),
    });
    return response.json();
  }

  async get(url: string, options?: { headers?: Record<string, string> }): Promise<unknown> {
    const response = await fetch(url, { method: 'GET', headers: options?.headers });
    return response.json();
  }
}

class ShellExecutor {
  async exec(command: string): Promise<{ stdout: string; stderr: string; code: number }> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    try {
      const { stdout, stderr } = await execAsync(command, { cwd: ROOT, maxBuffer: 10 * 1024 * 1024 });
      return { stdout, stderr, code: 0 };
    } catch (error: unknown) {
      const err = error as { stdout?: string; stderr?: string; code?: number };
      return { stdout: err.stdout || '', stderr: err.stderr || String(error), code: err.code || 1 };
    }
  }
}

class DiscordHelperImpl {
  private client: Client;
  constructor(client: Client) { this.client = client; }

  async reply(messageId: string, options: { content: string }): Promise<void> {
    for (const guild of this.client.guilds.cache.values()) {
      for (const channel of guild.channels.cache.values()) {
        if (channel.isTextBased() && 'messages' in channel) {
          try {
            const message = await (channel as TextChannel).messages.fetch(messageId);
            if (message) { await message.reply(options.content); return; }
          } catch {}
        }
      }
    }
  }

  async sendToChannel(channelId: string, content: string): Promise<string | null> {
    const channel = this.client.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) return null;
    try {
      const msg = await (channel as TextChannel).send(content);
      return msg.id;
    } catch { return null; }
  }

  async editMessage(channelId: string, messageId: string, content: string): Promise<void> {
    const channel = this.client.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) return;
    try {
      const msg = await (channel as TextChannel).messages.fetch(messageId);
      await msg.edit(content);
    } catch {}
  }

  async sendFile(channelId: string, content: string, filename: string): Promise<void> {
    const channel = this.client.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) return;
    try {
      const attachment = new AttachmentBuilder(Buffer.from(content, 'utf-8'), { name: filename });
      await (channel as TextChannel).send({ files: [attachment] });
    } catch {}
  }
}

// ═══════════════════════════════════════════════════════════════
// Skill interface
// ═══════════════════════════════════════════════════════════════

interface Skill {
  name: string;
  description: string;
  initialize?: (ctx: SkillContext) => Promise<void>;
  execute?: (command: unknown, ctx: SkillContext) => Promise<SkillResult>;
  onVoiceMemo?: (memo: VoiceMemoEvent, ctx: SkillContext) => Promise<SkillResult>;
  onReaction?: (reaction: ReactionEvent, ctx: SkillContext) => Promise<SkillResult>;
  categorize?: (text: string, ctx: SkillContext) => Promise<SkillResult>;
  train?: (signal: unknown, ctx: SkillContext) => Promise<SkillResult>;
  onTaskDispatched?: (room: string, prompt: string) => Promise<{ taskId: string; baseline: string } | null>;
  getRoomContext?: (room: string) => string;
  onProcessOutput?: (room: string, data: string) => void;
  onProcessSpawned?: (room: string, pid: number) => void;
  onProcessComplete?: (room: string, output: string, code: number) => void;
}

// ═══════════════════════════════════════════════════════════════
// IntentGuard Runtime
// ═══════════════════════════════════════════════════════════════

export class IntentGuardRuntime {
  private config: IntentGuardConfig;
  private client: Client;
  private skills: Map<string, Skill> = new Map();
  private pendingMemos: Map<string, VoiceMemoEvent> = new Map();
  private logger: Logger;
  private context: SkillContext;
  private shellExecutor: ShellExecutor;

  // Orchestrator modules
  private channelManager!: ChannelManager;
  private taskStore!: TaskStore;
  private transparencyEngine!: TransparencyEngine;
  private handleAuthority!: HandleAuthority;
  private discordHelper!: DiscordHelperImpl;
  private steeringLoop!: SteeringLoop;
  private tweetComposer!: TweetComposer;
  private xPoster!: XPoster;
  private scheduler!: ProactiveScheduler;
  private outputCapture!: OutputCapture;
  private outputPoller!: OutputPoller;
  private fimInterceptor!: FimInterceptor;
  private lastMessageTime: number = Date.now();
  private startTime: number = Date.now();
  private currentSovereignty: number = 0.7; // Updated by pipeline

  // PID registry — tracks spawned child processes for cleanup
  private pidRegistry: Map<number, { room: string; spawnedAt: number }> = new Map();
  private static MAX_TRACKED_PIDS = 20;

  constructor() {
    const configPath = join(ROOT, 'intentguard.json');
    const configRaw = readFileSync(configPath, 'utf-8');
    const configStr = configRaw.replace(/\$\{(\w+)\}/g, (_, name) => process.env[name] || '');
    this.config = JSON.parse(configStr);
    this.logger = new Logger(this.config.logging.level, this.config.logging.file);
    this.shellExecutor = new ShellExecutor();

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
      ],
      partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    });

    this.discordHelper = new DiscordHelperImpl(this.client);

    this.context = {
      config: new ConfigHelper(this.config),
      log: this.logger,
      fs: new FileSystem(ROOT),
      http: new HttpClient(),
      shell: this.shellExecutor,
      discord: this.discordHelper,
      callSkill: this.callSkill.bind(this),
    };
  }

  async start(): Promise<void> {
    this.logger.info('Starting IntentGuard Runtime — Sovereign Engine');
    this.logger.info(`Version: 2.0.0 | Agent: ${this.config.agent.name}`);

    // Ensure data directories
    for (const dir of ['data/attention-corpus', 'data/room-context', 'logs']) {
      const fullPath = join(ROOT, dir);
      if (!existsSync(fullPath)) mkdirSync(fullPath, { recursive: true });
    }

    // Initialize modules
    this.channelManager = new ChannelManager(this.client, this.logger, ROOT);
    this.taskStore = new TaskStore(this.logger, this.shellExecutor, ROOT);
    this.handleAuthority = new HandleAuthority(this.logger);
    this.transparencyEngine = new TransparencyEngine(this.logger, this.config.transparency);
    this.tweetComposer = new TweetComposer(this.logger);
    this.xPoster = new XPoster(this.logger);
    this.scheduler = new ProactiveScheduler(this.logger, ROOT);
    this.outputCapture = new OutputCapture(this.logger, this.shellExecutor);
    this.outputPoller = new OutputPoller(
      this.logger, this.taskStore, this.outputCapture,
      this.channelManager, this.discordHelper, this.config.orchestrator,
    );

    // Initialize steering loop — sovereignty dictates countdown
    this.steeringLoop = new SteeringLoop(
      this.logger,
      {
        askPredictTimeoutMs: this.getSovereigntyTimeout(),
        redirectGracePeriodMs: 5000,
        maxConcurrentPredictions: 3,
      },
      // Execute callback: dispatch to Claude Flow bridge
      async (room: string, prompt: string) => {
        const bridge = this.skills.get('claude-flow-bridge');
        if (!bridge?.execute) return false;
        const result = await bridge.execute(
          { action: 'prompt', payload: { prompt, room } },
          this.context,
        );
        // Tweet the execution
        await this.tweetComposer.post(
          this.tweetComposer.taskTweet(room, prompt.substring(0, 80), result.success, this.currentSovereignty),
        );
        return result.success;
      },
      // Post callback
      async (channelId: string, content: string) => {
        return this.discordHelper.sendToChannel(channelId, content);
      },
      // Edit callback
      async (channelId: string, messageId: string, content: string) => {
        await this.discordHelper.editMessage(channelId, messageId, content);
      },
    );

    // Load latest sovereignty score from pipeline
    this.loadSovereignty();

    // Initialize FIM enforcement
    this.initFimInterceptor();

    // Load skills
    await this.loadSkills();

    // Wire orchestrator hooks
    this.wireOrchestratorHooks();

    // Set up Discord event handlers
    this.setupEventHandlers();

    // Connect to Discord
    const token = this.config.channels.discord.token;
    if (!token) throw new Error('DISCORD_BOT_TOKEN not set');
    await this.client.login(token);
    this.logger.info(`Logged in as ${this.client.user?.tag}`);
  }

  /**
   * Get timeout based on sovereignty score.
   * High trust = 5s, Moderate = 30s, Low = 60s.
   */
  private getSovereigntyTimeout(): number {
    if (this.currentSovereignty >= 0.8) return 5000;   // High trust → 5s
    if (this.currentSovereignty >= 0.6) return 30000;  // Moderate → 30s
    return 60000;                                        // Low → 60s
  }

  /**
   * Load latest sovereignty from pipeline output.
   */
  private loadSovereignty(): void {
    try {
      const identity = loadIdentityFromPipeline(join(ROOT, 'data', 'pipeline-runs'));
      this.currentSovereignty = identity.sovereigntyScore;
      this.logger.info(`Sovereignty loaded: ${this.currentSovereignty.toFixed(3)}`);
      // Sync FIM interceptor
      if (this.fimInterceptor) this.fimInterceptor.reloadIdentity();
    } catch {
      this.logger.warn('Could not load sovereignty — using default 0.7');
      this.currentSovereignty = 0.7;
    }
  }

  private initFimInterceptor(): void {
    this.fimInterceptor = new FimInterceptor(this.logger, join(ROOT, 'data'));

    // On FIM denial → transparency engine + tweet
    this.fimInterceptor.onDenial = async (event) => {
      await this.transparencyEngine.recordDenial(
        event.toolName, event.overlap, event.sovereignty,
        `Skill "${event.skillName}" blocked. Failed: ${event.failedCategories.join(', ')}`
      );
      await this.tweetComposer.post(
        this.tweetComposer.fimDenialTweet(event.toolName, event.overlap, event.sovereignty)
      );
    };

    // On drift threshold → re-run pipeline
    this.fimInterceptor.onDriftThreshold = async () => {
      this.logger.warn('FIM drift threshold reached — re-running pipeline');
      try {
        const { runPipeline } = await import('./pipeline/runner.js');
        await runPipeline({ dataDir: join(ROOT, 'data', 'pipeline-runs') });
        this.loadSovereignty();
      } catch (err) {
        this.logger.error(`Pipeline re-run failed: ${err}`);
      }
    };

    this.logger.info('FIM interceptor initialized — enforcement active');
  }

  private async loadSkills(): Promise<void> {
    const skillsDir = join(ROOT, this.config.skills.directory);
    for (const skillName of this.config.skills.enabled) {
      const skillPath = join(skillsDir, `${skillName}.ts`);
      if (!existsSync(skillPath)) {
        this.logger.warn(`Skill not found: ${skillName} (${skillPath})`);
        continue;
      }
      try {
        const module = await import(skillPath);
        const skill: Skill = new module.default();
        if (skill.initialize) await skill.initialize(this.context);
        this.skills.set(skill.name, skill);
        this.logger.info(`Loaded skill: ${skill.name}`);
      } catch (error) {
        this.logger.error(`Failed to load skill ${skillName}: ${error}`);
      }
    }
  }

  private wireOrchestratorHooks(): void {
    const bridge = this.skills.get('claude-flow-bridge') as Skill | undefined;
    if (!bridge) return;

    bridge.onTaskDispatched = async (room: string, prompt: string) => {
      const channelId = this.channelManager.getChannelForRoom(room) || '';
      const taskId = this.taskStore.create(room, channelId, prompt);
      this.taskStore.updateStatus(taskId, 'dispatched', { dispatchedAt: new Date().toISOString() });

      if (channelId) {
        const msgId = await this.discordHelper.sendToChannel(
          channelId,
          `🚀 **Task ${taskId}** dispatched to **${room}**\n\`${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}\``
        );
        if (msgId) this.taskStore.setDiscordMessageId(taskId, msgId);
      }
      return { taskId, baseline: '' };
    };

    bridge.getRoomContext = (room: string) => this.channelManager.getRoomContext(room);

    // Bridge can post directly to Discord channels
    bridge.onDiscordMessage = async (channelId: string, content: string) => {
      return this.discordHelper.sendToChannel(channelId, content);
    };

    bridge.onProcessOutput = (room: string, data: string) => {
      const task = this.taskStore.getRunningTaskForRoom(room);
      if (task) {
        this.taskStore.appendOutput(task.id, data);
        if (task.status === 'dispatched') this.taskStore.updateStatus(task.id, 'running');
      }
    };

    bridge.onProcessSpawned = (room: string, pid: number) => {
      this.logger.info(`BG process spawned for ${room} (PID: ${pid})`);
      // Track PID for cleanup on shutdown
      if (pid > 0) {
        // Evict oldest if at limit
        if (this.pidRegistry.size >= IntentGuardRuntime.MAX_TRACKED_PIDS) {
          let oldestPid = 0;
          let oldestTime = Infinity;
          for (const [p, info] of this.pidRegistry) {
            if (info.spawnedAt < oldestTime) { oldestTime = info.spawnedAt; oldestPid = p; }
          }
          if (oldestPid) {
            try { process.kill(oldestPid, 'SIGTERM'); } catch { /* already dead */ }
            this.pidRegistry.delete(oldestPid);
            this.logger.warn(`PID eviction: killed oldest PID ${oldestPid} (limit: ${IntentGuardRuntime.MAX_TRACKED_PIDS})`);
          }
        }
        this.pidRegistry.set(pid, { room, spawnedAt: Date.now() });
      }
    };

    bridge.onProcessComplete = async (room: string, output: string, code: number) => {
      const task = this.taskStore.getRunningTaskForRoom(room);
      if (!task) return;

      const status = code === 0 ? 'complete' : 'failed';
      this.taskStore.updateStatus(task.id, status as 'complete' | 'failed');
      this.channelManager.updateRoomContext(room, output);

      // Post to Discord
      const channelId = task.channelId;
      if (channelId) {
        const emoji = code === 0 ? '✅' : '❌';
        const header = `${emoji} **Task ${task.id}** — ${status} (exit ${code})\n`;
        const trimmed = output.trim();

        if (!trimmed) {
          await this.discordHelper.sendToChannel(channelId, `${header}_(no output)_`);
        } else if (trimmed.length <= 1900) {
          await this.discordHelper.sendToChannel(channelId, `${header}\`\`\`\n${trimmed}\n\`\`\``);
        } else {
          await this.discordHelper.sendToChannel(channelId, `${header}_(output: ${trimmed.length} chars, see attachment)_`);
          await this.discordHelper.sendFile(channelId, trimmed, `task-${task.id}-output.txt`);
        }
      }

      // Intelligence Burst — CEO-grade sovereign report
      const isProactive = task.prompt.startsWith('Proactive Protocol');
      const gitHashMatch = output.match(/\b[0-9a-f]{7,40}\b/);
      await this.tweetComposer.post(
        this.tweetComposer.intelligenceBurst(
          room,
          `${isProactive ? 'Proactive' : 'Reactive'}: ${task.prompt.substring(0, 80)}`,
          { success: code === 0, gitHash: gitHashMatch?.[0], output: output.substring(0, 200) },
          this.currentSovereignty,
          isProactive ? 'H3' : 'H2', // Proactive = medium hardness, reactive = lower
          Math.min(1.0, this.currentSovereignty * 1.1), // FIM overlap approximation
          'Appendix H — Geometric IAM',
        ),
      );

      // Record in transparency engine if failed
      if (code !== 0) {
        await this.transparencyEngine.recordSpike({
          timestamp: new Date().toISOString(),
          category: 'reliability',
          delta: -0.05,
          previousScore: 0.8,
          newScore: 0.75,
          source: `task_${task.id}_failed`,
          details: `Task in ${room} failed (exit ${code}): ${task.prompt.substring(0, 100)}`,
        });
      }
    };
  }

  private setupEventHandlers(): void {
    this.client.once(Events.ClientReady, async () => {
      this.logger.info('Discord client ready');

      const orchConfig = this.config.orchestrator;
      if (orchConfig.enabled) {
        for (const guildId of this.config.channels.discord.guild_ids) {
          await this.channelManager.initialize(guildId, orchConfig.channelCategory);
        }

        // Start transparency engine
        const trustDebtChannelId = this.channelManager.getTrustDebtPublicChannelId();
        if (trustDebtChannelId) {
          this.transparencyEngine.start(this.discordHelper, trustDebtChannelId);
        }

        // Bind tweet composer to channels
        const gameChannelId = this.channelManager.getTesseractNuChannelId();
        if (trustDebtChannelId) {
          this.tweetComposer.bind(this.discordHelper, trustDebtChannelId, gameChannelId);
        }

        // Wire pivotal question callback — sends Q+A to cognitive rooms
        this.tweetComposer.onPivotalQuestion = async (room: string, question: string, predictedAnswer: string) => {
          const roomChannelId = this.channelManager.getChannelForRoom(room);
          if (roomChannelId) {
            await this.discordHelper.sendToChannel(
              roomChannelId,
              `${question}\n${predictedAnswer}`,
            );
            this.logger.info(`[PivotalQ] Sent to #${room}: ${question.substring(0, 60)}`);
          }
        };

        // Wire tweet composer to cross-post drafts to #x-posts
        const xPostsChannelId = this.channelManager.getXPostsChannelId();
        if (xPostsChannelId) {
          this.tweetComposer.onTweetPosted = async (tweetText: string) => {
            // Post draft to #x-posts — admin 👍 = publish to X via browser
            await this.discordHelper.sendToChannel(
              xPostsChannelId,
              `📝 **Draft Tweet** — React 👍 to publish to X\n\n${tweetText}`,
            );
          };
          this.logger.info(`XPoster wired → #x-posts (${xPostsChannelId}), 👍 = browser publish`);
        }

        // Wire ProactiveScheduler — the Night Shift
        this.scheduler.bind(
          // Inject callback: push synthetic prompts into steering loop
          async (tier: 'trusted' | 'general', room: string, prompt: string, categories: string[]) => {
            const channelId = this.channelManager.getChannelForRoom(room) || trustDebtChannelId || '';
            await this.steeringLoop.handleMessage(
              tier, room, channelId, prompt,
              { id: 'SYSTEM', username: 'NightShift' },
              categories,
            );
          },
          // Sovereignty getter
          () => this.currentSovereignty,
          // Idle checker
          () => ({
            idleMs: Date.now() - this.lastMessageTime,
            runningTasks: this.taskStore.getByStatus('running').length,
          }),
          // Spec scanner: count remaining todos
          () => {
            try {
              const specPath = join(ROOT, 'spec/sections/08-implementation-plan.tsx');
              const content = readFileSync(specPath, 'utf-8');
              return (content.match(/status:\s*'todo'/g) || []).length;
            } catch { return 0; }
          },
        );
        this.scheduler.start();

        // Start output poller — the "eyes" that read terminal output
        this.outputPoller.start();

        this.logger.info('Orchestrator initialized: channels mapped, transparency engine + tweet composer + ShortRank + XPoster + NightShift + OutputPoller running');
      }
    });

    // Message handler
    this.client.on(Events.MessageCreate, async (message: Message) => {
      if (message.author.bot) return;

      // Track last human message time for Night Shift idle detection
      this.lastMessageTime = Date.now();

      const channelName = (message.channel as { name?: string }).name || message.channelId;
      this.logger.info(`MSG: [#${channelName}] @${message.author.username}: ${message.content.substring(0, 100)}`);

      // Check authorized handles — instant execute
      const isAuthorized = this.handleAuthority.isAuthorized(message.author.username);

      // Voice memo detection
      const hasVoiceMemo = message.attachments.some((att: Attachment) =>
        att.contentType?.startsWith('audio/') || att.name?.endsWith('.ogg') ||
        att.name?.endsWith('.mp3') || att.name?.endsWith('.wav')
      );
      if (hasVoiceMemo) {
        await this.handleVoiceMemo(message);
        return;
      }

      // Commands
      if (message.content.startsWith('!')) {
        await this.handleCommand(message);
        return;
      }

      // Room channel messages
      if (this.channelManager.isRoomChannel(message.channelId)) {
        await this.handleRoomMessage(message, isAuthorized);
        return;
      }

      // Authorized handles in any channel — instant-execute via steering loop
      if (isAuthorized && message.content.trim()) {
        this.logger.info(`AUTHORIZED [${message.author.username}]: instant-execute (any channel)`);
        const prediction = await this.steeringLoop.handleMessage(
          'admin', 'builder', message.channelId, message.content,
          { id: message.author.id, username: message.author.username },
        );
        await message.react(prediction.status === 'completed' ? '⚡' : '❌');
      }
    });

    // Reaction handler
    this.client.on(Events.MessageReactionAdd, async (reaction, user) => {
      if (user.bot) return;
      await this.handleReaction(reaction, user);
    });

    this.client.on(Events.Error, (error) => this.logger.error(`Discord error: ${error.message}`));
  }

  private async handleRoomMessage(message: Message, isAuthorized: boolean): Promise<void> {
    const room = this.channelManager.getRoomForChannel(message.channelId);
    if (!room) return;

    const text = message.content.trim();
    if (!text) return;

    // Voice memo during pending prediction → redirect
    const hasAudio = message.attachments.some((att: Attachment) =>
      att.contentType?.startsWith('audio/') || att.name?.endsWith('.ogg'),
    );
    if (hasAudio && this.steeringLoop.hasPendingPrediction(room)) {
      this.logger.info(`VOICE REDIRECT [${room}]: aborting prediction`);
      await this.steeringLoop.redirect(room, text || 'voice-memo-redirect', 'voice-memo');
      await message.react('🔄');
      return;
    }

    // Text during pending prediction → redirect
    if (this.steeringLoop.hasPendingPrediction(room) && !isAuthorized) {
      this.logger.info(`TEXT REDIRECT [${room}]: "${text.substring(0, 60)}"`);
      await this.steeringLoop.redirect(room, text, 'text');
      await message.react('🔄');
      return;
    }

    // Check running task — STDIN mode (unless authorized = always dispatch new)
    if (!isAuthorized) {
      const runningTask = this.taskStore.getRunningTaskForRoom(room);
      if (runningTask) {
        this.logger.info(`STDIN [${room}]: "${text.substring(0, 80)}"`);
        const bridge = this.skills.get('claude-flow-bridge');
        if (bridge?.execute) {
          const result = await bridge.execute(
            { action: 'stdin', payload: { room, text } },
            this.context,
          );
          await message.react(result.success ? '📥' : '❌');
        }
        return;
      }
    }

    // Determine execution tier
    const tier: ExecutionTier = isAuthorized ? 'admin' : 'general';

    // Categorize for FIM alignment tags
    let categories: string[] = [];
    const categorizer = this.skills.get('thetasteer-categorize');
    if (categorizer?.categorize) {
      const catResult = await categorizer.categorize(text, this.context);
      if (catResult.success && catResult.data) {
        categories = (catResult.data as { categories?: string[] }).categories || [];
      }
    }

    // Route through steering loop
    this.logger.info(`STEERING [${room}] tier=${tier}: "${text.substring(0, 80)}"`);
    const prediction = await this.steeringLoop.handleMessage(
      tier, room, message.channelId, text,
      { id: message.author.id, username: message.author.username },
      categories,
    );

    // React based on outcome
    if (prediction.status === 'completed') {
      await message.react('⚡');
    } else if (prediction.status === 'pending') {
      await message.react(tier === 'general' ? '💡' : '🔮');
    } else {
      await message.react('❌');
    }
  }

  private async handleCommand(message: Message): Promise<void> {
    const [cmd, ...args] = message.content.split(/\s+/);

    switch (cmd) {
      case '!ping':
        await message.reply(`🛡️ IntentGuard alive. Skills: ${[...this.skills.keys()].join(', ')}`);
        break;

      case '!stop': {
        const room = args[0] || this.channelManager.getRoomForChannel(message.channelId);
        if (!room) { await message.reply('Usage: `!stop [room]`'); return; }
        const killed = await this.taskStore.killRoom(room);
        await message.reply(killed ? `🛑 Killed task in **${room}**` : `No running task in **${room}**`);
        break;
      }

      case '!status': {
        const room = args[0] || this.channelManager.getRoomForChannel(message.channelId);
        if (!room) { await message.reply('Usage: `!status [room]`'); return; }
        const task = this.taskStore.getRunningTaskForRoom(room);
        if (task) {
          const age = Math.round((Date.now() - new Date(task.createdAt).getTime()) / 1000);
          await message.reply(`📊 **${room}** — \`${task.id}\` [${task.status}] ${age}s | ${task.output.length} chars`);
        } else {
          await message.reply(`No active task in **${room}**`);
        }
        break;
      }

      case '!tasks': {
        const active = this.taskStore.getByStatus('pending', 'dispatched', 'running');
        if (active.length === 0) { await message.reply('No active tasks'); return; }
        const lines = active.map(t => {
          const age = Math.round((Date.now() - new Date(t.createdAt).getTime()) / 1000);
          return `\`${t.id}\` **${t.room}** [${t.status}] ${age}s`;
        });
        await message.reply(`📋 **Active (${active.length})**\n${lines.join('\n')}`);
        break;
      }

      case '!rooms': {
        const rooms = this.channelManager.getRooms();
        const lines = rooms.map(r => {
          const task = this.taskStore.getRunningTaskForRoom(r);
          return `**${r}** ${task ? `🔴 ${task.id}` : '🟢 idle'}`;
        });
        await message.reply(`🏠 **Rooms**\n${lines.join('\n')}`);
        break;
      }

      case '!handles': {
        const handles = this.handleAuthority.listHandles();
        const lines = handles.map(h => `\`${h.username}\` — ${h.policy} (${h.rooms === 'all' ? 'all rooms' : h.rooms.join(', ')})`);
        await message.reply(`🔐 **Authorized Handles**\n${lines.join('\n')}`);
        break;
      }

      case '!trust': {
        const history = this.transparencyEngine.getHistory(10);
        if (history.length === 0) { await message.reply('No trust-debt spikes recorded'); return; }
        const lines = history.map(s => {
          const dir = s.delta > 0 ? '📈' : '📉';
          return `${dir} \`${s.category}\` ${s.delta > 0 ? '+' : ''}${s.delta.toFixed(3)} — ${s.source}`;
        });
        await message.reply(`🔬 **Recent Trust-Debt Spikes**\n${lines.join('\n')}`);
        break;
      }

      case '!predictions': {
        const active = this.steeringLoop.getActivePredictions();
        if (active.length === 0) { await message.reply('No pending predictions'); return; }
        const lines = active.map(p => {
          const age = Math.round((Date.now() - p.createdAt) / 1000);
          const remaining = Math.max(0, Math.round((p.timeoutMs - (Date.now() - p.createdAt)) / 1000));
          return `🔮 \`${p.id}\` **${p.room}** [${p.tier}] ${age}s elapsed, ${remaining}s left\n  "${p.predictedAction}"`;
        });
        await message.reply(`**Active Predictions (${active.length})**\n${lines.join('\n')}`);
        break;
      }

      case '!abort': {
        const count = this.steeringLoop.abortAll();
        await message.reply(`🛑 Aborted ${count} pending prediction(s)`);
        break;
      }

      case '!tweet': {
        const tweetText = args.join(' ');
        if (!tweetText) { await message.reply('Usage: `!tweet <message>`'); return; }
        await this.tweetComposer.post({
          text: tweetText,
          room: 'operator',
          sovereignty: this.currentSovereignty,
          categories: ['communication'],
          source: 'admin-command',
        });
        await message.react('🐦');
        break;
      }

      case '!sovereignty': {
        this.loadSovereignty();
        const timeout = this.getSovereigntyTimeout() / 1000;
        await message.reply(
          `🔬 **Sovereignty:** ${(this.currentSovereignty * 100).toFixed(1)}%\n` +
          `⏱️ **Ask-Predict Timeout:** ${timeout}s\n` +
          `${this.currentSovereignty >= 0.8 ? '🟢 High trust — 5s countdown' : this.currentSovereignty >= 0.6 ? '🟡 Moderate — 30s countdown' : '🔴 Low trust — 60s countdown'}`
        );
        break;
      }
      case '!grid': {
        // TODO: Wire to tesseract grid client
        await message.reply('🔌 Grid client not yet connected. Phase 4 in progress.');
        break;
      }
      case '!wallet': {
        // TODO: Wire to wallet skill when ready
        await message.reply('💰 Wallet skill not yet connected. Phase 6 in progress.');
        break;
      }
      case '!artifact': {
        // TODO: Wire to artifact-generator skill when ready
        await message.reply('🏆 Artifact generator not yet connected. Phase 7 in progress.');
        break;
      }

      case '!heartbeat': {
        const costReporter = this.skills.get('cost-reporter') as unknown as { getDailySpend?: () => number } | undefined;
        const dailySpend = costReporter?.getDailySpend?.() ?? 0;
        const activeTasks = this.taskStore.getByStatus('running', 'dispatched').length;
        const uptimeHours = (Date.now() - (this.startTime || Date.now())) / (1000 * 60 * 60);
        await this.tweetComposer.post(
          this.tweetComposer.heartbeatTweet(this.currentSovereignty, activeTasks, dailySpend, uptimeHours),
        );
        await message.reply(
          `🫀 **Heartbeat**\n` +
          `Sovereignty: ${(this.currentSovereignty * 100).toFixed(1)}%\n` +
          `Active Tasks: ${activeTasks}\n` +
          `Daily Spend: $${dailySpend.toFixed(4)}\n` +
          `Uptime: ${uptimeHours.toFixed(1)}h\n` +
          `Worker Model: claude-opus-4-6 (50 workers)\n` +
          `Output Poller: ✅ running`
        );
        break;
      }

      case '!budget': {
        const cr = this.skills.get('cost-reporter') as unknown as { getDailySpend?: () => number; getDailyBudget?: () => number; isBudgetExceeded?: () => boolean } | undefined;
        if (!cr?.getDailySpend) { await message.reply('Cost reporter not loaded'); break; }
        const spend = cr.getDailySpend();
        const budget = cr.getDailyBudget?.() ?? 5;
        const exceeded = cr.isBudgetExceeded?.() ?? false;
        await message.reply(
          `💰 **Cost Governor**\n` +
          `Daily Spend: $${spend.toFixed(4)} / $${budget.toFixed(2)}\n` +
          `Status: ${exceeded ? '🔴 BUDGET EXCEEDED → Ollama only' : '🟢 Within budget → Opus workers active'}\n` +
          `Remaining: $${Math.max(0, budget - spend).toFixed(4)}`
        );
        break;
      }
      case '!ceo-status': {
        const statsPath = join(ROOT, 'data', 'ceo-session-stats.json');
        if (existsSync(statsPath)) {
          const stats = JSON.parse(readFileSync(statsPath, 'utf-8'));
          await message.reply(
            `🤖 **CEO Loop Status**\n` +
            `Completed: ${stats.completed} | Failed: ${stats.failed} | Skipped: ${stats.skipped}\n` +
            `Last activity: ${stats.lastActivity}\n` +
            `Session started: ${stats.started}`
          );
        } else {
          await message.reply('CEO loop not running or no stats available.');
        }
        break;
      }
      case '!federation': {
        // TODO: Wire to federation module when ready
        await message.reply('🤝 Federation not yet connected. Phase 8 in progress.');
        break;
      }

      case '!fim': {
        if (!this.fimInterceptor) { await message.reply('FIM interceptor not initialized'); break; }
        const stats = this.fimInterceptor.getStats();
        await message.reply(
          `🔐 **FIM Status**\n` +
          `Sovereignty: ${(stats.sovereignty * 100).toFixed(1)}%\n` +
          `Total Denials: ${stats.totalDenials}\n` +
          `Consecutive Denials: ${stats.consecutiveDenials}/3 (pipeline re-run at 3)\n` +
          `Enforcement: ✅ Active\n` +
          `Threshold: 0.8 overlap\n` +
          `Tools guarded: shell_execute, file_write, file_delete, git_push, git_force_push, deploy, send_email, send_message, crm_update_lead, crm_delete_lead`
        );
        break;
      }

      case '!capabilities': {
        const checklistPath = join(ROOT, 'data', 'capabilities-checklist.json');
        if (!existsSync(checklistPath)) {
          await message.reply('Capabilities checklist not found. Generating...');
          break;
        }
        const checklist = JSON.parse(readFileSync(checklistPath, 'utf-8')) as {
          capabilities: Array<{ name: string; type: string; status: string; description: string }>;
        };
        const byType = new Map<string, typeof checklist.capabilities>();
        for (const cap of checklist.capabilities) {
          if (!byType.has(cap.type)) byType.set(cap.type, []);
          byType.get(cap.type)!.push(cap);
        }
        const statusIcon = (s: string) => s === 'tested' ? '✅' : s === 'untested' ? '⚠️' : '❌';
        const sections = [...byType.entries()].map(([type, caps]) => {
          const lines = caps.map(c => `${statusIcon(c.status)} \`${c.name}\` — ${c.description}`);
          return `**${type.toUpperCase()}** (${caps.length})\n${lines.join('\n')}`;
        });
        const total = checklist.capabilities.length;
        const tested = checklist.capabilities.filter(c => c.status === 'tested').length;
        const header = `📋 **Capabilities Checklist** — ${tested}/${total} tested\n`;
        await message.reply(header + sections.join('\n\n'));
        break;
      }






      case '!pipeline': {
        this.logger.info('Running trust-debt pipeline...');
        await message.reply('🔬 Running trust-debt pipeline...');
        try {
          const { runPipeline } = await import('./pipeline/runner.js');
          const result = await runPipeline({ dataDir: join(ROOT, 'data', 'pipeline-runs') });
          this.loadSovereignty();

          // Tweet the pipeline result
          const sov = result.identity?.sovereigntyScore ?? this.currentSovereignty;
          await this.tweetComposer.post(
            this.tweetComposer.pipelineTweet(sov, 0, 0, result.identity?.categoryCount ?? 0),
          );

          await message.reply(
            `✅ **Pipeline Complete** (${result.totalDurationMs}ms)\n` +
            `Sovereignty: ${(sov * 100).toFixed(1)}% | ` +
            `Steps: ${result.steps.filter(s => s.success).length}/${result.steps.length} passed`
          );
        } catch (err) {
          await message.reply(`❌ Pipeline failed: ${err}`);
        }
        break;
      }
    }
  }

  private async handleVoiceMemo(message: Message): Promise<void> {
    const voiceMemos = message.attachments.filter((att: Attachment) =>
      att.contentType?.startsWith('audio/') || att.name?.endsWith('.ogg') ||
      att.name?.endsWith('.mp3') || att.name?.endsWith('.wav')
    );

    for (const [, attachment] of voiceMemos) {
      const memo: VoiceMemoEvent = {
        messageId: message.id, channelId: message.channelId,
        guildId: message.guildId || '', audioUrl: attachment.url,
        duration: attachment.duration || 0,
        author: { id: message.author.id, username: message.author.username },
      };

      this.pendingMemos.set(message.id, memo);
      const skill = this.skills.get('voice-memo-reactor');
      if (skill?.onVoiceMemo) await skill.onVoiceMemo(memo, this.context);
    }
  }

  private async handleReaction(reaction: unknown, user: unknown): Promise<void> {
    const r = reaction as { emoji: { name: string }; message: { id: string; partial?: boolean; fetch: () => Promise<Message>; content?: string; channelId?: string } };
    const u = user as { bot: boolean; id: string; username: string };

    const emoji = r.emoji.name || '';
    const isAdmin = this.handleAuthority.isAuthorized(u.username);
    const isAuthorizedReactor = this.config.channels.discord.voiceMemo.authorizedReactors.includes(u.id) || isAdmin;

    // ─── X/Twitter posting: 👍 on #x-posts → browser publish ───
    if (isAdmin && (emoji === '👍' || emoji === '🐦') && r.message.channelId && this.channelManager.isXPostsChannel(r.message.channelId as string)) {
      try {
        const message = r.message.partial ? await r.message.fetch() : r.message as unknown as Message;
        const content = message.content || '';
        // Extract tweet text from draft format: skip the "Draft Tweet" header
        const tweetText = content.replace(/^📝 \*\*Draft Tweet\*\*.+?\n\n/s, '').trim();
        if (tweetText) {
          this.logger.info(`[XPoster] Admin ${u.username} approved tweet: "${tweetText.substring(0, 60)}..."`);
          await this.discordHelper.sendToChannel(r.message.channelId as string, `🚀 Publishing to X...`);
          const result = await this.xPoster.post(tweetText, r.message.id);
          const statusEmoji = result.success ? '✅' : '❌';
          const reply = result.tweetUrl
            ? `${statusEmoji} Published: ${result.tweetUrl}`
            : `${statusEmoji} ${result.message}`;
          await this.discordHelper.sendToChannel(r.message.channelId as string, reply);
        }
      } catch (error) {
        this.logger.error(`[XPoster] Reaction handling failed: ${error}`);
      }
      return;
    }

    // ─── Tweet reactions (admin only) ─────────────────────────
    if (isAdmin && (emoji === '🐦' || emoji === '🕊️' || emoji === '🔄')) {
      const result = await this.tweetComposer.handleReaction(r.message.id, emoji, true);
      if (result) {
        this.logger.info(`TWEET REACTION: ${emoji} by ${u.username} → ${result}`);
      }
      return;
    }

    // ─── Admin thumbs-up = bless a suggestion ─────────────────
    if (isAdmin && (emoji === '👍' || emoji === '🔥' || emoji === '⚡')) {
      const blessed = await this.steeringLoop.adminBless(r.message.id, u.username);
      if (blessed) {
        this.logger.info(`ADMIN BLESSED: ${u.username} 👍 → executing suggestion`);
        return;
      }
      // If not a queued suggestion, fall through to normal handling
    }

    // ─── Voice memo reaction triggers ─────────────────────────
    const triggers = this.config.channels.discord.voiceMemo.reactionTriggers;
    if (!triggers.includes(emoji)) return;
    if (!isAuthorizedReactor) return;

    this.logger.info(`AUTHORIZED REACTION: ${emoji} by ${u.username} on ${r.message.id}`);

    if (this.pendingMemos.has(r.message.id)) {
      const skill = this.skills.get('voice-memo-reactor');
      if (skill?.onReaction) {
        await skill.onReaction({
          messageId: r.message.id, emoji, userId: u.id, timestamp: new Date(),
        }, this.context);
      }
    } else {
      // Admin reaction on any message → dispatch via steering loop
      try {
        const message = r.message.partial ? await r.message.fetch() : r.message as unknown as Message;
        const content = message.content;
        if (content && isAdmin) {
          const room = this.channelManager.getRoomForChannel(message.channelId as string) || 'builder';
          const prediction = await this.steeringLoop.handleMessage(
            'admin', room, message.channelId as string, content,
            { id: u.id, username: u.username },
          );
          try {
            await (message as Message).reply(
              `${emoji} → **${room}**: "${content.substring(0, 60)}${content.length > 60 ? '...' : ''}"\nStatus: ${prediction.status}`,
            );
          } catch {}
        }
      } catch (error) {
        this.logger.error(`Reaction handling failed: ${error}`);
      }
    }
  }

  private async callSkill(name: string, payload: unknown): Promise<SkillResult> {
    const skill = this.skills.get(name);
    if (!skill) return { success: false, message: `Skill not found: ${name}` };

    // FIM permission check before execution
    if (this.fimInterceptor) {
      const denial = await this.fimInterceptor.intercept(name, payload);
      if (denial) return denial;
    }

    if (skill.execute) return skill.execute(payload, this.context);
    if (skill.categorize && name === 'thetasteer-categorize') return skill.categorize((payload as { text: string }).text, this.context);
    if (skill.train && name === 'tesseract-trainer') return skill.train(payload, this.context);
    return { success: false, message: `Skill ${name} has no execute method` };
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping IntentGuard Runtime...');
    this.outputPoller.stop();
    this.scheduler.stop();
    this.steeringLoop.abortAll();
    this.transparencyEngine.stop();
    this.client.destroy();

    // Kill all tracked child processes
    if (this.pidRegistry.size > 0) {
      this.logger.info(`Cleaning up ${this.pidRegistry.size} tracked child processes...`);
      for (const [pid, info] of this.pidRegistry) {
        try {
          process.kill(pid, 'SIGTERM');
          this.logger.info(`Killed PID ${pid} (${info.room})`);
        } catch {
          // Process already exited — expected
        }
      }
      this.pidRegistry.clear();
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// CLI Entry Point
// ═══════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  const runtime = new IntentGuardRuntime();

  process.on('SIGINT', async () => { await runtime.stop(); process.exit(0); });
  process.on('SIGTERM', async () => { await runtime.stop(); process.exit(0); });

  await runtime.start();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
