/**
 * tests/discord-roundtrip.test.js — Discord Round-Trip Test
 *
 * Tests the full Discord messaging cycle:
 * 1. Connect to Discord
 * 2. Find the guild and channel
 * 3. Send a ShortRank-tagged message
 * 4. Fetch it back
 * 5. Verify the content
 * 6. Send a pivotal question
 * 7. Clean up
 *
 * Usage: node tests/discord-roundtrip.test.js
 */

import { Client, GatewayIntentBits, ChannelType } from 'discord.js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { intersection, pivotalQuestion } from '../src/discord/shortrank-notation.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually (same pattern as test-tweet.ts)
const envPath = join(__dirname, '..', '.env');
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
  console.error('❌ Missing DISCORD_BOT_TOKEN or THETADRIVEN_GUILD_ID');
  process.exit(1);
}

// Test state
const testResults = {
  connected: false,
  guildFound: false,
  channelFound: false,
  messageSent: false,
  messageFetched: false,
  contentMatches: false,
  pivotalQuestionSent: false,
  cleanedUp: false,
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', async () => {
  console.log('✅ Connected to Discord as', client.user?.tag);
  testResults.connected = true;

  let sentMessageId = null;
  let pivotalMessageId = null;

  try {
    // Step 1: Find the guild
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      console.error(`❌ Guild ${guildId} not found`);
      client.destroy();
      process.exit(1);
    }
    console.log(`✅ Found guild: ${guild.name}`);
    testResults.guildFound = true;

    // Step 2: Find #trust-debt-public channel
    const channel = guild.channels.cache.find(
      ch => ch.type === ChannelType.GuildText && ch.name === 'trust-debt-public',
    );

    if (!channel || !channel.isTextBased()) {
      console.error('❌ #trust-debt-public not found or not a text channel');
      client.destroy();
      process.exit(1);
    }
    console.log(`✅ Found channel: #${channel.name}`);
    testResults.channelFound = true;

    // Step 3: Send a ShortRank-tagged test message
    // Using intersection('A2', 'C2') for Strategy.Goal : Operations.Loop
    const ix = intersection('A2', 'C2');
    const sovereignty = 0.75;
    const sovEmoji = sovereignty >= 0.8 ? '🟢' : sovereignty >= 0.6 ? '🟡' : '🔴';

    const testMessage = `${ix.notation}
Discord round-trip test: verifying message send/fetch cycle with ShortRank notation.
Test timestamp: ${new Date().toISOString()}
${sovEmoji} S:${(sovereignty * 100).toFixed(0)}% | #testing #roundtrip | #IntentGuard`;

    console.log('\n📤 Sending test message...');
    console.log('---');
    console.log(testMessage);
    console.log('---');

    const sentMessage = await channel.send(testMessage);
    sentMessageId = sentMessage.id;
    console.log(`✅ Message sent! ID: ${sentMessageId}`);
    testResults.messageSent = true;

    // Step 4: Wait 2 seconds
    console.log('⏳ Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 5: Fetch the message back from the channel
    console.log('📥 Fetching message back...');
    const fetchedMessage = await channel.messages.fetch(sentMessageId);

    if (!fetchedMessage) {
      console.error('❌ Failed to fetch message back');
      client.destroy();
      process.exit(1);
    }
    console.log(`✅ Message fetched! ID: ${fetchedMessage.id}`);
    testResults.messageFetched = true;

    // Step 6: Verify the message contains the ShortRank notation prefix
    const expectedPrefix = ix.notation;
    if (fetchedMessage.content.includes(expectedPrefix)) {
      console.log('✅ Content matches: ShortRank notation prefix found');
      testResults.contentMatches = true;
    } else {
      console.error('❌ Content mismatch: ShortRank notation prefix not found');
      console.log('Expected prefix:', expectedPrefix);
      console.log('Actual content:', fetchedMessage.content);
    }

    // Step 7: Send a pivotal question to the channel
    const pq = pivotalQuestion('A2', 'round-trip test');
    const pivotalMsg = `**Pivotal Question (Round-Trip Test):** ${pq.question}
**Predicted Answer:** ${pq.predictedAnswer}
**Routes to:** #${pq.room}`;

    console.log('\n📤 Sending pivotal question...');
    console.log('---');
    console.log(pivotalMsg);
    console.log('---');

    const pivotalSentMessage = await channel.send(pivotalMsg);
    pivotalMessageId = pivotalSentMessage.id;
    console.log(`✅ Pivotal question sent! ID: ${pivotalMessageId}`);
    testResults.pivotalQuestionSent = true;

    // Step 8: Clean up - delete test messages
    console.log('\n🧹 Cleaning up test messages...');
    try {
      await sentMessage.delete();
      console.log(`✅ Deleted test message: ${sentMessageId}`);

      if (pivotalMessageId) {
        await pivotalSentMessage.delete();
        console.log(`✅ Deleted pivotal question: ${pivotalMessageId}`);
      }
      testResults.cleanedUp = true;
    } catch (err) {
      console.warn('⚠️  Cleanup failed (messages may remain):', err.message);
      // Don't fail the test on cleanup failure
      testResults.cleanedUp = false;
    }

    // Step 9: Report results
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Connected:          ${testResults.connected ? '✅' : '❌'}`);
    console.log(`Guild found:        ${testResults.guildFound ? '✅' : '❌'}`);
    console.log(`Channel found:      ${testResults.channelFound ? '✅' : '❌'}`);
    console.log(`Message sent:       ${testResults.messageSent ? '✅' : '❌'}`);
    console.log(`Message fetched:    ${testResults.messageFetched ? '✅' : '❌'}`);
    console.log(`Content matches:    ${testResults.contentMatches ? '✅' : '❌'}`);
    console.log(`Pivotal Q sent:     ${testResults.pivotalQuestionSent ? '✅' : '❌'}`);
    console.log(`Cleaned up:         ${testResults.cleanedUp ? '✅' : '⚠️'}`);
    console.log('='.repeat(60));

    const allPassed = testResults.connected
      && testResults.guildFound
      && testResults.channelFound
      && testResults.messageSent
      && testResults.messageFetched
      && testResults.contentMatches
      && testResults.pivotalQuestionSent;

    if (allPassed) {
      console.log('\n🎉 ALL TESTS PASSED!');
      console.log('\n📋 Summary:');
      console.log(`   - Message sent with ShortRank intersection: ${ix.compact}`);
      console.log(`   - Message fetched successfully from #trust-debt-public`);
      console.log(`   - Content verification: ShortRank notation preserved`);
      console.log(`   - Pivotal question generated and sent to cognitive room: #${pq.room}`);
      console.log(`   - Cleanup: ${testResults.cleanedUp ? 'completed' : 'partial (manual cleanup may be needed)'}`);
    } else {
      console.log('\n❌ SOME TESTS FAILED - see details above');
      client.destroy();
      process.exit(1);
    }

  } catch (err) {
    console.error('\n❌ Test failed with error:', err);
    client.destroy();
    process.exit(1);
  }

  // Step 10: Disconnect
  console.log('\n🔌 Disconnecting from Discord...');
  client.destroy();
  console.log('✅ Disconnected');
  process.exit(0);
});

client.on('error', (err) => {
  console.error('❌ Discord client error:', err);
  process.exit(1);
});

console.log('🔌 Connecting to Discord...');
client.login(token);
