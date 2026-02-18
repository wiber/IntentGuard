/**
 * src/discord/financial-tweets.ts — Financial Event Tweet Templates
 *
 * Formulates financial events as tweetable content for #financial-tweets.
 * Events: cost savings from Ollama routing, model upgrades, latency gains,
 * revenue signals from tesseract.nu, autonomy milestones.
 *
 * Integrates with TweetComposer for cross-posting to #x-posts → X/Twitter.
 */

import type { TweetData } from './tweet-composer.js';

export interface FinancialEvent {
  type: 'cost-saving' | 'model-upgrade' | 'latency-gain' | 'revenue-signal' | 'autonomy-milestone' | 'budget-status';
  amount?: number;
  currency?: string;
  metric?: string;
  oldValue?: string | number;
  newValue?: string | number;
  context?: string;
}

/**
 * Cost saving tweet — when Ollama routing saves API spend.
 */
export function costSavingTweet(
  dailySaved: number,
  monthlySaved: number,
  routePercent: number,
  sovereignty: number,
): TweetData {
  return {
    text: `💰 Cost Sovereignty: $${dailySaved.toFixed(2)}/day saved by routing ${routePercent}% of tasks to local Ollama. Monthly projection: $${monthlySaved.toFixed(0)}. Zero API calls for H1-H2 tasks.`,
    room: 'vault',
    sovereignty,
    categories: ['resource_efficiency', 'cost_governance', 'sovereignty'],
    source: 'status',
    sourceCell: 'A3',  // Strategy.Fund
    targetCell: 'C3',  // Operations.Flow
  };
}

/**
 * Model upgrade tweet — when pacing layer model changes.
 */
export function modelUpgradeTweet(
  oldModel: string,
  newModel: string,
  accuracyBefore: number,
  accuracyAfter: number,
  sovereignty: number,
): TweetData {
  const gain = accuracyAfter - accuracyBefore;
  return {
    text: `🧠 Model Upgrade: ${oldModel} → ${newModel}. Categorization accuracy ${(accuracyBefore * 100).toFixed(0)}% → ${(accuracyAfter * 100).toFixed(0)}% (+${(gain * 100).toFixed(0)}pp). Still $0 API cost.`,
    room: 'laboratory',
    sovereignty,
    categories: ['model_routing', 'accuracy', 'cost_governance'],
    source: 'status',
    sourceCell: 'C2',  // Operations.Loop — experiment
    targetCell: 'A2',  // Strategy.Goal — architecture decision
  };
}

/**
 * Latency gain tweet — when infrastructure improvements reduce response time.
 */
export function latencyGainTweet(
  component: string,
  oldMs: number,
  newMs: number,
  sovereignty: number,
): TweetData {
  const reduction = ((oldMs - newMs) / oldMs * 100).toFixed(0);
  return {
    text: `⚡ Latency: ${component} ${oldMs}ms → ${newMs}ms (-${reduction}%). Faster sovereign reasoning. No external dependency.`,
    room: 'operator',
    sovereignty,
    categories: ['performance', 'infrastructure', 'sovereignty'],
    source: 'status',
    sourceCell: 'C1',  // Operations.Grid — infrastructure
    targetCell: 'B1',  // Tactics.Speed — unblocking
  };
}

/**
 * Revenue signal tweet — from tesseract.nu activity.
 */
export function revenueSignalTweet(
  event: string,
  value: number,
  source: string,
  sovereignty: number,
): TweetData {
  return {
    text: `📈 Revenue Signal: ${event} — $${value.toFixed(2)} from ${source}. Tesseract grid generating real value.`,
    room: 'performer',
    sovereignty,
    categories: ['revenue', 'tesseract', 'traction'],
    source: 'status',
    sourceCell: 'A3',  // Strategy.Fund — monetization
    targetCell: 'B2',  // Tactics.Deal — partnerships/revenue
  };
}

/**
 * Autonomy milestone tweet — when the system reaches a new autonomy level.
 */
export function autonomyMilestoneTweet(
  milestone: string,
  agentCount: number,
  tasksCompleted: number,
  uptimeHours: number,
  sovereignty: number,
): TweetData {
  return {
    text: `🤖 Autonomy Milestone: ${milestone}. ${agentCount} agents, ${tasksCompleted} tasks, ${uptimeHours}h uptime. System self-coordinating.`,
    room: 'operator',
    sovereignty,
    categories: ['autonomy', 'milestone', 'sovereignty'],
    source: 'status',
    sourceCell: 'C3',  // Operations.Flow — coordination
    targetCell: 'A2',  // Strategy.Goal — system design
  };
}

/**
 * Budget status tweet — periodic financial health check.
 */
export function budgetStatusTweet(
  dailySpend: number,
  dailyBudget: number,
  monthlySpend: number,
  monthlyBudget: number,
  ollamaPercent: number,
  sovereignty: number,
): TweetData {
  const dailyUtil = (dailySpend / dailyBudget * 100).toFixed(0);
  const monthlyUtil = (monthlySpend / monthlyBudget * 100).toFixed(0);
  return {
    text: `📊 Budget: $${dailySpend.toFixed(2)}/$${dailyBudget.toFixed(2)} daily (${dailyUtil}%) | $${monthlySpend.toFixed(0)}/$${monthlyBudget.toFixed(0)} monthly (${monthlyUtil}%) | ${ollamaPercent}% routed locally.`,
    room: 'vault',
    sovereignty,
    categories: ['budget', 'cost_governance', 'transparency'],
    source: 'status',
    sourceCell: 'A3',  // Strategy.Fund
    targetCell: 'C3',  // Operations.Flow
  };
}

/**
 * Compose a financial event into a TweetData from structured event data.
 */
export function composeFinancialTweet(event: FinancialEvent, sovereignty: number): TweetData {
  switch (event.type) {
    case 'cost-saving':
      return costSavingTweet(
        event.amount ?? 0,
        (event.amount ?? 0) * 30,
        typeof event.newValue === 'number' ? event.newValue : 80,
        sovereignty,
      );
    case 'model-upgrade':
      return modelUpgradeTweet(
        String(event.oldValue ?? 'llama3.2:1b'),
        String(event.newValue ?? 'qwen2.5:14b-instruct-q6_K'),
        typeof event.oldValue === 'number' ? event.oldValue : 0.18,
        typeof event.newValue === 'number' ? event.newValue : 0.73,
        sovereignty,
      );
    case 'latency-gain':
      return latencyGainTweet(
        event.context ?? 'categorization',
        typeof event.oldValue === 'number' ? event.oldValue : 100,
        typeof event.newValue === 'number' ? event.newValue : 50,
        sovereignty,
      );
    case 'revenue-signal':
      return revenueSignalTweet(
        event.context ?? 'Signal activation',
        event.amount ?? 0,
        event.metric ?? 'tesseract.nu',
        sovereignty,
      );
    case 'autonomy-milestone':
      return autonomyMilestoneTweet(
        event.context ?? 'New autonomy level',
        typeof event.newValue === 'number' ? event.newValue : 490,
        typeof event.amount === 'number' ? event.amount : 204,
        24,
        sovereignty,
      );
    case 'budget-status':
      return budgetStatusTweet(
        event.amount ?? 0,
        typeof event.oldValue === 'number' ? event.oldValue : 5,
        (event.amount ?? 0) * 30,
        typeof event.newValue === 'number' ? event.newValue : 150,
        80,
        sovereignty,
      );
  }
}
