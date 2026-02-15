#!/usr/bin/env node
/**
 * tests/wallet-ledger-manual.js — Manual test runner for WalletLedger
 *
 * Run with: node tests/wallet-ledger-manual.js
 */

import WalletLedger from '../src/skills/wallet-ledger.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test counter
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`);
    passed++;
  } else {
    console.log(`✗ ${message}`);
    failed++;
  }
}

function assertClose(actual, expected, tolerance, message) {
  if (Math.abs(actual - expected) <= tolerance) {
    console.log(`✓ ${message}`);
    passed++;
  } else {
    console.log(`✗ ${message} (expected ${expected}, got ${actual})`);
    failed++;
  }
}

// Setup test environment
const testDataDir = path.join(__dirname, '..', 'data', 'test-wallet-manual');
if (fs.existsSync(testDataDir)) {
  fs.rmSync(testDataDir, { recursive: true, force: true });
}
fs.mkdirSync(testDataDir, { recursive: true });

console.log('🧪 Running WalletLedger Tests\n');

// Test 1: Initialization
console.log('📋 JSONL Append-Only Transaction Log');
const ledger = new WalletLedger(testDataDir);
assert(fs.existsSync(ledger.getLedgerPath()), 'should create ledger file on initialization');

// Test 2: Append transactions
ledger.appendTransaction('income', 100, 'grant', 'Test grant', 0.8);
ledger.appendTransaction('expense', 25, 'inference', 'API call', 0.8);
const content = fs.readFileSync(ledger.getLedgerPath(), 'utf-8');
const lines = content.trim().split('\n');
assert(lines.length === 2, 'should append transactions in JSONL format');
const tx1 = JSON.parse(lines[0]);
assert(tx1.type === 'income' && tx1.amount === 100, 'first transaction is correct');

// Test 3: Balance calculations
console.log('\n💰 Balance Calculations');
const ledger2 = new WalletLedger(testDataDir + '-balance');
assert(ledger2.getBalance() === 0, 'should start with zero balance');
ledger2.appendTransaction('income', 200, 'grant', 'Initial funding', 0.9);
ledger2.appendTransaction('expense', 45, 'inference', 'API call', 0.9);
ledger2.appendTransaction('expense', 30, 'tools', 'Service', 0.9);
assert(ledger2.getBalance() === 125, 'should calculate mixed transactions correctly (200 - 45 - 30)');

// Test 4: Sovereignty limits
console.log('\n🔐 FIM Sovereignty-Based Spending Limits');
const ledger3 = new WalletLedger(testDataDir + '-sovereignty');
const alert1 = ledger3.checkBudgetAlert(0.95);
assert(alert1.limit === 100, 'high sovereignty (>0.9) should have $100 limit');
const alert2 = ledger3.checkBudgetAlert(0.8);
assert(alert2.limit === 50, 'moderate sovereignty (>0.7) should have $50 limit');
const alert3 = ledger3.checkBudgetAlert(0.6);
assert(alert3.limit === 20, 'low sovereignty (>0.5) should have $20 limit');
const alert4 = ledger3.checkBudgetAlert(0.4);
assert(alert4.limit === 5, 'restricted sovereignty (<=0.5) should have $5 limit');

// Test 5: Budget alerts
ledger3.appendTransaction('expense', 60, 'test', 'Overspend', 0.8);
const alert5 = ledger3.checkBudgetAlert(0.8);
assert(alert5.alert === true, 'should trigger alert when limit exceeded');
assert(alert5.spent === 60, 'should track spending correctly');

// Test 6: Daily P&L
console.log('\n📈 Daily P&L Reports');
const ledger4 = new WalletLedger(testDataDir + '-daily');
ledger4.appendTransaction('income', 100, 'grant', 'Test', 0.8);
ledger4.appendTransaction('expense', 30, 'inference', 'Test', 0.8);
ledger4.appendTransaction('expense', 20, 'tools', 'Test', 0.8);
const pnl = ledger4.getDailyPnL(new Date());
assert(pnl === 50, 'should calculate daily P&L correctly (100 - 30 - 20)');

// Test 7: Weekly P&L
console.log('\n📅 Weekly P&L Reports');
const ledger5 = new WalletLedger(testDataDir + '-weekly');
ledger5.appendTransaction('income', 200, 'grant', 'Week funding', 0.8);
ledger5.appendTransaction('expense', 50, 'inference', 'Week expense', 0.8);
const weeklyPnL = ledger5.getWeeklyPnL();
assert(weeklyPnL === 150, 'should calculate weekly P&L correctly (200 - 50)');

// Test 8: Category tracking
console.log('\n📊 Category-Based Expense Tracking');
const ledger6 = new WalletLedger(testDataDir + '-category');
ledger6.appendTransaction('expense', 30, 'inference', 'API call 1', 0.8);
ledger6.appendTransaction('expense', 20, 'inference', 'API call 2', 0.8);
ledger6.appendTransaction('expense', 15, 'tools', 'Service fee', 0.8);
const byCategory = ledger6.getExpensesByCategory();
assert(byCategory['inference'] === 50, 'should group inference expenses correctly');
assert(byCategory['tools'] === 15, 'should group tools expenses correctly');

// Test 9: Inference cost estimation
console.log('\n💸 Inference Cost Tracking');
const ledger7 = new WalletLedger(testDataDir + '-inference');
const ollamaCost = ledger7.estimateOllamaCost(10000);
assert(ollamaCost === 0, 'Ollama cost should be $0 (local)');
const gpt4Cost = ledger7.estimateApiCost('gpt-4', 10000);
assertClose(gpt4Cost, 0.45, 0.001, 'GPT-4 cost estimate should be correct');
const sonnetCost = ledger7.estimateApiCost('claude-sonnet-4', 10000);
assertClose(sonnetCost, 0.09, 0.001, 'Claude Sonnet cost estimate should be correct');

// Test 10: Track inference
ledger7.trackInferenceCost('gpt-4', 5000, 0.8, false);
const transactions = ledger7.getAllTransactions();
assert(transactions.length === 1, 'should log API inference cost');
assert(transactions[0].category === 'inference', 'inference cost should be in inference category');
assertClose(transactions[0].amount, 0.225, 0.001, 'inference cost amount should be correct');

// Test 11: Edge cases
console.log('\n🧪 Edge Cases');
const ledger8 = new WalletLedger(testDataDir + '-edge');
ledger8.appendTransaction('expense', 0, 'test', 'Zero cost', 0.8);
assert(ledger8.getBalance() === 0, 'should handle zero-amount transactions');
ledger8.appendTransaction('income', 1_000_000, 'grant', 'Large grant', 0.9);
assert(ledger8.getBalance() === 1_000_000, 'should handle very large amounts');

// Test 12: Sovereignty boundaries
assert(ledger8.checkBudgetAlert(0).limit === 5, 'sovereignty 0 should have $5 limit');
assert(ledger8.checkBudgetAlert(0.5).limit === 5, 'sovereignty 0.5 should have $5 limit');
assert(ledger8.checkBudgetAlert(0.51).limit === 20, 'sovereignty 0.51 should have $20 limit');
assert(ledger8.checkBudgetAlert(0.9).limit === 50, 'sovereignty 0.9 should have $50 limit');
assert(ledger8.checkBudgetAlert(0.91).limit === 100, 'sovereignty 0.91 should have $100 limit');
assert(ledger8.checkBudgetAlert(1.0).limit === 100, 'sovereignty 1.0 should have $100 limit');

// Cleanup
console.log('\n🧹 Cleaning up test data...');
if (fs.existsSync(testDataDir)) {
  // Clean up all test directories
  const parent = path.dirname(testDataDir);
  const files = fs.readdirSync(parent);
  files.forEach(file => {
    if (file.startsWith('test-wallet-manual')) {
      const fullPath = path.join(parent, file);
      fs.rmSync(fullPath, { recursive: true, force: true });
    }
  });
}

// Summary
console.log('\n' + '='.repeat(50));
console.log(`✓ Passed: ${passed}`);
console.log(`✗ Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);
console.log('='.repeat(50));

process.exit(failed > 0 ? 1 : 0);
