#!/usr/bin/env node

/**
 * Trust Debt Dashboard - Real-time Trust Monitoring
 * 
 * Interactive dashboard showing trust debt trends, categories, and actions
 */

const blessed = require('blessed');
const contrib = require('blessed-contrib');
const { execSync } = require('child_process');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

class TrustDebtDashboard {
  constructor() {
    this.screen = null;
    this.grid = null;
    this.widgets = {};
    this.db = null;
    this.updateInterval = 5000; // 5 seconds
  }

  async initialize() {
    // Setup screen
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Trust Debt Dashboard'
    });

    // Create grid
    this.grid = new contrib.grid({
      rows: 12,
      cols: 12,
      screen: this.screen
    });

    // Open database
    this.db = await open({
      filename: path.join(process.cwd(), 'data', 'trust-debt.db'),
      driver: sqlite3.Database
    });

    // Create widgets
    this.createWidgets();

    // Setup key handlers
    this.setupKeyHandlers();

    // Start updates
    await this.update();
    setInterval(() => this.update(), this.updateInterval);

    // Render
    this.screen.render();
  }

  createWidgets() {
    // Main trust debt gauge
    this.widgets.debtGauge = this.grid.set(0, 0, 4, 4, contrib.gauge, {
      label: '🎯 Total Trust Debt',
      stroke: 'cyan',
      fill: 'white',
      style: {
        fg: 'cyan',
        border: { fg: 'cyan' }
      }
    });

    // FIM Score gauge
    this.widgets.fimGauge = this.grid.set(0, 4, 4, 4, contrib.gauge, {
      label: '📊 FIM Alignment',
      stroke: 'green',
      fill: 'white',
      style: {
        fg: 'green',
        border: { fg: 'green' }
      }
    });

    // Trend chart
    this.widgets.trendChart = this.grid.set(0, 8, 4, 4, contrib.line, {
      style: {
        line: 'yellow',
        text: 'green',
        baseline: 'black',
        border: { fg: 'cyan' }
      },
      label: '📈 7-Day Trust Trend',
      showLegend: true,
      legend: { width: 12 }
    });

    // Category breakdown
    this.widgets.categoryBar = this.grid.set(4, 0, 4, 6, contrib.bar, {
      label: '📊 Debt by Category',
      barWidth: 6,
      barSpacing: 2,
      xOffset: 0,
      maxHeight: 20,
      style: {
        fg: 'cyan',
        border: { fg: 'cyan' }
      }
    });

    // Recent events log
    this.widgets.eventLog = this.grid.set(4, 6, 4, 6, contrib.log, {
      label: '📝 Recent Trust Events',
      style: {
        fg: 'white',
        border: { fg: 'cyan' }
      },
      tags: true
    });

    // Action plan
    this.widgets.actionTable = this.grid.set(8, 0, 4, 8, contrib.table, {
      label: '🚀 Reduction Action Plan',
      keys: true,
      fg: 'white',
      selectedFg: 'white',
      selectedBg: 'blue',
      interactive: true,
      width: '100%',
      height: '100%',
      border: { type: 'line', fg: 'cyan' },
      columnSpacing: 2,
      columnWidth: [30, 10, 10, 10]
    });

    // Stats box
    this.widgets.statsBox = this.grid.set(8, 8, 4, 4, blessed.box, {
      label: '📊 Quick Stats',
      content: '',
      tags: true,
      style: {
        fg: 'white',
        border: { fg: 'cyan' }
      }
    });
  }

  setupKeyHandlers() {
    this.screen.key(['escape', 'q', 'C-c'], () => {
      return process.exit(0);
    });

    this.screen.key(['r', 'R'], async () => {
      await this.update();
      this.screen.render();
    });

    this.screen.key(['a', 'A'], async () => {
      // Run analysis
      execSync('node scripts/trust-debt-tracker.js analyze > /tmp/trust-analysis.txt');
      this.widgets.eventLog.log('{green-fg}✓ Analysis complete{/}');
      this.screen.render();
    });

    this.screen.key(['p', 'P'], () => {
      // Generate plan
      execSync('node scripts/trust-debt-tracker.js plan > /tmp/trust-plan.txt');
      this.widgets.eventLog.log('{green-fg}✓ Action plan generated{/}');
      this.screen.render();
    });

    this.screen.key(['h', 'H'], () => {
      // Show help
      const helpText = `
{bold}Trust Debt Dashboard - Commands{/bold}
{green-fg}q{/} - Quit
{green-fg}r{/} - Refresh data
{green-fg}a{/} - Run full analysis
{green-fg}p{/} - Generate action plan
{green-fg}h{/} - Show this help
      `;
      
      const helpBox = blessed.box({
        parent: this.screen,
        top: 'center',
        left: 'center',
        width: '50%',
        height: '50%',
        content: helpText,
        tags: true,
        border: { type: 'line', fg: 'cyan' },
        style: {
          fg: 'white',
          bg: 'black',
          border: { fg: 'cyan' }
        }
      });

      this.screen.render();
      
      setTimeout(() => {
        helpBox.destroy();
        this.screen.render();
      }, 3000);
    });
  }

  async update() {
    try {
      // Get current debt
      const current = await this.db.get(`
        SELECT total_debt, fim_alignment, category_breakdown
        FROM trust_debt_snapshots
        ORDER BY timestamp DESC
        LIMIT 1
      `);

      if (current) {
        // Update debt gauge
        const maxDebt = 500;
        const debtPercent = Math.min(100, (current.total_debt / maxDebt) * 100);
        this.widgets.debtGauge.setPercent(debtPercent);
        this.widgets.debtGauge.setLabel(`🎯 Trust Debt: ${current.total_debt.toFixed(0)} units`);

        // Update FIM gauge
        const fimPercent = current.fim_alignment * 100;
        this.widgets.fimGauge.setPercent(fimPercent);
        this.widgets.fimGauge.setLabel(`📊 FIM: ${fimPercent.toFixed(1)}%`);

        // Update category breakdown
        if (current.category_breakdown) {
          const categories = JSON.parse(current.category_breakdown);
          const barData = {
            titles: categories.slice(0, 5).map(c => c.category.substring(0, 8)),
            data: categories.slice(0, 5).map(c => Math.abs(c.total))
          };
          this.widgets.categoryBar.setData(barData);
        }
      }

      // Get trend data
      const trend = await this.db.all(`
        SELECT timestamp, total_debt
        FROM trust_debt_snapshots
        WHERE timestamp > datetime('now', '-7 days')
        ORDER BY timestamp ASC
      `);

      if (trend.length > 0) {
        const trendData = {
          title: 'Trust Debt',
          x: trend.map((_, i) => i.toString()),
          y: trend.map(t => t.total_debt),
          style: { line: 'yellow' }
        };
        this.widgets.trendChart.setData([trendData]);
      }

      // Get recent events
      const events = await this.db.all(`
        SELECT category, description, debt_change
        FROM trust_debt_events
        ORDER BY timestamp DESC
        LIMIT 10
      `);

      for (const event of events.reverse()) {
        const color = event.debt_change < 0 ? 'green' : 'red';
        this.widgets.eventLog.log(
          `{${color}-fg}${event.debt_change > 0 ? '+' : ''}${event.debt_change.toFixed(0)}{/} ${event.category}: ${event.description?.substring(0, 50) || ''}`
        );
      }

      // Get action plan
      const actions = await this.db.all(`
        SELECT action_type, estimated_reduction, effort_hours, roi_score
        FROM trust_debt_actions
        WHERE status = 'pending'
        ORDER BY roi_score DESC
        LIMIT 5
      `);

      if (actions.length > 0) {
        const tableData = {
          headers: ['Action', 'Reduction', 'Hours', 'ROI'],
          data: actions.map(a => [
            a.action_type.replace(/_/g, ' ').substring(0, 25),
            `${a.estimated_reduction.toFixed(0)}`,
            `${a.effort_hours}h`,
            `${a.roi_score.toFixed(1)}x`
          ])
        };
        this.widgets.actionTable.setData(tableData);
      }

      // Update stats
      const stats = await this.getStats();
      this.widgets.statsBox.setContent(`
{bold}Last 24 Hours:{/}
{green-fg}Reduced:{/} ${stats.reduced} units
{red-fg}Added:{/} ${stats.added} units
{yellow-fg}Net:{/} ${stats.net > 0 ? '+' : ''}${stats.net} units

{bold}Velocity:{/}
${stats.velocity > 0 ? '{red-fg}⬆ INCREASING{/}' : '{green-fg}⬇ DECREASING{/}'}

{bold}Status:{/}
${current?.total_debt < 200 ? '{green-fg}✓ INSURABLE{/}' : '{red-fg}⚠ HIGH RISK{/}'}
      `);

      this.screen.render();
    } catch (error) {
      this.widgets.eventLog.log(`{red-fg}Error: ${error.message}{/}`);
      this.screen.render();
    }
  }

  async getStats() {
    const stats = await this.db.get(`
      SELECT 
        SUM(CASE WHEN debt_change < 0 THEN ABS(debt_change) ELSE 0 END) as reduced,
        SUM(CASE WHEN debt_change > 0 THEN debt_change ELSE 0 END) as added
      FROM trust_debt_events
      WHERE timestamp > datetime('now', '-1 day')
    `);

    const velocity = await this.db.get(`
      SELECT 
        (SELECT total_debt FROM trust_debt_snapshots ORDER BY timestamp DESC LIMIT 1) -
        (SELECT total_debt FROM trust_debt_snapshots WHERE timestamp < datetime('now', '-1 day') ORDER BY timestamp DESC LIMIT 1)
        as change
    `);

    return {
      reduced: stats?.reduced || 0,
      added: stats?.added || 0,
      net: (stats?.added || 0) - (stats?.reduced || 0),
      velocity: velocity?.change || 0
    };
  }
}

// Main
async function main() {
  console.log('Starting Trust Debt Dashboard...');
  console.log('Press "h" for help, "q" to quit\n');
  
  const dashboard = new TrustDebtDashboard();
  await dashboard.initialize();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = TrustDebtDashboard;