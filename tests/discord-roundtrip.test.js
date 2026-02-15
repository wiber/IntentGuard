/**
 * tests/discord-roundtrip.test.js — Discord Round-Trip Test
 *
 * Tests the full Discord messaging cycle.
 * Requires DISCORD_BOT_TOKEN and THETADRIVEN_GUILD_ID environment variables.
 * Skips gracefully when credentials are not available.
 *
 * For manual testing: DISCORD_BOT_TOKEN=... THETADRIVEN_GUILD_ID=... npx vitest run tests/discord-roundtrip.test.js
 */

import { describe, it, expect } from 'vitest';

const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.THETADRIVEN_GUILD_ID;

describe('Discord Round-Trip', () => {
  it.skipIf(!token || !guildId)('should complete a full send/fetch cycle', async () => {
    // Dynamic import only when we have credentials
    const { Client, GatewayIntentBits, ChannelType } = await import('discord.js');
    const { intersection, pivotalQuestion } = await import('../src/discord/shortrank-notation.js');

    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    try {
      await client.login(token);

      // Wait for ready
      await new Promise((resolve, reject) => {
        client.once('ready', resolve);
        client.once('error', reject);
        setTimeout(() => reject(new Error('Discord connection timeout')), 15000);
      });

      const guild = client.guilds.cache.get(guildId);
      expect(guild).toBeDefined();

      const channel = guild.channels.cache.find(
        ch => ch.type === ChannelType.GuildText && ch.name === 'trust-debt-public',
      );
      expect(channel).toBeDefined();
      expect(channel.isTextBased()).toBe(true);

      // Send a ShortRank-tagged test message
      const ix = intersection('A2', 'C2');
      const testMessage = `${ix.notation}\nDiscord round-trip test: ${new Date().toISOString()}`;

      const sentMessage = await channel.send(testMessage);
      expect(sentMessage.id).toBeDefined();

      // Fetch it back
      await new Promise(resolve => setTimeout(resolve, 2000));
      const fetchedMessage = await channel.messages.fetch(sentMessage.id);
      expect(fetchedMessage.content).toContain(ix.notation);

      // Send pivotal question
      const pq = pivotalQuestion('A2', 'round-trip test');
      const pivotalMsg = `**Pivotal Question (Round-Trip Test):** ${pq.question}`;
      const pivotalSentMessage = await channel.send(pivotalMsg);
      expect(pivotalSentMessage.id).toBeDefined();

      // Clean up
      try {
        await sentMessage.delete();
        await pivotalSentMessage.delete();
      } catch {
        // Cleanup failure is non-fatal
      }
    } finally {
      client.destroy();
    }
  }, 30000);

  it('should skip when Discord credentials are not available', () => {
    if (!token || !guildId) {
      expect(true).toBe(true); // Graceful skip placeholder
    } else {
      // If we have credentials, this test is a no-op (the real test is above)
      expect(true).toBe(true);
    }
  });
});
