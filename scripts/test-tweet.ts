/**
 * Generate tweet with Qwen 14B → Post to X via Safari intent URL + keyboard
 * Usage: npx tsx scripts/test-tweet.ts [optional topic]
 */
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

async function main() {
  const topic = process.argv.slice(2).join(' ') || 'AI sovereignty — systems that measure their own trust debt are more reliable';

  // Step 1: Generate tweet with Qwen 14B
  console.log('🔄 Generating tweet with Qwen 14B...');
  console.log(`   Topic: ${topic}\n`);

  const resp = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen2.5:14b-instruct-q6_K',
      prompt: `You are a tweet writer for IntentGuard — an AI sovereignty project building trust-measuring AI.
Write one punchy tweet about: ${topic}

Rules:
- Under 240 characters
- Technical but accessible
- Present tense, active voice
- No hashtags, no quotes, no emojis
- One clear insight
- Just the tweet text, nothing else`,
      stream: false,
      options: { temperature: 0.7, num_predict: 80 },
    }),
  });

  const data = await resp.json() as { response?: string };
  let tweet = (data.response || '').trim();
  tweet = tweet.replace(/^["']|["']$/g, '').split('\n')[0].trim();
  if (tweet.length > 240) tweet = tweet.substring(0, 237) + '...';

  console.log(`🐦 Draft (${tweet.length} chars):\n   ${tweet}\n`);

  // Step 2: Open X compose intent in Safari (pre-fills tweet text)
  const encodedTweet = encodeURIComponent(tweet);
  const intentUrl = `https://x.com/intent/post?text=${encodedTweet}`;

  console.log('🚀 Opening Safari with pre-filled tweet...');
  await execAsync(`open -a Safari "${intentUrl}"`);
  await new Promise(r => setTimeout(r, 5000));

  // Step 3: Use System Events (keyboard) to click Post
  // The X intent page has the Post button — we use Cmd+Enter (X's keyboard shortcut for Post)
  console.log('📤 Pressing Cmd+Enter to post (X keyboard shortcut)...');

  const keyScript = `
tell application "Safari"
  activate
  delay 0.5
end tell
tell application "System Events"
  tell process "Safari"
    -- Cmd+Enter is X's shortcut for posting
    key code 36 using {command down}
  end tell
end tell
`;

  try {
    await execAsync(`osascript -e '${keyScript.replace(/'/g, "'\\''")}'`, { timeout: 10000 });
    console.log('✅ Cmd+Enter sent! Tweet should be posting...');

    // Wait a moment, then check
    await new Promise(r => setTimeout(r, 3000));
    console.log('🎉 Check your X timeline: https://x.com/thetadriven');
  } catch (err: any) {
    console.log(`⚠️  Keyboard automation error: ${err.message}`);
    console.log('   The tweet is pre-filled in Safari — click Post manually or press Cmd+Enter.');
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
