#!/usr/bin/env node
/**
 * src/cli/sovereignty-status.ts — Sovereignty Stability Status CLI
 *
 * Command-line tool to check sovereignty stability status and milestones.
 *
 * USAGE:
 *   npm run sovereignty:status           # Check current stability status
 *   npm run sovereignty:milestones       # Show all milestones
 *   npm run sovereignty:monitor          # Run monitoring and record snapshot
 *
 * OUTPUT:
 *   - Current sovereignty score
 *   - Consecutive stable days
 *   - Days remaining until 30-day milestone
 *   - Recent milestones achieved
 */
import { monitorSovereignty, generateStabilityReport, generateMilestonesSummary, loadHistory, loadMilestones, STABILITY_WINDOW_DAYS, } from '../monitor/sovereignty-monitor.js';
// Simple console logger
const logger = {
    debug: (msg) => console.log(`[DEBUG] ${msg}`),
    info: (msg) => console.log(`[INFO] ${msg}`),
    warn: (msg) => console.warn(`[WARN] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`),
};
const repoRoot = process.cwd();
async function showStatus() {
    console.log('🔍 Sovereignty Stability Status\n');
    const result = await monitorSovereignty(repoRoot, logger);
    const report = generateStabilityReport(result);
    console.log(report);
    console.log();
    if (result.milestoneAchieved) {
        console.log('🎉 NEW MILESTONE ACHIEVED!');
        console.log('   Run artifact generation to commemorate this achievement.');
    }
    else if (result.consecutiveStableDays > 0) {
        const progress = (result.consecutiveStableDays / STABILITY_WINDOW_DAYS) * 100;
        console.log(`📊 Progress: ${progress.toFixed(1)}% toward stability milestone`);
    }
}
async function showMilestones() {
    console.log('📋 Sovereignty Stability Milestones\n');
    const summary = generateMilestonesSummary(repoRoot);
    console.log(summary);
    console.log();
    const milestones = loadMilestones(repoRoot);
    if (milestones.length > 0) {
        console.log('\nDetailed Milestones:');
        for (const m of milestones) {
            console.log(`\n  ${m.startDate} to ${m.endDate} (${m.durationDays} days)`);
            console.log(`    Average: σ=${m.averageSovereignty.toFixed(3)}`);
            console.log(`    Range: ${m.minSovereignty.toFixed(3)} - ${m.maxSovereignty.toFixed(3)}`);
            console.log(`    Variance: ±${(m.variance * 100).toFixed(1)}%`);
            console.log(`    Artifact: ${m.artifactTriggered ? '✅ Generated' : '⏳ Pending'}`);
            if (m.artifactPath) {
                console.log(`    Path: ${m.artifactPath}`);
            }
        }
    }
}
async function showHistory() {
    console.log('📊 Sovereignty History\n');
    const history = loadHistory(repoRoot);
    if (history.length === 0) {
        console.log('No sovereignty history recorded yet.');
        console.log('Run the trust-debt pipeline to generate initial data.');
        return;
    }
    console.log(`Total snapshots: ${history.length}`);
    console.log(`First: ${history[0].date} (σ=${history[0].score.toFixed(3)})`);
    console.log(`Latest: ${history[history.length - 1].date} (σ=${history[history.length - 1].score.toFixed(3)})`);
    console.log();
    // Show recent 10 snapshots
    console.log('Recent History:');
    const recent = history.slice(-10);
    for (const s of recent) {
        const emoji = s.score >= 0.8 ? '🟢' : s.score >= 0.6 ? '🟡' : '🔴';
        console.log(`  ${emoji} ${s.date}: σ=${s.score.toFixed(3)} ${s.grade} (${s.trustDebtUnits} units, ${s.driftEvents} drifts)`);
    }
}
async function runMonitor() {
    console.log('🔄 Running Sovereignty Monitor\n');
    const result = await monitorSovereignty(repoRoot, logger);
    console.log('✅ Monitoring complete\n');
    const report = generateStabilityReport(result);
    console.log(report);
    if (result.milestoneAchieved) {
        console.log('\n🎉 MILESTONE ACHIEVED!');
        console.log('   Consider generating a commemorative artifact:');
        console.log('   npm run artifact:generate -- --milestone');
    }
}
// Main CLI router
const command = process.argv[2] || 'status';
async function main() {
    try {
        switch (command) {
            case 'status':
                await showStatus();
                break;
            case 'milestones':
                await showMilestones();
                break;
            case 'history':
                await showHistory();
                break;
            case 'monitor':
                await runMonitor();
                break;
            default:
                console.error(`Unknown command: ${command}`);
                console.log('\nAvailable commands:');
                console.log('  status       - Show current stability status');
                console.log('  milestones   - Show all stability milestones');
                console.log('  history      - Show sovereignty history');
                console.log('  monitor      - Run monitoring and record snapshot');
                process.exit(1);
        }
    }
    catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=sovereignty-status.js.map