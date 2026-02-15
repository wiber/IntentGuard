/**
 * test-tweet.ts — Send a tweet with ShortRank intersection notation
 * Usage: npx tsx test-tweet.ts
 */

import { Client, GatewayIntentBits, TextChannel, ChannelType } from 'discord.js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { intersection, pivotalQuestion } from './src/discord/shortrank-notation.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env
const envPath = join(__dirname, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([^#]\w*)=(.*)$/);
    if (m && m[1] && !process.env[m[1]]) {
      process.env[m[1]] = m[2];
    }
  }
}

const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.THETADRIVEN_GUILD_ID;

if (!token || !guildId) {
  console.error('Missing DISCORD_BOT_TOKEN or THETADRIVEN_GUILD_ID');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once('ready', async () => {
  console.log(`Bot logged in as ${client.user?.tag}`);

  const guild = client.guilds.cache.get(guildId!);
  if (!guild) {
    console.error(`Guild ${guildId} not found`);
    client.destroy();
    process.exit(1);
  }

  // Find #trust-debt-public
  const channel = guild.channels.cache.find(
    ch => ch.type === ChannelType.GuildText && ch.name === 'trust-debt-public',
  ) as TextChannel | undefined;

  if (!channel) {
    console.error('#trust-debt-public not found');
    client.destroy();
    process.exit(1);
  }

  // Build the ShortRank intersection tweet
  // Source: C2 Operations.Loop (pipeline/integration work)
  // Target: B3 Tactics.Signal (broadcasting the update)
  const ix = intersection('C2', 'B3');
  const sovereignty = 0.577;
  const sovEmoji = sovereignty >= 0.8 ? '🟢' : sovereignty >= 0.6 ? '🟡' : '🔴';

  const tweet = `${ix.notation}
ShortRank notation wired into all tweets. Every update now tagged with tesseract cell intersection.
Pipeline: 566 docs, 6171 signals, 20/20 categories. Pivotal Q+A routed to cognitive rooms.
${sovEmoji} S:${(sovereignty * 100).toFixed(0)}% | #trust_debt #transparency | #IntentGuard`;

  console.log('---');
  console.log(tweet);
  console.log('---');
  console.log(`Sending to #${channel.name}...`);

  try {
    const msg = await channel.send(tweet);
    console.log(`SENT! Message ID: ${msg.id}`);

    // Also send pivotal question to the channel (simulating cognitive room routing)
    const pq = pivotalQuestion('C2', 'ShortRank notation integration');
    const pqMsg = `**Pivotal Question:** ${pq.question}\n**Predicted Answer:** ${pq.predictedAnswer}`;
    console.log(`\nPivotal Q for #${pq.room}:`);
    console.log(pqMsg);

    const pqSent = await channel.send(pqMsg);
    console.log(`Pivotal Q sent! Message ID: ${pqSent.id}`);
  } catch (err) {
    console.error('Send failed:', err);
  }

  client.destroy();
  process.exit(0);
});

client.login(token);
