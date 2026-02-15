/**
 * src/skills/budget-alerts.example.ts — Budget Alerts Usage Example
 *
 * Demonstrates how to integrate BudgetAlerts into the IntentGuard runtime.
 */

import { BudgetAlerts } from './budget-alerts.js';
import WalletLedger from './wallet-ledger.js';
import path from 'path';

// Example: Integrate budget alerts into IntentGuard runtime
export async function setupBudgetAlerts(
  logger: any,
  discordHelper: any,
  trustDebtPublicChannelId: string,
  dataDir: string
): Promise<BudgetAlerts> {
  // Initialize wallet ledger
  const wallet = new WalletLedger(dataDir);

  // Initialize budget alerts with production config
  const budgetAlerts = new BudgetAlerts(logger, wallet, dataDir, {
    enabled: true,
    cooldownMs: 3600_000, // 1 hour between alerts
    checkIntervalMs: 300_000, // Check every 5 minutes
    logAlerts: true,
  });

  // Start budget monitoring with Discord integration
  budgetAlerts.start(discordHelper, trustDebtPublicChannelId);

  logger.info('Budget alerts system initialized and monitoring started');

  return budgetAlerts;
}

// Example: Manual budget check in CEO loop
export async function checkBudgetInCeoLoop(
  budgetAlerts: BudgetAlerts,
  currentSovereignty: number
): Promise<void> {
  const status = await budgetAlerts.checkBudgetAndAlert(currentSovereignty);

  if (!status.withinBudget) {
    console.log(`⚠️  Budget exceeded! Spent: $${status.spent.toFixed(2)}, Limit: $${status.limit.toFixed(2)}`);
  } else {
    console.log(`✅ Budget OK. Remaining: $${status.remaining.toFixed(2)} (${status.percentUsed.toFixed(0)}% used)`);
  }
}

// Example: Track inference cost and check budget
export async function trackInferenceAndCheckBudget(
  wallet: WalletLedger,
  budgetAlerts: BudgetAlerts,
  model: string,
  tokens: number,
  sovereignty: number
): Promise<void> {
  // Track the inference cost
  wallet.trackInferenceCost(model, tokens, sovereignty, false);

  // Check if this pushed us over budget
  const status = await budgetAlerts.checkBudgetAndAlert(sovereignty);

  if (!status.withinBudget) {
    console.log(`⚠️  Inference cost triggered budget alert!`);
  }
}

// Example: Get budget status for dashboard
export function getBudgetStatusForDashboard(
  budgetAlerts: BudgetAlerts,
  sovereignty: number
): {
  status: string;
  spent: string;
  limit: string;
  remaining: string;
  percentUsed: string;
} {
  const status = budgetAlerts.getBudgetStatus(sovereignty);

  return {
    status: status.withinBudget ? 'OK' : 'EXCEEDED',
    spent: `$${status.spent.toFixed(2)}`,
    limit: `$${status.limit.toFixed(2)}`,
    remaining: `$${status.remaining.toFixed(2)}`,
    percentUsed: `${status.percentUsed.toFixed(0)}%`,
  };
}

// Example: Get alert statistics for reporting
export function getAlertStatsForReport(budgetAlerts: BudgetAlerts): {
  totalAlerts: number;
  lastAlertTime: string;
  averageExceededBy: string;
  maxExceededBy: string;
} {
  const stats = budgetAlerts.getAlertStats();

  return {
    totalAlerts: stats.totalAlerts,
    lastAlertTime: stats.lastAlertTime || 'Never',
    averageExceededBy: `$${stats.averageExceededBy.toFixed(2)}`,
    maxExceededBy: `$${stats.maxExceededBy.toFixed(2)}`,
  };
}

// Example: Integration with runtime.ts
export class RuntimeBudgetMonitor {
  private budgetAlerts: BudgetAlerts;
  private wallet: WalletLedger;

  constructor(logger: any, dataDir: string) {
    this.wallet = new WalletLedger(dataDir);
    this.budgetAlerts = new BudgetAlerts(logger, this.wallet, dataDir);
  }

  async start(discordHelper: any, channelId: string): Promise<void> {
    this.budgetAlerts.start(discordHelper, channelId);
  }

  async trackApiCall(model: string, tokens: number, sovereignty: number): Promise<void> {
    // Track cost
    this.wallet.trackInferenceCost(model, tokens, sovereignty, false);

    // Check budget (alert will auto-post if exceeded and cooldown passed)
    await this.budgetAlerts.checkBudgetAndAlert(sovereignty);
  }

  async trackOllamaCall(model: string, tokens: number, sovereignty: number): Promise<void> {
    // Track for monitoring (Ollama is free but we track usage)
    this.wallet.trackInferenceCost(model, tokens, sovereignty, true);
  }

  getStatus(sovereignty: number): any {
    return this.budgetAlerts.getBudgetStatus(sovereignty);
  }

  getStats(): any {
    return this.budgetAlerts.getAlertStats();
  }

  stop(): void {
    this.budgetAlerts.stop();
  }
}

// Example output format for #trust-debt-public alert:
/*
🟠 **BUDGET LIMIT EXCEEDED**

**Daily Spending:** $60.00
**Daily Limit:** $50.00 (sovereignty: 0.750)
**Exceeded By:** $10.00 (20% over)
**Hardness:** H3-MEDIUM
**Time:** 2026-02-15T18:30:00.000Z

*Sovereignty-adjusted spending limits prevent runaway costs. Review wallet ledger for details.*

**Budget Thresholds:**
• Sovereignty > 0.9: $100/day (high trust)
• Sovereignty > 0.7: $50/day (moderate trust)
• Sovereignty > 0.5: $20/day (low trust)
• Sovereignty ≤ 0.5: $5/day (restricted)
*/
