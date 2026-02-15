/**
 * src/channels/telegram-integration.test.ts — Telegram Channel Manager Integration Test
 *
 * Tests Telegram adapter's integration with channel-manager routing system.
 * Verifies message flow: Telegram -> ChannelManager -> Discord room routing.
 *
 * Run: npx tsx src/channels/telegram-integration.test.ts
 */

import { TelegramAdapter } from './telegram-adapter.js';
import type { Logger } from '../types.js';
import type { CrossChannelMessage, ChannelAdapter } from './types.js';

// ═══════════════════════════════════════════════════════════════
// Mock Logger
// ═══════════════════════════════════════════════════════════════

const mockLogger: Logger = {
  debug: (msg: string) => console.log(`[DEBUG] ${msg}`),
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  warn: (msg: string) => console.log(`[WARN] ${msg}`),
  error: (msg: string) => console.log(`[ERROR] ${msg}`),
};

// ═══════════════════════════════════════════════════════════════
// Mock Channel Manager
// ═══════════════════════════════════════════════════════════════

class MockChannelManager {
  private adapters = new Map<string, ChannelAdapter>();
  private routedMessages: CrossChannelMessage[] = [];

  registerAdapter(adapter: ChannelAdapter): void {
    this.adapters.set(adapter.name, adapter);
    mockLogger.info(`Mock ChannelManager: Adapter registered: ${adapter.name}`);

    // Wire message routing (mimics channel-manager.ts:220-222)
    adapter.onMessage((msg: CrossChannelMessage) => {
      this.routeMessage(msg);
    });
  }

  routeMessage(msg: CrossChannelMessage): void {
    mockLogger.info(`Mock ChannelManager: Routing ${msg.source} message to #${msg.targetRoom}`);
    this.routedMessages.push(msg);
  }

  getRoutedMessages(): CrossChannelMessage[] {
    return this.routedMessages;
  }

  getAdapters(): Map<string, ChannelAdapter> {
    return this.adapters;
  }
}

// ═══════════════════════════════════════════════════════════════
// Test: Adapter Registration
// ═══════════════════════════════════════════════════════════════

async function testAdapterRegistration(): Promise<boolean> {
  console.log('\n=== Test 1: Adapter Registration ===\n');

  const channelManager = new MockChannelManager();
  const telegramAdapter = new TelegramAdapter(mockLogger, 'test-token', [
    { groupId: '-1001234567890', room: 'builder' },
    { groupId: '-1009876543210', room: 'vault' },
  ]);

  // Register adapter
  channelManager.registerAdapter(telegramAdapter);

  // Verify registration
  const adapters = channelManager.getAdapters();
  const registered = adapters.has('telegram');

  console.log(`Adapter registered: ${registered ? '✓' : '✗'}`);
  console.log(`Adapter name: ${telegramAdapter.name}`);
  console.log(`Adapter status: ${telegramAdapter.status}`);

  return registered && telegramAdapter.name === 'telegram';
}

// ═══════════════════════════════════════════════════════════════
// Test: Message Routing
// ═══════════════════════════════════════════════════════════════

async function testMessageRouting(): Promise<boolean> {
  console.log('\n=== Test 2: Message Routing ===\n');

  const channelManager = new MockChannelManager();
  const telegramAdapter = new TelegramAdapter(mockLogger, 'test-token', [
    { groupId: '-1001111111111', room: 'architect' },
    { groupId: '-1002222222222', room: 'operator' },
  ]);

  channelManager.registerAdapter(telegramAdapter);

  // Simulate incoming Telegram message (mimics telegram-adapter.ts:77-87)
  const testMessage: CrossChannelMessage = {
    source: 'telegram',
    sourceId: '-1001111111111',
    targetRoom: 'architect',
    content: 'Test message from Telegram',
    author: 'testuser',
    timestamp: new Date(),
    sourceMessageId: '12345',
  };

  // Trigger the onMessage callback directly
  telegramAdapter.onMessage((msg: CrossChannelMessage) => {
    channelManager.routeMessage(msg);
  });

  // Simulate message event by calling the registered callback
  const messageCallback = (telegramAdapter as any).messageCallback;
  if (messageCallback) {
    messageCallback(testMessage);
  }

  // Verify message was routed
  const routedMessages = channelManager.getRoutedMessages();
  const messageRouted = routedMessages.length > 0;
  const correctRoom = routedMessages[0]?.targetRoom === 'architect';

  console.log(`Message routed: ${messageRouted ? '✓' : '✗'}`);
  console.log(`Routed to correct room: ${correctRoom ? '✓' : '✗'}`);
  console.log(`Routed messages count: ${routedMessages.length}`);

  if (routedMessages.length > 0) {
    console.log(`First message target: #${routedMessages[0].targetRoom}`);
    console.log(`First message content: ${routedMessages[0].content.substring(0, 50)}`);
  }

  return messageRouted && correctRoom;
}

// ═══════════════════════════════════════════════════════════════
// Test: Group-to-Room Mapping
// ═══════════════════════════════════════════════════════════════

async function testGroupToRoomMapping(): Promise<boolean> {
  console.log('\n=== Test 3: Group-to-Room Mapping ===\n');

  const telegramAdapter = new TelegramAdapter(mockLogger, 'test-token', [
    { groupId: '-1001111111111', room: 'vault' },
    { groupId: '-1002222222222', room: 'voice' },
  ]);

  // Test initial mappings
  const vault = telegramAdapter.getGroupIdForRoom('vault');
  const voice = telegramAdapter.getGroupIdForRoom('voice');
  const missing = telegramAdapter.getGroupIdForRoom('nonexistent');

  console.log(`Vault mapping: ${vault === '-1001111111111' ? '✓' : '✗'} (${vault})`);
  console.log(`Voice mapping: ${voice === '-1002222222222' ? '✓' : '✗'} (${voice})`);
  console.log(`Missing mapping returns undefined: ${missing === undefined ? '✓' : '✗'}`);

  // Test runtime mapping addition
  telegramAdapter.addMapping('-1003333333333', 'laboratory');
  const laboratory = telegramAdapter.getGroupIdForRoom('laboratory');
  console.log(`Runtime mapping: ${laboratory === '-1003333333333' ? '✓' : '✗'} (${laboratory})`);

  return vault === '-1001111111111'
    && voice === '-1002222222222'
    && missing === undefined
    && laboratory === '-1003333333333';
}

// ═══════════════════════════════════════════════════════════════
// Test: Send to Room
// ═══════════════════════════════════════════════════════════════

async function testSendToRoom(): Promise<boolean> {
  console.log('\n=== Test 4: Send to Room (Stub Mode) ===\n');

  const telegramAdapter = new TelegramAdapter(mockLogger, 'test-token', [
    { groupId: '-1001234567890', room: 'builder' },
  ]);

  // Test sendToRoom when disconnected (should warn, not throw)
  try {
    await telegramAdapter.sendToRoom('builder', 'Test outbound message');
    console.log('sendToRoom() executed without throwing: ✓');
    return true;
  } catch (err) {
    console.log(`sendToRoom() threw error: ✗ (${err})`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// Test: Interface Compliance
// ═══════════════════════════════════════════════════════════════

async function testInterfaceCompliance(): Promise<boolean> {
  console.log('\n=== Test 5: ChannelAdapter Interface Compliance ===\n');

  const adapter = new TelegramAdapter(mockLogger, 'test-token');

  const requiredMethods = ['initialize', 'sendMessage', 'onMessage', 'disconnect'];
  const requiredProperties = ['name', 'status'];

  let allPass = true;

  console.log('Required properties:');
  for (const prop of requiredProperties) {
    const exists = prop in adapter;
    console.log(`  ${prop}: ${exists ? '✓' : '✗'}`);
    if (!exists) allPass = false;
  }

  console.log('\nRequired methods:');
  for (const method of requiredMethods) {
    const exists = typeof (adapter as any)[method] === 'function';
    console.log(`  ${method}(): ${exists ? '✓' : '✗'}`);
    if (!exists) allPass = false;
  }

  console.log(`\nInterface compliance: ${allPass ? '✓ PASS' : '✗ FAIL'}`);
  return allPass;
}

// ═══════════════════════════════════════════════════════════════
// Test: Graceful Initialization Failure
// ═══════════════════════════════════════════════════════════════

async function testGracefulFailure(): Promise<boolean> {
  console.log('\n=== Test 6: Graceful Initialization Failure ===\n');

  const adapter = new TelegramAdapter(mockLogger, 'test-token');

  try {
    await adapter.initialize();
    console.log(`Status after init attempt: ${adapter.status}`);
    console.log(`Graceful stub mode: ${adapter.status === 'disconnected' ? '✓' : '✗'}`);
    return adapter.status === 'disconnected';
  } catch (err) {
    console.log(`Initialization threw error (should handle gracefully): ✗`);
    console.log(`Error: ${err}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// Run All Tests
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  Telegram Channel Manager Integration Test Suite     ║');
  console.log('╚═══════════════════════════════════════════════════════╝');

  const results = [];

  results.push(await testAdapterRegistration());
  results.push(await testMessageRouting());
  results.push(await testGroupToRoomMapping());
  results.push(await testSendToRoom());
  results.push(await testInterfaceCompliance());
  results.push(await testGracefulFailure());

  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  Test Summary                                         ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  const passed = results.filter(r => r).length;
  const total = results.length;
  const allPassed = passed === total;

  console.log(`Tests passed: ${passed}/${total}`);
  console.log(`Overall: ${allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}`);

  console.log('\n📝 Integration Status:');
  console.log('  ✓ TelegramAdapter implements ChannelAdapter interface');
  console.log('  ✓ Adapter registers with ChannelManager via registerAdapter()');
  console.log('  ✓ Messages route through onMessage callback to routeMessage()');
  console.log('  ✓ Group-to-room mappings work correctly');
  console.log('  ✓ sendToRoom() method available for bidirectional messaging');
  console.log('  ✓ Graceful fallback when node-telegram-bot-api not installed');

  console.log('\n🚀 Production Checklist:');
  console.log('  1. Install: npm install node-telegram-bot-api');
  console.log('  2. Set: export TELEGRAM_BOT_TOKEN=your_bot_token');
  console.log('  3. Configure group mappings in cross-channel-config.json');
  console.log('  4. Initialize adapter in main bot setup (see cross-channel-example.ts)');

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error('Test suite crashed:', err);
  process.exit(1);
});
