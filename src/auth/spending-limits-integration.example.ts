/**
 * src/auth/spending-limits-integration.example.ts
 *
 * EXAMPLE: Integration between FIM sovereignty and spending limits
 *
 * This example demonstrates how to:
 * 1. Calculate sovereignty from trust-debt pipeline
 * 2. Map sovereignty to spending limits
 * 3. Check budget before authorizing expenses
 * 4. Generate spending reports with sovereignty context
 *
 * USAGE:
 *   This file is for documentation and testing purposes only.
 *   See wallet.ts and wallet-ledger.ts for production implementation.
 */

import { calculateSovereignty, type TrustDebtStats } from './sovereignty.js';
import {
  calculateSpendingLimit,
  calculateBudgetStatus,
  formatSpendingLimitReport,
  formatRecoveryRecommendations,
} from './spending-limits.js';

// ─── Example 1: Calculate spending limit from trust-debt stats ─────────

/**
 * Example: Agent receives trust-debt stats from pipeline step 4
 * and calculates current spending authority.
 */
export function exampleCalculateSpendingAuthority() {
  // Trust-debt stats from pipeline (4-grades-statistics.json)
  const trustDebtStats: TrustDebtStats = {
    total_units: 1200,
    grade: 'B',
    category_performance: {
      'A🚀_CoreEngine': { units: 300, percentage: '25%', grade: 'B' },
      'B🔒_Documentation': { units: 200, percentage: '17%', grade: 'A' },
      'C💨_Visualization': { units: 400, percentage: '33%', grade: 'C' },
      'D🧠_Integration': { units: 150, percentage: '13%', grade: 'A' },
      'E🎨_BusinessLayer': { units: 100, percentage: '8%', grade: 'A' },
      'F⚡_Agents': { units: 50, percentage: '4%', grade: 'A' },
    },
  };

  // Calculate sovereignty (includes drift reduction)
  const driftEvents = 2; // FIM denials since last recalc
  const sovereignty = calculateSovereignty(trustDebtStats, driftEvents);

  // Map sovereignty to spending limit
  const spendingLimit = calculateSpendingLimit(sovereignty);

  console.log('=== Spending Authority Calculation ===');
  console.log(`Trust Debt: ${sovereignty.trustDebtUnits} units (Grade ${sovereignty.grade})`);
  console.log(`Sovereignty: ${sovereignty.score.toFixed(3)} (${sovereignty.driftEvents} drift events)`);
  console.log(`Daily Limit: $${spendingLimit.dailyLimit.toFixed(2)}`);
  console.log(`Level: ${spendingLimit.levelEmoji} ${spendingLimit.level}`);
  console.log('');
  console.log(formatSpendingLimitReport(spendingLimit));
  console.log('');
  console.log(formatRecoveryRecommendations(sovereignty.score));

  return spendingLimit;
}

// ─── Example 2: Check budget before authorizing expense ────────────────

/**
 * Example: Before executing an expense, check if it would exceed budget.
 * This is what wallet.ts does before recording expenses.
 */
export function exampleCheckBudgetBeforeExpense(
  todaySpending: number,
  proposedExpense: number,
  sovereigntyScore: number,
): { authorized: boolean; reason: string } {
  // Calculate spending limit from current sovereignty
  const sovereignty = {
    score: sovereigntyScore,
    grade: 'B' as const,
    gradeEmoji: '🟡',
    trustDebtUnits: 1200,
    driftEvents: 2,
    rawScore: sovereigntyScore,
    driftReduction: 0,
    categoryScores: {},
    timestamp: new Date().toISOString(),
  };

  const spendingLimit = calculateSpendingLimit(sovereignty);

  // Check current budget status
  const currentStatus = calculateBudgetStatus(todaySpending, spendingLimit.dailyLimit);

  // Check if proposed expense would exceed limit
  const projectedSpending = todaySpending + proposedExpense;
  const projectedStatus = calculateBudgetStatus(
    projectedSpending,
    spendingLimit.dailyLimit,
  );

  console.log('=== Budget Authorization Check ===');
  console.log(`Current spending: $${todaySpending.toFixed(2)}`);
  console.log(`Proposed expense: $${proposedExpense.toFixed(2)}`);
  console.log(`Daily limit: $${spendingLimit.dailyLimit.toFixed(2)}`);
  console.log('');
  console.log(`Current status: ${currentStatus.message}`);
  console.log(`Projected status: ${projectedStatus.message}`);

  // Authorization logic
  if (projectedStatus.alertLevel === 'exceeded') {
    return {
      authorized: false,
      reason: `Expense would exceed daily limit. ${projectedStatus.message}`,
    };
  }

  if (projectedStatus.alertLevel === 'critical') {
    console.log('⚠️  Warning: Expense authorized but budget is critical');
  }

  return {
    authorized: true,
    reason: `Expense authorized. ${projectedStatus.message}`,
  };
}

// ─── Example 3: Daily spending report with sovereignty context ─────────

/**
 * Example: Generate daily spending report showing sovereignty influence.
 * This is what cost-reporter.ts uses for P&L reports.
 */
export function exampleDailySpendingReport(
  todaySpending: number,
  yesterdaySpending: number,
  sovereigntyScore: number,
  previousSovereigntyScore: number,
) {
  const today = calculateSpendingLimit({
    score: sovereigntyScore,
    grade: 'B',
    gradeEmoji: '🟡',
    trustDebtUnits: 1200,
    driftEvents: 2,
    rawScore: sovereigntyScore,
    driftReduction: 0,
    categoryScores: {},
    timestamp: new Date().toISOString(),
  });

  const yesterday = calculateSpendingLimit({
    score: previousSovereigntyScore,
    grade: 'B',
    gradeEmoji: '🟡',
    trustDebtUnits: 1300,
    driftEvents: 1,
    rawScore: previousSovereigntyScore,
    driftReduction: 0,
    categoryScores: {},
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  });

  const todayStatus = calculateBudgetStatus(todaySpending, today.dailyLimit);
  const yesterdayStatus = calculateBudgetStatus(
    yesterdaySpending,
    yesterday.dailyLimit,
  );

  console.log('=== Daily Spending Report ===');
  console.log('');
  console.log('TODAY:');
  console.log(`  Sovereignty: ${sovereigntyScore.toFixed(3)} → $${today.dailyLimit.toFixed(2)}/day`);
  console.log(`  ${todayStatus.message}`);
  console.log('');
  console.log('YESTERDAY:');
  console.log(`  Sovereignty: ${previousSovereigntyScore.toFixed(3)} → $${yesterday.dailyLimit.toFixed(2)}/day`);
  console.log(`  ${yesterdayStatus.message}`);
  console.log('');

  // Show sovereignty impact on spending capacity
  const sovereigntyChange = sovereigntyScore - previousSovereigntyScore;
  const limitChange = today.dailyLimit - yesterday.dailyLimit;

  if (Math.abs(sovereigntyChange) > 0.01) {
    const changeEmoji = sovereigntyChange > 0 ? '📈' : '📉';
    console.log(`${changeEmoji} Sovereignty ${sovereigntyChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(sovereigntyChange).toFixed(3)}`);
    console.log(`   Daily limit ${limitChange > 0 ? 'increased' : 'decreased'} by $${Math.abs(limitChange).toFixed(2)}`);
  }
}

// ─── Example 4: Forecast spending capacity with trust debt improvements ──

/**
 * Example: Show how reducing trust-debt would increase spending capacity.
 * Motivates agents to maintain high code quality.
 */
export function exampleForecastSpendingImprovements(
  currentUnits: number,
  currentSovereignty: number,
  driftEvents: number,
) {
  console.log('=== Spending Capacity Forecast ===');
  console.log('');
  console.log(`Current State:`);
  console.log(`  Trust Debt: ${currentUnits} units`);
  console.log(`  Sovereignty: ${currentSovereignty.toFixed(3)}`);
  console.log(`  Drift Events: ${driftEvents}`);
  console.log('');

  // Show recovery path
  console.log(formatRecoveryRecommendations(currentSovereignty));
  console.log('');

  // Simulate improvements
  const scenarios = [
    { label: 'Fix 200 units of debt', units: currentUnits - 200, drift: driftEvents },
    { label: 'Fix 500 units of debt', units: currentUnits - 500, drift: driftEvents },
    { label: 'Reach Grade A (500 units)', units: 500, drift: driftEvents },
    { label: 'Perfect + no drift', units: 0, drift: 0 },
  ];

  console.log('What-If Scenarios:');
  console.log('');

  for (const scenario of scenarios) {
    if (scenario.units < 0) continue;

    const sovereignty = calculateSovereignty(
      { total_units: scenario.units, grade: 'B', category_performance: {} },
      scenario.drift,
    );
    const spendingLimit = calculateSpendingLimit(sovereignty);
    const increase = spendingLimit.dailyLimit - calculateSpendingLimit({ ...sovereignty, score: currentSovereignty }).dailyLimit;

    console.log(`${scenario.label}:`);
    console.log(`  → Sovereignty: ${sovereignty.score.toFixed(3)}`);
    console.log(`  → Daily Limit: $${spendingLimit.dailyLimit.toFixed(2)} (+$${increase.toFixed(2)})`);
    console.log('');
  }
}

// ─── Run examples (if executed directly) ───────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('\n');
  exampleCalculateSpendingAuthority();
  console.log('\n');
  console.log('\n');

  const authResult = exampleCheckBudgetBeforeExpense(15.0, 8.0, 0.7);
  console.log(`\nAuthorization: ${authResult.authorized ? '✅ APPROVED' : '❌ DENIED'}`);
  console.log(`Reason: ${authResult.reason}`);
  console.log('\n');
  console.log('\n');

  exampleDailySpendingReport(23.50, 18.30, 0.68, 0.72);
  console.log('\n');
  console.log('\n');

  exampleForecastSpendingImprovements(1200, 0.6, 2);
}
