#!/usr/bin/env node

/**
 * Trust Debt Tracker - Automated Trust Debt Analysis & Monitoring
 * 
 * Tracks trust debt across commits, documentation, and user behavior
 * Generates actionable reduction plans with quantified impact
 */

const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

// Trust Debt Categories with Weights
const TRUST_CATEGORIES = {
  PROMISE_KEPT: { weight: -10, pattern: /fix|resolve|complete|deliver|ship/i },
  PROMISE_BROKEN: { weight: 20, pattern: /revert|regression|broke|failed|bug/i },
  CLARITY_GAINED: { weight: -5, pattern: /clarify|document|explain|simplify/i },
  CONFUSION_ADDED: { weight: 15, pattern: /confus|unclear|complex|complicated/i },
  CONSISTENCY_IMPROVED: { weight: -8, pattern: /align|consistent|standard|unified/i },
  INCONSISTENCY_ADDED: { weight: 12, pattern: /inconsistent|diverge|conflict|mismatch/i },
  RELIABILITY_PROVEN: { weight: -15, pattern: /stable|reliable|robust|resilient/i },
  RELIABILITY_LOST: { weight: 25, pattern: /unstable|crash|error|timeout/i },
  TRANSPARENCY_INCREASED: { weight: -7, pattern: /monitor|track|log|observe|measure/i },
  OPACITY_CREATED: { weight: 10, pattern: /hidden|opaque|unclear|mysterious/i }
};

// Trust Debt Factors
const TRUST_FACTORS = {
  TIMING: {
    promise_to_delivery: 1.5,  // Days between promise and delivery
    response_time: 2.0,        // Response time multiplier
    deadline_variance: 3.0     // Deadline miss penalty
  },
  QUALITY: {
    bug_rate: 2.5,            // Bugs per feature
    test_coverage: -1.5,      // Test coverage bonus
    documentation_gap: 2.0    // Missing docs penalty
  },
  COMMUNICATION: {
    update_frequency: -1.0,   // Regular updates bonus
    clarity_score: -2.0,      // Clear communication bonus
    surprise_changes: 3.5     // Unexpected changes penalty
  }
};

class TrustDebtTracker {
  constructor() {
    this.db = null;
    this.currentDebt = 0;
    this.debtHistory = [];
    this.actionPlan = [];
  }

  async initialize() {
    // Open database
    this.db = await open({
      filename: path.join(process.cwd(), 'data', 'trust-debt.db'),
      driver: sqlite3.Database
    });

    // Create tables
    await this.createSchema();
    
    // Load current state
    await this.loadCurrentDebt();
  }

  async createSchema() {
    // Trust debt events table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS trust_debt_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        category TEXT NOT NULL,
        source TEXT NOT NULL,
        description TEXT,
        debt_change REAL NOT NULL,
        cumulative_debt REAL NOT NULL,
        metadata JSON
      )
    `);

    // Trust debt snapshots
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS trust_debt_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_debt REAL NOT NULL,
        category_breakdown JSON,
        factor_scores JSON,
        fim_alignment REAL,
        action_items JSON
      )
    `);

    // Trust debt reduction actions
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS trust_debt_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        action_type TEXT NOT NULL,
        priority INTEGER,
        estimated_reduction REAL,
        effort_hours REAL,
        roi_score REAL,
        status TEXT DEFAULT 'pending',
        completed_at DATETIME,
        actual_reduction REAL
      )
    `);
  }

  async loadCurrentDebt() {
    const latest = await this.db.get(`
      SELECT total_debt FROM trust_debt_snapshots 
      ORDER BY timestamp DESC LIMIT 1
    `);
    this.currentDebt = latest?.total_debt || 0;
  }

  async analyzeCommits(limit = 50) {
    console.log('📊 Analyzing recent commits for trust patterns...');
    
    const gitLog = execSync(
      `git log --oneline -n ${limit} --pretty=format:"%H|%s|%an|%ae|%ad"`
    ).toString().trim().split('\n');

    let commitDebt = 0;
    const events = [];

    for (const line of gitLog) {
      const [hash, message, author, email, date] = line.split('|');
      
      // Check each trust category
      for (const [category, config] of Object.entries(TRUST_CATEGORIES)) {
        if (config.pattern.test(message)) {
          commitDebt += config.weight;
          events.push({
            category,
            source: 'commit',
            description: message,
            debt_change: config.weight,
            metadata: { hash, author, date }
          });
        }
      }
    }

    // Record events
    for (const event of events) {
      await this.recordEvent(event);
    }

    return { commitDebt, events: events.length };
  }

  async analyzeDocumentation() {
    console.log('📚 Analyzing documentation trust signals...');
    
    const docsPath = path.join(process.cwd(), 'docs');
    let docDebt = 0;
    const issues = [];

    // Check for critical documentation
    const criticalDocs = [
      'README.md',
      'CHANGELOG.md',
      'API.md',
      'CONTRIBUTING.md'
    ];

    for (const doc of criticalDocs) {
      const fullPath = path.join(docsPath, doc);
      try {
        const stat = await fs.stat(fullPath);
        const daysSinceUpdate = (Date.now() - stat.mtime) / (1000 * 60 * 60 * 24);
        
        if (daysSinceUpdate > 30) {
          docDebt += 5;
          issues.push(`${doc} not updated in ${Math.floor(daysSinceUpdate)} days`);
        }
      } catch (e) {
        docDebt += 10;
        issues.push(`Missing critical doc: ${doc}`);
      }
    }

    if (docDebt > 0) {
      await this.recordEvent({
        category: 'DOCUMENTATION_GAP',
        source: 'docs',
        description: issues.join(', '),
        debt_change: docDebt
      });
    }

    return { docDebt, issues: issues.length };
  }

  async analyzeUserBehavior() {
    console.log('👥 Analyzing user behavior trust signals...');
    
    // Query production database for trust indicators
    const metrics = await this.db.all(`
      SELECT 
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_promises,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as kept_promises,
        AVG(CASE WHEN deadline IS NOT NULL 
          THEN julianday(completed_at) - julianday(deadline) 
          ELSE 0 END) as avg_deadline_variance
      FROM trust_debt_events
      WHERE timestamp > datetime('now', '-7 days')
    `);

    const behaviorDebt = 
      (metrics[0].failed_promises * 15) -
      (metrics[0].kept_promises * 10) +
      (Math.max(0, metrics[0].avg_deadline_variance || 0) * 5);

    if (behaviorDebt !== 0) {
      await this.recordEvent({
        category: 'USER_BEHAVIOR',
        source: 'analytics',
        description: `Failed: ${metrics[0].failed_promises}, Kept: ${metrics[0].kept_promises}`,
        debt_change: behaviorDebt
      });
    }

    return { behaviorDebt, metrics: metrics[0] };
  }

  async calculateFIMAlignment() {
    // Calculate FIM-based trust alignment
    const recentEvents = await this.db.all(`
      SELECT category, SUM(debt_change) as total_change
      FROM trust_debt_events
      WHERE timestamp > datetime('now', '-7 days')
      GROUP BY category
    `);

    let skill = 100;
    let environment = 100;

    for (const event of recentEvents) {
      if (event.category.includes('BROKEN') || event.category.includes('FAILED')) {
        skill -= Math.abs(event.total_change) / 10;
      }
      if (event.category.includes('CONFUSION') || event.category.includes('INCONSISTENCY')) {
        environment -= Math.abs(event.total_change) / 10;
      }
    }

    const fim = (skill / 100) * (environment / 100);
    return { fim, skill, environment };
  }

  async generateActionPlan() {
    console.log('🎯 Generating trust debt reduction plan...');
    
    // Get top debt categories
    const topCategories = await this.db.all(`
      SELECT category, SUM(debt_change) as total_debt
      FROM trust_debt_events
      WHERE debt_change > 0
      GROUP BY category
      ORDER BY total_debt DESC
      LIMIT 5
    `);

    const actions = [];

    for (const cat of topCategories) {
      // Generate specific actions based on category
      if (cat.category.includes('BROKEN')) {
        actions.push({
          action_type: 'FIX_BROKEN_PROMISES',
          priority: 1,
          estimated_reduction: cat.total_debt * 0.8,
          effort_hours: 4,
          specific_tasks: [
            'Review all pending commitments',
            'Deliver on top 3 overdue items',
            'Communicate realistic timelines'
          ]
        });
      } else if (cat.category.includes('CONFUSION')) {
        actions.push({
          action_type: 'CLARIFY_CONFUSION',
          priority: 2,
          estimated_reduction: cat.total_debt * 0.6,
          effort_hours: 2,
          specific_tasks: [
            'Update unclear documentation',
            'Add examples to complex features',
            'Create FAQ for common issues'
          ]
        });
      } else if (cat.category.includes('INCONSISTENCY')) {
        actions.push({
          action_type: 'IMPROVE_CONSISTENCY',
          priority: 3,
          estimated_reduction: cat.total_debt * 0.7,
          effort_hours: 3,
          specific_tasks: [
            'Align conflicting patterns',
            'Standardize naming conventions',
            'Update style guides'
          ]
        });
      }
    }

    // Calculate ROI for each action
    for (const action of actions) {
      action.roi_score = action.estimated_reduction / action.effort_hours;
      
      await this.db.run(`
        INSERT INTO trust_debt_actions 
        (action_type, priority, estimated_reduction, effort_hours, roi_score)
        VALUES (?, ?, ?, ?, ?)
      `, [action.action_type, action.priority, action.estimated_reduction, 
          action.effort_hours, action.roi_score]);
    }

    // Sort by ROI
    actions.sort((a, b) => b.roi_score - a.roi_score);
    
    this.actionPlan = actions;
    return actions;
  }

  async recordEvent(event) {
    this.currentDebt += event.debt_change;
    
    await this.db.run(`
      INSERT INTO trust_debt_events 
      (category, source, description, debt_change, cumulative_debt, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [event.category, event.source, event.description, 
        event.debt_change, this.currentDebt, 
        JSON.stringify(event.metadata || {})]);
  }

  async createSnapshot() {
    const fim = await this.calculateFIMAlignment();
    
    const categoryBreakdown = await this.db.all(`
      SELECT category, SUM(debt_change) as total
      FROM trust_debt_events
      GROUP BY category
    `);

    await this.db.run(`
      INSERT INTO trust_debt_snapshots 
      (total_debt, category_breakdown, factor_scores, fim_alignment, action_items)
      VALUES (?, ?, ?, ?, ?)
    `, [this.currentDebt, 
        JSON.stringify(categoryBreakdown),
        JSON.stringify(TRUST_FACTORS),
        fim.fim,
        JSON.stringify(this.actionPlan)]);

    return {
      total_debt: this.currentDebt,
      fim_alignment: fim,
      categories: categoryBreakdown,
      action_plan: this.actionPlan
    };
  }

  async generateReport() {
    const snapshot = await this.createSnapshot();
    
    const report = `
# 🎯 Trust Debt Report
Generated: ${new Date().toISOString()}

## Current Status
**Total Trust Debt: ${this.currentDebt.toFixed(0)} units**
**FIM Alignment: ${(snapshot.fim_alignment.fim * 100).toFixed(1)}%**
- Skill: ${snapshot.fim_alignment.skill.toFixed(1)}%
- Environment: ${snapshot.fim_alignment.environment.toFixed(1)}%

## Debt Breakdown by Category
${snapshot.categories.map(c => 
  `- ${c.category}: ${c.total > 0 ? '+' : ''}${c.total.toFixed(0)} units`
).join('\n')}

## 🚀 Immediate Action Plan
${this.actionPlan.slice(0, 3).map((action, i) => `
### ${i + 1}. ${action.action_type.replace(/_/g, ' ')}
- **Priority**: ${action.priority}
- **Estimated Reduction**: ${action.estimated_reduction.toFixed(0)} units
- **Effort**: ${action.effort_hours} hours
- **ROI Score**: ${action.roi_score.toFixed(1)}x
- **Tasks**:
${action.specific_tasks?.map(t => `  - ${t}`).join('\n') || '  - [Define specific tasks]'}
`).join('\n')}

## Trend Analysis
- Current Debt: ${this.currentDebt.toFixed(0)} units
- 7-Day Change: ${await this.get7DayChange()} units
- Velocity: ${this.currentDebt > 0 ? 'INCREASING ⚠️' : 'DECREASING ✅'}

## Insurance Status
${this.currentDebt < 200 ? '✅ INSURABLE' : '⚠️ HIGH RISK - Reduce debt below 200'}
`;

    return report;
  }

  async get7DayChange() {
    const weekAgo = await this.db.get(`
      SELECT cumulative_debt FROM trust_debt_events
      WHERE timestamp <= datetime('now', '-7 days')
      ORDER BY timestamp DESC
      LIMIT 1
    `);
    
    return (this.currentDebt - (weekAgo?.cumulative_debt || 0)).toFixed(0);
  }

  async monitor(interval = 60000) {
    console.log('🔄 Starting continuous trust debt monitoring...');
    
    const runAnalysis = async () => {
      console.log(`\n⏰ ${new Date().toLocaleTimeString()} - Running trust analysis...`);
      
      // Run all analyses
      const commits = await this.analyzeCommits(10);
      const docs = await this.analyzeDocumentation();
      const behavior = await this.analyzeUserBehavior();
      
      // Generate action plan if debt is high
      if (this.currentDebt > 100) {
        await this.generateActionPlan();
      }
      
      // Create snapshot
      const snapshot = await this.createSnapshot();
      
      // Display summary
      console.log(`
📊 Trust Debt: ${this.currentDebt.toFixed(0)} units
📈 FIM: ${(snapshot.fim_alignment.fim * 100).toFixed(1)}%
🔄 Changes: Commits ${commits.commitDebt > 0 ? '+' : ''}${commits.commitDebt}, Docs ${docs.docDebt > 0 ? '+' : ''}${docs.docDebt}
${this.currentDebt > 100 ? '⚠️ ACTION REQUIRED - Run: node scripts/trust-debt-tracker.js report' : '✅ Trust levels healthy'}
      `.trim());
      
      // Write to log file
      const logPath = path.join(process.cwd(), 'logs', 'trust-debt.log');
      await fs.appendFile(logPath, `${new Date().toISOString()}: Debt=${this.currentDebt.toFixed(0)}, FIM=${(snapshot.fim_alignment.fim * 100).toFixed(1)}%\n`);
    };
    
    // Run immediately
    await runAnalysis();
    
    // Then run on interval
    setInterval(runAnalysis, interval);
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2] || 'analyze';
  const tracker = new TrustDebtTracker();
  await tracker.initialize();

  switch (command) {
    case 'analyze':
      console.log('🔍 Running complete trust debt analysis...\n');
      
      const commits = await tracker.analyzeCommits();
      console.log(`✓ Commits analyzed: ${commits.events} events, ${commits.commitDebt > 0 ? '+' : ''}${commits.commitDebt} debt`);
      
      const docs = await tracker.analyzeDocumentation();
      console.log(`✓ Documentation: ${docs.issues} issues, ${docs.docDebt > 0 ? '+' : ''}${docs.docDebt} debt`);
      
      const behavior = await tracker.analyzeUserBehavior();
      console.log(`✓ User behavior: ${behavior.behaviorDebt > 0 ? '+' : ''}${behavior.behaviorDebt} debt`);
      
      await tracker.generateActionPlan();
      const report = await tracker.generateReport();
      
      console.log(report);
      
      // Save report
      const reportPath = path.join(process.cwd(), 'docs', 'trust-debt-report.md');
      await fs.writeFile(reportPath, report);
      console.log(`\n📄 Report saved to: ${reportPath}`);
      break;

    case 'monitor':
      await tracker.monitor(60000); // Check every minute
      break;

    case 'plan':
      await tracker.generateActionPlan();
      console.log('🎯 Trust Debt Reduction Plan:\n');
      
      for (const [i, action] of tracker.actionPlan.entries()) {
        console.log(`${i + 1}. ${action.action_type.replace(/_/g, ' ')}`);
        console.log(`   Reduction: ${action.estimated_reduction.toFixed(0)} units`);
        console.log(`   Effort: ${action.effort_hours} hours`);
        console.log(`   ROI: ${action.roi_score.toFixed(1)}x\n`);
      }
      break;

    case 'reset':
      console.log('⚠️ Resetting trust debt to 0...');
      await tracker.db.run('DELETE FROM trust_debt_events');
      await tracker.db.run('DELETE FROM trust_debt_snapshots');
      await tracker.db.run('DELETE FROM trust_debt_actions');
      console.log('✅ Trust debt reset complete');
      break;

    default:
      console.log(`
Trust Debt Tracker - Usage:
  node scripts/trust-debt-tracker.js analyze  - Run full analysis and generate report
  node scripts/trust-debt-tracker.js monitor  - Start continuous monitoring
  node scripts/trust-debt-tracker.js plan     - Generate action plan
  node scripts/trust-debt-tracker.js reset    - Reset all trust debt data
      `);
  }

  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = TrustDebtTracker;