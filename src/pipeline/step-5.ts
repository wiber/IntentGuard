/**
 * src/pipeline/step-5.ts — Timeline & Historical Analyzer
 *
 * Agent 5: Analyzes git commit history to show Trust Debt evolution over time.
 * Detects trends, regressions, and improvement patterns across categories.
 *
 * Core thesis: Git commit history reveals actual development priorities,
 * showing which categories receive sustained attention vs. neglect.
 *
 * INPUTS:  step-1 indexed keywords, step-4 grades
 * OUTPUTS: step-5-timeline-history.json (evolution analysis)
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

interface TimelineSnapshot {
  date: string;
  commit: string;
  message: string;
  categoryCounts: Record<string, number>;
  totalKeywords: number;
}

interface CategoryTrend {
  category: string;
  trend: 'improving' | 'stable' | 'declining' | 'new';
  changeRate: number; // % change over period
  recentActivity: number; // mentions in last 30 days
  totalActivity: number; // all-time mentions
  firstSeen: string;
  lastSeen: string;
}

interface TimelineResult {
  step: 5;
  name: 'timeline-history';
  timestamp: string;
  analysis: {
    totalCommits: number;
    dateRange: {
      earliest: string;
      latest: string;
      durationDays: number;
    };
    snapshots: TimelineSnapshot[];
    trends: CategoryTrend[];
  };
  insights: string[];
  recommendations: Array<{
    priority: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    action: string;
    rationale: string;
  }>;
  stats: {
    categoriesTracked: number;
    mostActiveCategory: string;
    leastActiveCategory: string;
    avgCommitsPerDay: number;
  };
}

/**
 * Extract git commit history with timestamps.
 * Returns array of {date, commit, message}.
 */
function extractGitHistory(repoPath: string): Array<{ date: string; commit: string; message: string }> {
  try {
    // Get git log with format: ISO8601 date|commit hash|commit message
    const gitLog = execSync(
      'git log --all --date=iso-strict --pretty=format:"%ad|%H|%s" --no-merges',
      { cwd: repoPath, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );

    if (!gitLog.trim()) return [];

    return gitLog
      .trim()
      .split('\n')
      .map(line => {
        const [date, commit, ...messageParts] = line.split('|');
        return {
          date: date || new Date().toISOString(),
          commit: commit || 'unknown',
          message: messageParts.join('|') || '',
        };
      })
      .filter(entry => entry.commit !== 'unknown');
  } catch (err) {
    console.warn('[step-5] Failed to extract git history:', err);
    return [];
  }
}

/**
 * Build timeline snapshots by analyzing commit messages for category keywords.
 */
function buildTimelineSnapshots(
  gitHistory: Array<{ date: string; commit: string; message: string }>,
  keywords: Record<string, string[]>
): TimelineSnapshot[] {
  const snapshots: TimelineSnapshot[] = [];

  for (const { date, commit, message } of gitHistory) {
    const categoryCounts: Record<string, number> = {};
    let totalKeywords = 0;

    // Count keyword matches per category
    for (const [category, categoryKeywords] of Object.entries(keywords)) {
      let count = 0;
      const lowerMessage = message.toLowerCase();

      for (const keyword of categoryKeywords) {
        if (lowerMessage.includes(keyword.toLowerCase())) {
          count++;
        }
      }

      if (count > 0) {
        categoryCounts[category] = count;
        totalKeywords += count;
      }
    }

    // Only include commits that mention at least one keyword
    if (totalKeywords > 0) {
      snapshots.push({
        date,
        commit: commit.substring(0, 8),
        message,
        categoryCounts,
        totalKeywords,
      });
    }
  }

  return snapshots;
}

/**
 * Analyze trends for each category based on timeline snapshots.
 */
function analyzeCategoryTrends(snapshots: TimelineSnapshot[]): CategoryTrend[] {
  if (snapshots.length === 0) return [];

  // Aggregate activity per category
  const categoryData: Record<string, { dates: string[]; counts: number[] }> = {};

  for (const snapshot of snapshots) {
    for (const [category, count] of Object.entries(snapshot.categoryCounts)) {
      if (!categoryData[category]) {
        categoryData[category] = { dates: [], counts: [] };
      }
      categoryData[category].dates.push(snapshot.date);
      categoryData[category].counts.push(count);
    }
  }

  // Calculate trends
  const trends: CategoryTrend[] = [];
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  for (const [category, data] of Object.entries(categoryData)) {
    const totalActivity = data.counts.reduce((sum, c) => sum + c, 0);
    const firstSeen = data.dates[data.dates.length - 1]; // oldest first
    const lastSeen = data.dates[0]; // newest first

    // Recent activity (last 30 days)
    const recentActivity = data.dates.reduce((sum, date, idx) => {
      return new Date(date) >= thirtyDaysAgo ? sum + data.counts[idx] : sum;
    }, 0);

    // Calculate change rate (compare first half vs second half of history)
    const midpoint = Math.floor(data.counts.length / 2);
    const firstHalfAvg = data.counts.slice(0, midpoint).reduce((sum, c) => sum + c, 0) / (midpoint || 1);
    const secondHalfAvg = data.counts.slice(midpoint).reduce((sum, c) => sum + c, 0) / (data.counts.length - midpoint || 1);
    const changeRate = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

    const trend: CategoryTrend['trend'] =
      Math.abs(changeRate) < 10 ? 'stable' :
      changeRate > 0 ? 'improving' :
      changeRate < 0 ? 'declining' : 'stable';

    trends.push({
      category,
      trend,
      changeRate: Math.round(changeRate * 10) / 10,
      recentActivity,
      totalActivity,
      firstSeen,
      lastSeen,
    });
  }

  // Sort by total activity descending
  trends.sort((a, b) => b.totalActivity - a.totalActivity);

  return trends;
}

/**
 * Generate insights from timeline analysis.
 */
function generateInsights(
  trends: CategoryTrend[],
  snapshots: TimelineSnapshot[],
  dateRange: { earliest: string; latest: string; durationDays: number }
): string[] {
  const insights: string[] = [];

  const improving = trends.filter(t => t.trend === 'improving');
  const declining = trends.filter(t => t.trend === 'declining');
  const stale = trends.filter(t => t.recentActivity === 0);

  if (dateRange.durationDays > 0) {
    insights.push(`Timeline spans ${dateRange.durationDays} days with ${snapshots.length} relevant commits`);
  }

  if (improving.length > 0) {
    insights.push(`${improving.length} categories showing improvement: ${improving.slice(0, 3).map(t => t.category).join(', ')}`);
  }

  if (declining.length > 0) {
    insights.push(`${declining.length} categories declining: ${declining.slice(0, 3).map(t => t.category).join(', ')} — may need attention`);
  }

  if (stale.length > 0) {
    insights.push(`${stale.length} categories with no recent activity (30d) — potential neglect areas`);
  }

  const mostActive = trends[0];
  if (mostActive) {
    insights.push(`Most active category: ${mostActive.category} (${mostActive.totalActivity} mentions, ${mostActive.trend})`);
  }

  return insights;
}

/**
 * Run step 5: timeline and historical analysis.
 */
export async function run(runDir: string, stepDir: string): Promise<void> {
  console.log('[step-5] Analyzing git timeline and history...');

  // Load step 1 keywords and step 4 grades
  const keywordsPath = join(runDir, '1-document-processing', '1-indexed-keywords.json');
  const gradesPath = join(runDir, '4-grades-statistics', '4-grades-statistics.json');

  let keywords: Record<string, string[]> = {};
  let grades: any = null;

  try {
    const keywordsData = JSON.parse(readFileSync(keywordsPath, 'utf-8'));
    keywords = keywordsData.keywords || {};
    grades = JSON.parse(readFileSync(gradesPath, 'utf-8'));
  } catch (err) {
    console.warn('[step-5] Failed to load input data:', err);
  }

  // Extract git history from current repository
  const repoPath = process.cwd();
  const gitHistory = extractGitHistory(repoPath);

  if (gitHistory.length === 0) {
    console.warn('[step-5] No git history found — using minimal data');
  }

  // Build timeline snapshots
  const snapshots = buildTimelineSnapshots(gitHistory, keywords);

  // Calculate date range
  const dates = snapshots.map(s => new Date(s.date).getTime()).filter(d => !isNaN(d));
  const earliest = dates.length > 0 ? new Date(Math.min(...dates)).toISOString() : new Date().toISOString();
  const latest = dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : new Date().toISOString();
  const durationDays = dates.length > 0 ? Math.round((Math.max(...dates) - Math.min(...dates)) / (24 * 60 * 60 * 1000)) : 0;

  const dateRange = { earliest, latest, durationDays };

  // Analyze trends
  const trends = analyzeCategoryTrends(snapshots);

  // Generate insights
  const insights = generateInsights(trends, snapshots, dateRange);

  // Generate recommendations
  const recommendations = trends
    .filter(t => t.trend === 'declining' || t.recentActivity === 0)
    .slice(0, 5)
    .map(t => {
      const priority: 'critical' | 'high' | 'medium' | 'low' = t.recentActivity === 0 ? 'high' : 'medium';
      return {
        priority,
        category: t.category,
        action: t.recentActivity === 0
          ? `Resume work on ${t.category} — no activity in last 30 days`
          : `Address declining trend in ${t.category} — ${Math.abs(t.changeRate).toFixed(0)}% decrease`,
        rationale: `Last seen: ${new Date(t.lastSeen).toLocaleDateString()} — sustained neglect creates Trust Debt`,
      };
    });

  // Calculate stats
  const mostActive = trends[0]?.category || 'none';
  const leastActive = trends[trends.length - 1]?.category || 'none';
  const avgCommitsPerDay = dateRange.durationDays > 0 ? Math.round((snapshots.length / dateRange.durationDays) * 10) / 10 : 0;

  const result: TimelineResult = {
    step: 5,
    name: 'timeline-history',
    timestamp: new Date().toISOString(),
    analysis: {
      totalCommits: gitHistory.length,
      dateRange,
      snapshots: snapshots.slice(0, 100), // Limit to 100 most recent
      trends,
    },
    insights,
    recommendations,
    stats: {
      categoriesTracked: trends.length,
      mostActiveCategory: mostActive,
      leastActiveCategory: leastActive,
      avgCommitsPerDay,
    },
  };

  writeFileSync(
    join(stepDir, '5-timeline-history.json'),
    JSON.stringify(result, null, 2)
  );

  console.log(`[step-5] Timeline: ${snapshots.length} commits analyzed across ${trends.length} categories`);
  console.log(`[step-5] Date range: ${dateRange.durationDays} days (${new Date(earliest).toLocaleDateString()} - ${new Date(latest).toLocaleDateString()})`);
  console.log(`[step-5] Trends: ${trends.filter(t => t.trend === 'improving').length} improving, ${trends.filter(t => t.trend === 'declining').length} declining`);
}
