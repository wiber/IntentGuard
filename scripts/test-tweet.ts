/**
 * Quick test: Generate tweet with Qwen 14B → Post to X via Playwright WebKit
 * Usage: npx tsx scripts/test-tweet.ts
 */

async function main() {
  // Step 1: Generate tweet with Qwen 14B
  console.log('🔄 Generating tweet with Qwen 14B...');
  const resp = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen2.5:14b-instruct-q6_K',
      prompt: `You are a tweet writer for IntentGuard — an AI sovereignty project.
Write one punchy tweet about: AI sovereignty — why systems that measure their own trust debt are more reliable than those that don't

Rules:
- Under 200 characters
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

  // Clean up: remove quotes, trailing notes, enforce limit
  tweet = tweet.replace(/^["']|["']$/g, '').split('\n')[0].trim();
  if (tweet.length > 200) tweet = tweet.substring(0, 197) + '...';

  console.log(`\n🐦 Draft (${tweet.length} chars):\n${tweet}\n`);

  // Step 2: Post to X via Playwright WebKit
  console.log('🚀 Launching Playwright WebKit...');
  const { webkit } = await import('playwright');

  const browser = await webkit.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('📡 Navigating to x.com/compose/post...');
  await page.goto('https://x.com/compose/post', {
    waitUntil: 'domcontentloaded',
    timeout: 20000,
  });

  // Check login state
  const url = page.url();
  console.log(`📍 Current URL: ${url}`);

  if (url.includes('/login') || url.includes('/i/flow/login')) {
    console.log('❌ Not logged in to X.com — need Safari cookies');
    console.log('   Keeping browser open for manual login...');
    console.log('   Press Ctrl+C to close after logging in');

    // Wait indefinitely so user can log in manually
    await new Promise(() => {});
  }

  // Wait for page to fully load
  await page.waitForTimeout(3000);

  // Debug: dump all data-testid elements
  const testIds = await page.evaluate(() => {
    const els = document.querySelectorAll('[data-testid]');
    return Array.from(els).map(el => ({
      testId: el.getAttribute('data-testid'),
      tag: el.tagName,
      role: el.getAttribute('role'),
    }));
  });
  console.log('📋 Found data-testid elements:', JSON.stringify(testIds.slice(0, 20), null, 2));

  // Try multiple selectors
  const selectors = [
    '[data-testid="tweetTextarea_0"]',
    '[data-testid="tweetTextarea_0_label"]',
    '[role="textbox"]',
    '.public-DraftEditor-content',
    '[contenteditable="true"]',
    'div[data-contents="true"]',
    '.DraftEditor-root',
  ];

  let textbox = null;
  for (const sel of selectors) {
    const loc = page.locator(sel).first();
    const visible = await loc.isVisible().catch(() => false);
    console.log(`  ${sel}: ${visible ? '✅ VISIBLE' : '❌ not found'}`);
    if (visible && !textbox) textbox = loc;
  }

  if (!textbox) {
    // Take screenshot for debugging
    await page.screenshot({ path: '/tmp/x-compose-debug.png' });
    console.log('📸 Screenshot saved to /tmp/x-compose-debug.png');
    await browser.close();
    throw new Error('No compose textarea found — check screenshot');
  }

  // Type the tweet
  console.log('⌨️  Typing tweet...');
  await textbox.click();
  await page.keyboard.type(tweet, { delay: 25 });

  // Click Post
  console.log('📤 Clicking Post button...');
  const postBtn = page.locator('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]').first();
  await postBtn.waitFor({ state: 'visible', timeout: 5000 });
  await postBtn.click();

  // Wait for navigation
  console.log('⏳ Waiting for confirmation...');
  try {
    await page.waitForURL(u => !u.href.includes('/compose'), { timeout: 15000 });
  } catch {
    console.log('⚠️  Still on compose page after 15s');
  }

  await page.waitForTimeout(2000);
  const finalUrl = page.url();
  console.log(`📍 Final URL: ${finalUrl}`);

  if (finalUrl.includes('/status/')) {
    console.log(`✅ Tweet posted: ${finalUrl}`);
  } else {
    console.log('✅ Tweet likely posted (URL not captured)');
  }

  await browser.close();
  console.log('🎉 Done!');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
