#!/usr/bin/env node

/**
 * Trust Debt Coherence Integration
 * 
 * Integrates Trust Debt metrics into the Coherence Cascade™ system
 * Automatically generates and executes trust reduction actions
 */

const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

class TrustDebtCoherence {
  constructor() {
    this.db = null;
    this.coherenceDb = null;
    this.trustActions = [];
    this.coherenceScore = 0;
  }

  async initialize() {
    // Open trust debt database
    this.db = await open({
      filename: path.join(process.cwd(), 'data', 'trust-debt.db'),
      driver: sqlite3.Database
    });

    // Open coherence database
    this.coherenceDb = await open({
      filename: path.join(process.cwd(), 'data', 'unified.db'),
      driver: sqlite3.Database
    });
  }

  async analyzeCoherenceGaps() {
    console.log('🔍 Analyzing trust-coherence gaps...\n');

    // Find documentation inconsistencies
    const docGaps = await this.findDocumentationGaps();
    
    // Find code-promise mismatches
    const codeGaps = await this.findCodePromiseGaps();
    
    // Find user expectation gaps
    const userGaps = await this.findUserExpectationGaps();

    const allGaps = [...docGaps, ...codeGaps, ...userGaps];
    
    // Calculate DIS scores (Divergence × Impact × Speed)
    for (const gap of allGaps) {
      gap.dis = gap.divergence * gap.impact * (100 - gap.confidence);
    }

    // Sort by DIS score
    allGaps.sort((a, b) => b.dis - a.dis);

    return allGaps;
  }

  async findDocumentationGaps() {
    const gaps = [];

    // Check for conflicting documentation
    const conflicts = execSync(
      `grep -r "TODO\\|FIXME\\|XXX\\|HACK" docs/ --include="*.md" | head -20 || true`
    ).toString().trim().split('\n').filter(Boolean);

    for (const conflict of conflicts) {
      const [file, ...rest] = conflict.split(':');
      gaps.push({
        type: 'DOCUMENTATION',
        file: file.replace('docs/', ''),
        issue: rest.join(':').trim(),
        divergence: 8,
        impact: 6,
        confidence: 40,
        trust_debt: 15
      });
    }

    // Check for outdated docs
    const docsToCheck = [
      'README.md',
      'CLAUDE.md',
      'docs/STRATEGIC_NUDGE_CANONICAL_PATTERN.md'
    ];

    for (const doc of docsToCheck) {
      try {
        const stat = await fs.stat(path.join(process.cwd(), doc));
        const daysSinceUpdate = (Date.now() - stat.mtime) / (1000 * 60 * 60 * 24);
        
        if (daysSinceUpdate > 14) {
          gaps.push({
            type: 'STALE_DOC',
            file: doc,
            issue: `Not updated in ${Math.floor(daysSinceUpdate)} days`,
            divergence: 5,
            impact: 7,
            confidence: 70,
            trust_debt: 10
          });
        }
      } catch (e) {
        // File doesn't exist
      }
    }

    return gaps;
  }

  async findCodePromiseGaps() {
    const gaps = [];

    // Find unimplemented features
    const todos = execSync(
      `grep -r "// TODO\\|// FIXME" src/ --include="*.ts" --include="*.tsx" | head -10 || true`
    ).toString().trim().split('\n').filter(Boolean);

    for (const todo of todos) {
      const [file, ...rest] = todo.split(':');
      gaps.push({
        type: 'UNIMPLEMENTED',
        file: file.replace('src/', ''),
        issue: rest.join(':').trim(),
        divergence: 7,
        impact: 8,
        confidence: 50,
        trust_debt: 20
      });
    }

    // Check for disabled tests
    const skippedTests = execSync(
      `grep -r "test.skip\\|it.skip\\|describe.skip" src/ tests/ --include="*.test.*" | head -5 || true`
    ).toString().trim().split('\n').filter(Boolean);

    for (const test of skippedTests) {
      const [file] = test.split(':');
      gaps.push({
        type: 'SKIPPED_TEST',
        file: file,
        issue: 'Test is skipped',
        divergence: 6,
        impact: 7,
        confidence: 60,
        trust_debt: 12
      });
    }

    return gaps;
  }

  async findUserExpectationGaps() {
    const gaps = [];

    // Check for failed email sends
    const failedEmails = await this.coherenceDb.get(`
      SELECT COUNT(*) as count
      FROM user_onboarding_emails
      WHERE sent_at IS NULL AND created_at < datetime('now', '-1 day')
    `);

    if (failedEmails?.count > 0) {
      gaps.push({
        type: 'FAILED_DELIVERY',
        file: 'email-system',
        issue: `${failedEmails.count} emails not sent`,
        divergence: 9,
        impact: 9,
        confidence: 20,
        trust_debt: 30
      });
    }

    // Check for slow response times
    const slowResponses = await this.coherenceDb.get(`
      SELECT COUNT(*) as count, AVG(response_time) as avg_time
      FROM logs
      WHERE category = 'API' 
        AND response_time > 3000
        AND timestamp > datetime('now', '-1 day')
    `);

    if (slowResponses?.count > 10) {
      gaps.push({
        type: 'SLOW_RESPONSE',
        file: 'api-performance',
        issue: `${slowResponses.count} slow responses (avg ${slowResponses.avg_time}ms)`,
        divergence: 7,
        impact: 8,
        confidence: 30,
        trust_debt: 25
      });
    }

    return gaps;
  }

  async generateTrustActions(gaps) {
    console.log('🎯 Generating trust reduction actions...\n');

    const actions = [];

    // Group gaps by type for efficient resolution
    const grouped = gaps.reduce((acc, gap) => {
      if (!acc[gap.type]) acc[gap.type] = [];
      acc[gap.type].push(gap);
      return acc;
    }, {});

    // Generate actions for each type
    for (const [type, typeGaps] of Object.entries(grouped)) {
      switch (type) {
        case 'DOCUMENTATION':
          actions.push({
            id: `doc-${Date.now()}`,
            type: 'UPDATE_DOCS',
            priority: 1,
            files: typeGaps.map(g => g.file),
            command: `pnpm coherence docs`,
            estimated_reduction: typeGaps.reduce((sum, g) => sum + g.trust_debt, 0),
            auto_executable: true,
            human_required: false
          });
          break;

        case 'STALE_DOC':
          actions.push({
            id: `stale-${Date.now()}`,
            type: 'REFRESH_DOCS',
            priority: 2,
            files: typeGaps.map(g => g.file),
            command: `git log --oneline -n 10 -- ${typeGaps[0].file}`,
            estimated_reduction: typeGaps.reduce((sum, g) => sum + g.trust_debt, 0),
            auto_executable: false,
            human_required: true,
            human_task: `Review and update ${typeGaps[0].file} with latest changes`
          });
          break;

        case 'UNIMPLEMENTED':
          actions.push({
            id: `impl-${Date.now()}`,
            type: 'IMPLEMENT_FEATURE',
            priority: 3,
            files: typeGaps.map(g => g.file),
            command: null,
            estimated_reduction: typeGaps.reduce((sum, g) => sum + g.trust_debt, 0),
            auto_executable: false,
            human_required: true,
            human_task: `Implement TODOs in ${typeGaps.length} files`
          });
          break;

        case 'FAILED_DELIVERY':
          actions.push({
            id: `email-${Date.now()}`,
            type: 'FIX_EMAIL_DELIVERY',
            priority: 1,
            files: ['src/app/api/trigger-eligible-emails/route.ts'],
            command: `node scripts/test-nuclear-email-simple.js`,
            estimated_reduction: typeGaps.reduce((sum, g) => sum + g.trust_debt, 0),
            auto_executable: true,
            human_required: false
          });
          break;

        case 'SLOW_RESPONSE':
          actions.push({
            id: `perf-${Date.now()}`,
            type: 'OPTIMIZE_PERFORMANCE',
            priority: 2,
            files: ['src/app/api/'],
            command: `pnpm logs:sqlite:query "response_time > 3000" 10`,
            estimated_reduction: typeGaps.reduce((sum, g) => sum + g.trust_debt, 0),
            auto_executable: true,
            human_required: false
          });
          break;
      }
    }

    // Sort by priority and ROI
    actions.sort((a, b) => {
      const roiA = a.estimated_reduction / (a.human_required ? 10 : 1);
      const roiB = b.estimated_reduction / (b.human_required ? 10 : 1);
      return roiB - roiA;
    });

    this.trustActions = actions;
    return actions;
  }

  async executeAutoActions() {
    console.log('🤖 Executing automated trust reduction actions...\n');

    const results = [];

    for (const action of this.trustActions.filter(a => a.auto_executable)) {
      console.log(`Executing: ${action.type}...`);
      
      try {
        if (action.command) {
          const output = execSync(action.command, { encoding: 'utf8' });
          
          results.push({
            action: action.id,
            status: 'success',
            reduction: action.estimated_reduction,
            output: output.substring(0, 200)
          });

          // Record trust reduction
          await this.recordTrustReduction(action);
          
          console.log(`  ✅ Reduced trust debt by ${action.estimated_reduction} units\n`);
        }
      } catch (error) {
        results.push({
          action: action.id,
          status: 'failed',
          error: error.message
        });
        
        console.log(`  ❌ Failed: ${error.message}\n`);
      }
    }

    return results;
  }

  async recordTrustReduction(action) {
    await this.db.run(`
      INSERT INTO trust_debt_events 
      (category, source, description, debt_change, cumulative_debt)
      VALUES (?, ?, ?, ?, 
        (SELECT cumulative_debt FROM trust_debt_events ORDER BY id DESC LIMIT 1) + ?)
    `, ['AUTO_REDUCTION', 'coherence', 
        `Automated: ${action.type}`, 
        -action.estimated_reduction,
        -action.estimated_reduction]);

    // Mark action as completed
    await this.db.run(`
      UPDATE trust_debt_actions 
      SET status = 'completed', 
          completed_at = CURRENT_TIMESTAMP,
          actual_reduction = ?
      WHERE action_type = ?
    `, [action.estimated_reduction, action.type]);
  }

  async generateCoherenceReport() {
    const gaps = await this.analyzeCoherenceGaps();
    const actions = await this.generateTrustActions(gaps);
    
    // Split actions by execution type
    const autoActions = actions.filter(a => a.auto_executable);
    const humanActions = actions.filter(a => a.human_required);

    // Calculate coherence score
    const totalDebt = gaps.reduce((sum, g) => sum + g.trust_debt, 0);
    const maxDebt = 500;
    this.coherenceScore = Math.max(0, 100 - (totalDebt / maxDebt * 100));

    const report = `
# 🎯 Trust Debt Coherence Report
Generated: ${new Date().toISOString()}

## Coherence Score: ${this.coherenceScore.toFixed(1)}%
Total Trust Debt from Gaps: ${totalDebt} units

## Top Coherence Gaps (by DIS Score)
${gaps.slice(0, 5).map((gap, i) => `
${i + 1}. **${gap.type}** - ${gap.file}
   - Issue: ${gap.issue}
   - DIS Score: ${gap.dis.toFixed(0)}
   - Trust Debt: ${gap.trust_debt} units
`).join('')}

## 🤖 Automated Actions (Ready to Execute)
${autoActions.length === 0 ? 'No automated actions available' : 
  autoActions.map((action, i) => `
${i + 1}. **${action.type}**
   - Command: \`${action.command}\`
   - Estimated Reduction: ${action.estimated_reduction} units
   - Files: ${action.files.join(', ')}
`).join('')}

## 👤 Human Actions Required
${humanActions.length === 0 ? 'No human actions required' : 
  humanActions.map((action, i) => `
${i + 1}. **${action.type}**
   - Task: ${action.human_task}
   - Estimated Reduction: ${action.estimated_reduction} units
   - Priority: ${action.priority}
`).join('')}

## Execution Plan
1. Run \`node scripts/trust-debt-coherence.js execute\` to auto-fix ${autoActions.length} issues
2. Address ${humanActions.length} human tasks in priority order
3. Total potential reduction: ${actions.reduce((sum, a) => sum + a.estimated_reduction, 0)} units

## Integration with Coherence Cascade™
- This report feeds into: \`pnpm co\`
- Auto-actions align with: \`pnpm c:biz\`
- Monitoring available: \`node scripts/trust-debt-dashboard.js\`
`;

    return report;
  }

  async launchWithClaude() {
    console.log('🚀 Launching Claude with trust debt context...\n');

    const report = await this.generateCoherenceReport();
    
    // Save report
    const reportPath = path.join(process.cwd(), 'docs', 'coherence-cycles', 'TRUST_DEBT_COHERENCE.md');
    await fs.writeFile(reportPath, report);

    // Get current trust debt
    const currentDebt = await this.db.get(`
      SELECT cumulative_debt FROM trust_debt_events 
      ORDER BY id DESC LIMIT 1
    `);

    // Launch Claude with context
    const claudePrompt = `
Based on Trust Debt Coherence Analysis:

CURRENT STATE:
- Trust Debt: ${currentDebt?.cumulative_debt || 0} units
- Coherence Score: ${this.coherenceScore.toFixed(1)}%
- Auto-fixable issues: ${this.trustActions.filter(a => a.auto_executable).length}
- Human tasks required: ${this.trustActions.filter(a => a.human_required).length}

TOP PRIORITY GAPS:
${(await this.analyzeCoherenceGaps()).slice(0, 3).map(g => 
  `- ${g.type}: ${g.issue} (DIS=${g.dis.toFixed(0)})`
).join('\n')}

IMMEDIATE ACTIONS:
1. Execute auto-fixes with: node scripts/trust-debt-coherence.js execute
2. Address top human task: ${this.trustActions.find(a => a.human_required)?.human_task || 'None'}
3. Monitor progress: node scripts/trust-debt-dashboard.js

Full report at: ${reportPath}

Help me prioritize and execute these trust debt reduction actions.
    `.trim();

    execSync(`claude "${claudePrompt}"`, { stdio: 'inherit' });
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2] || 'analyze';
  const coherence = new TrustDebtCoherence();
  await coherence.initialize();

  switch (command) {
    case 'analyze':
      const report = await coherence.generateCoherenceReport();
      console.log(report);
      
      // Save report
      const reportPath = path.join(process.cwd(), 'docs', 'coherence-cycles', 'TRUST_DEBT_COHERENCE.md');
      await fs.writeFile(reportPath, report);
      console.log(`\n📄 Report saved to: ${reportPath}`);
      break;

    case 'execute':
      console.log('🤖 Executing automated trust reduction actions...\n');
      
      // Generate actions first
      const gaps = await coherence.analyzeCoherenceGaps();
      await coherence.generateTrustActions(gaps);
      
      // Execute auto actions
      const results = await coherence.executeAutoActions();
      
      console.log('\n📊 Execution Summary:');
      console.log(`  Successful: ${results.filter(r => r.status === 'success').length}`);
      console.log(`  Failed: ${results.filter(r => r.status === 'failed').length}`);
      console.log(`  Total Reduction: ${results.filter(r => r.status === 'success')
        .reduce((sum, r) => sum + r.reduction, 0)} units`);
      break;

    case 'claude':
      await coherence.launchWithClaude();
      break;

    case 'cascade':
      // Integrate with main coherence cascade
      console.log('🔄 Integrating with Coherence Cascade™...\n');
      
      const cascadeReport = await coherence.generateCoherenceReport();
      
      // Save to coherence cycles
      const cascadePath = path.join(process.cwd(), 'docs', 'coherence-cycles', 
        `TRUST_DEBT_CASCADE_${new Date().toISOString().split('T')[0]}.md`);
      await fs.writeFile(cascadePath, cascadeReport);
      
      // Trigger main coherence
      execSync('pnpm co', { stdio: 'inherit' });
      break;

    default:
      console.log(`
Trust Debt Coherence Integration - Usage:
  node scripts/trust-debt-coherence.js analyze   - Analyze gaps and generate report
  node scripts/trust-debt-coherence.js execute   - Execute automated fixes
  node scripts/trust-debt-coherence.js claude    - Launch Claude with context
  node scripts/trust-debt-coherence.js cascade   - Integrate with Coherence Cascade™
      `);
  }

  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = TrustDebtCoherence;