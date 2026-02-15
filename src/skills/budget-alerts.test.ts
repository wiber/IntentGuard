/**
 * src/skills/budget-alerts.test.ts — Budget Alerts System Tests
 *
 * Tests:
 * - Budget threshold detection with different sovereignty levels
 * - Alert posting to Discord
 * - Cooldown mechanism (prevent spam)
 * - Alert history tracking
 * - Statistics calculation
 * - Integration with WalletLedger
 */

import { BudgetAlerts } from './budget-alerts.js';
import WalletLedger from './wallet-ledger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock logger
const mockLogger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
  debug: (msg: string) => console.log(`[DEBUG] ${msg}`),
};

// Mock Discord helper
class MockDiscordHelper {
  public sentMessages: Array<{ channelId: string; content: string }> = [];

  async sendToChannel(channelId: string, content: string): Promise<void> {
    this.sentMessages.push({ channelId, content });
  }

  reset(): void {
    this.sentMessages = [];
  }

  getLastMessage(): string | undefined {
    return this.sentMessages.length > 0
      ? this.sentMessages[this.sentMessages.length - 1].content
      : undefined;
  }
}

describe('BudgetAlerts', () => {
  const testDataDir = path.join(__dirname, '..', '..', 'test-data');
  let wallet: WalletLedger;
  let budgetAlerts: BudgetAlerts;
  let mockDiscord: MockDiscordHelper;
  const testChannelId = 'test-channel-123';

  beforeEach(() => {
    // Create test data directory
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    // Initialize wallet and budget alerts
    wallet = new WalletLedger(testDataDir);
    budgetAlerts = new BudgetAlerts(mockLogger, wallet, testDataDir, {
      enabled: true,
      cooldownMs: 1000, // Short cooldown for testing (1 second)
      checkIntervalMs: 0, // Disable automatic checks for manual testing
      logAlerts: true,
    });

    mockDiscord = new MockDiscordHelper();
  });

  afterEach(() => {
    // Clean up test files
    const testFiles = [
      'wallet-ledger.jsonl',
      'budget-alerts.jsonl',
    ];

    for (const file of testFiles) {
      const filePath = path.join(testDataDir, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    budgetAlerts.stop();
    mockDiscord.reset();
  });

  test('should detect budget within limits', async () => {
    // High sovereignty = $100/day limit
    const sovereignty = 0.95;

    // Add small expense
    wallet.appendTransaction('expense', 25, 'inference', 'Test expense', sovereignty);

    const status = await budgetAlerts.checkBudgetAndAlert(sovereignty);

    expect(status.withinBudget).toBe(true);
    expect(status.spent).toBe(25);
    expect(status.limit).toBe(100);
    expect(status.remaining).toBe(75);
    expect(status.percentUsed).toBe(25);
  });

  test('should detect budget exceeded for high sovereignty', async () => {
    // High sovereignty = $100/day limit
    const sovereignty = 0.95;

    // Add expenses exceeding limit
    wallet.appendTransaction('expense', 60, 'inference', 'Expense 1', sovereignty);
    wallet.appendTransaction('expense', 50, 'inference', 'Expense 2', sovereignty);

    const status = await budgetAlerts.checkBudgetAndAlert(sovereignty);

    expect(status.withinBudget).toBe(false);
    expect(status.spent).toBe(110);
    expect(status.limit).toBe(100);
    expect(status.remaining).toBe(-10);
    expect(status.percentUsed).toBeCloseTo(110, 0);
  });

  test('should detect budget exceeded for moderate sovereignty', async () => {
    // Moderate sovereignty = $50/day limit
    const sovereignty = 0.75;

    // Add expenses exceeding limit
    wallet.appendTransaction('expense', 60, 'inference', 'Large expense', sovereignty);

    const status = await budgetAlerts.checkBudgetAndAlert(sovereignty);

    expect(status.withinBudget).toBe(false);
    expect(status.spent).toBe(60);
    expect(status.limit).toBe(50);
    expect(status.remaining).toBe(-10);
  });

  test('should detect budget exceeded for low sovereignty', async () => {
    // Low sovereignty = $20/day limit
    const sovereignty = 0.55;

    // Add expenses exceeding limit
    wallet.appendTransaction('expense', 25, 'inference', 'Expense', sovereignty);

    const status = await budgetAlerts.checkBudgetAndAlert(sovereignty);

    expect(status.withinBudget).toBe(false);
    expect(status.spent).toBe(25);
    expect(status.limit).toBe(20);
  });

  test('should detect budget exceeded for restricted sovereignty', async () => {
    // Restricted sovereignty = $5/day limit
    const sovereignty = 0.45;

    // Add expenses exceeding limit
    wallet.appendTransaction('expense', 10, 'inference', 'Expense', sovereignty);

    const status = await budgetAlerts.checkBudgetAndAlert(sovereignty);

    expect(status.withinBudget).toBe(false);
    expect(status.spent).toBe(10);
    expect(status.limit).toBe(5);
  });

  test('should post alert to Discord when budget exceeded', async () => {
    budgetAlerts.start(mockDiscord as any, testChannelId);

    const sovereignty = 0.75; // $50/day limit
    wallet.appendTransaction('expense', 60, 'inference', 'Large expense', sovereignty);

    await budgetAlerts.checkBudgetAndAlert(sovereignty);

    expect(mockDiscord.sentMessages.length).toBe(1);

    const message = mockDiscord.sentMessages[0];
    expect(message.channelId).toBe(testChannelId);
    expect(message.content).toContain('BUDGET LIMIT EXCEEDED');
    expect(message.content).toContain('$60.00');
    expect(message.content).toContain('$50.00');
    expect(message.content).toContain('sovereignty: 0.750');
  });

  test('should respect cooldown period', async () => {
    budgetAlerts.start(mockDiscord as any, testChannelId);

    const sovereignty = 0.75; // $50/day limit
    wallet.appendTransaction('expense', 60, 'inference', 'Expense 1', sovereignty);

    // First check should post alert
    await budgetAlerts.checkBudgetAndAlert(sovereignty);
    expect(mockDiscord.sentMessages.length).toBe(1);

    // Second check immediately should NOT post (cooldown active)
    await budgetAlerts.checkBudgetAndAlert(sovereignty);
    expect(mockDiscord.sentMessages.length).toBe(1);

    // Wait for cooldown to expire (1 second in test config)
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Third check should post alert (cooldown expired)
    await budgetAlerts.checkBudgetAndAlert(sovereignty);
    expect(mockDiscord.sentMessages.length).toBe(2);
  });

  test('should log alerts to JSONL file', async () => {
    budgetAlerts.start(mockDiscord as any, testChannelId);

    const sovereignty = 0.75;
    wallet.appendTransaction('expense', 60, 'inference', 'Expense', sovereignty);

    await budgetAlerts.checkBudgetAndAlert(sovereignty);

    const alertLogPath = path.join(testDataDir, 'budget-alerts.jsonl');
    expect(fs.existsSync(alertLogPath)).toBe(true);

    const content = fs.readFileSync(alertLogPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    expect(lines.length).toBe(1);

    const alert = JSON.parse(lines[0]);
    expect(alert.sovereignty).toBe(sovereignty);
    expect(alert.spent).toBe(60);
    expect(alert.limit).toBe(50);
    expect(alert.exceededBy).toBe(10);
  });

  test('should track alert history', async () => {
    budgetAlerts.start(mockDiscord as any, testChannelId);

    const sovereignty = 0.75;

    // First alert
    wallet.appendTransaction('expense', 60, 'inference', 'Expense 1', sovereignty);
    await budgetAlerts.checkBudgetAndAlert(sovereignty);

    // Wait for cooldown
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Second alert (new day simulation - would need to clear today's expenses in real scenario)
    wallet.appendTransaction('expense', 55, 'inference', 'Expense 2', sovereignty);
    await budgetAlerts.checkBudgetAndAlert(sovereignty);

    const history = budgetAlerts.getAlertHistory();
    expect(history.length).toBe(2);

    expect(history[0].spent).toBe(60);
    expect(history[1].spent).toBe(115); // Cumulative
  });

  test('should calculate alert statistics', async () => {
    budgetAlerts.start(mockDiscord as any, testChannelId);

    const sovereignty = 0.75; // $50/day limit

    // First alert: $10 over
    wallet.appendTransaction('expense', 60, 'inference', 'Expense 1', sovereignty);
    await budgetAlerts.checkBudgetAndAlert(sovereignty);

    await new Promise(resolve => setTimeout(resolve, 1100));

    // Second alert: $15 over
    wallet.appendTransaction('expense', 5, 'inference', 'Expense 2', sovereignty);
    await budgetAlerts.checkBudgetAndAlert(sovereignty);

    const stats = budgetAlerts.getAlertStats();
    expect(stats.totalAlerts).toBe(2);
    expect(stats.lastAlertTime).toBeTruthy();
    expect(stats.maxExceededBy).toBe(15); // Second alert was $65 total, $15 over
    expect(stats.averageExceededBy).toBeCloseTo(12.5, 1); // ($10 + $15) / 2
  });

  test('should manually trigger alert', async () => {
    budgetAlerts.start(mockDiscord as any, testChannelId);

    const sovereignty = 0.75;
    wallet.appendTransaction('expense', 60, 'inference', 'Expense', sovereignty);

    await budgetAlerts.triggerAlert(sovereignty);

    expect(mockDiscord.sentMessages.length).toBe(1);
    expect(mockDiscord.sentMessages[0].content).toContain('BUDGET LIMIT EXCEEDED');
  });

  test('should get budget status without triggering alert', () => {
    const sovereignty = 0.75;
    wallet.appendTransaction('expense', 30, 'inference', 'Expense', sovereignty);

    const status = budgetAlerts.getBudgetStatus(sovereignty);

    expect(status.withinBudget).toBe(true);
    expect(status.spent).toBe(30);
    expect(status.limit).toBe(50);
    expect(status.remaining).toBe(20);
    expect(status.percentUsed).toBe(60);
  });

  test('should clear alert history', async () => {
    budgetAlerts.start(mockDiscord as any, testChannelId);

    const sovereignty = 0.75;
    wallet.appendTransaction('expense', 60, 'inference', 'Expense', sovereignty);

    await budgetAlerts.checkBudgetAndAlert(sovereignty);

    expect(budgetAlerts.getAlertHistory().length).toBe(1);

    budgetAlerts.clearAlertHistory();

    expect(budgetAlerts.getAlertHistory().length).toBe(0);
    expect(budgetAlerts.getAlertStats().totalAlerts).toBe(0);

    const alertLogPath = path.join(testDataDir, 'budget-alerts.jsonl');
    const content = fs.readFileSync(alertLogPath, 'utf-8');
    expect(content.trim()).toBe('');
  });

  test('should include severity indicators in alert message', async () => {
    budgetAlerts.start(mockDiscord as any, testChannelId);

    const sovereignty = 0.75; // $50 limit

    // Exceed by 50% (critical)
    wallet.appendTransaction('expense', 75, 'inference', 'Large expense', sovereignty);
    await budgetAlerts.checkBudgetAndAlert(sovereignty);

    const message = mockDiscord.getLastMessage();
    expect(message).toContain('🔴'); // Critical severity
    expect(message).toContain('H1-CRITICAL');
  });

  test('should handle zero spending correctly', async () => {
    const sovereignty = 0.75;

    const status = await budgetAlerts.checkBudgetAndAlert(sovereignty);

    expect(status.withinBudget).toBe(true);
    expect(status.spent).toBe(0);
    expect(status.limit).toBe(50);
    expect(status.remaining).toBe(50);
    expect(status.percentUsed).toBe(0);
  });

  test('should use default sovereignty if not provided', async () => {
    // Default sovereignty is 0.5 ($20 limit)
    wallet.appendTransaction('expense', 25, 'inference', 'Expense', 0.5);

    const status = await budgetAlerts.checkBudgetAndAlert();

    expect(status.sovereignty).toBe(0.5);
    expect(status.limit).toBe(20);
    expect(status.withinBudget).toBe(false);
  });
});

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running budget-alerts tests...');
  console.log('\nNote: Run with a test runner (e.g., vitest, jest) for full test execution.');
}
