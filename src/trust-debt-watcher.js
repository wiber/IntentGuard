#!/usr/bin/env node

/**
 * Trust Debt File Watcher
 * Monitors files and triggers Trust Debt calculation on changes
 */

const chokidar = require('chokidar');
const { execSync } = require('child_process');
const path = require('path');
const debounce = require('lodash.debounce');

console.log('👁️  Starting Trust Debt file watcher...');

// Files and patterns to watch
const watchPatterns = [
  'CLAUDE.md',
  'README.md',
  'docs/**/*.md',
  'WEEK_*.md',
  '.git/logs/HEAD'
];

// Debounced calculation function (wait 5 seconds after last change)
const calculateTrustDebt = debounce(() => {
  console.log('📊 File change detected. Calculating Trust Debt...');
  
  try {
    execSync('node scripts/generate-trust-debt-tabbed.js', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    // Get current debt value
    const RealTrustDebtGenerator = require('./generate-trust-debt-real');
    const gen = new RealTrustDebtGenerator();
    const debt = gen.calculateTrustDebt();
    
    console.log(`✅ Trust Debt updated: ${debt.totalDebt} units`);
    
    // Alert if debt is high
    if (debt.totalDebt > 300) {
      console.log('🔴 WARNING: Trust Debt in CRISIS zone!');
    } else if (debt.totalDebt > 200) {
      console.log('🟡 CAUTION: Trust Debt AT RISK');
    } else {
      console.log('🟢 Good: Trust Debt INSURABLE');
    }
  } catch (error) {
    console.error('❌ Error calculating Trust Debt:', error.message);
  }
}, 5000);

// Initialize watcher
const watcher = chokidar.watch(watchPatterns, {
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 2000,
    pollInterval: 100
  }
});

// Add event listeners
watcher
  .on('add', path => {
    console.log(`File added: ${path}`);
    calculateTrustDebt();
  })
  .on('change', path => {
    console.log(`File changed: ${path}`);
    calculateTrustDebt();
  })
  .on('unlink', path => {
    console.log(`File removed: ${path}`);
    calculateTrustDebt();
  })
  .on('error', error => console.error(`Watcher error: ${error}`))
  .on('ready', () => console.log('✅ Trust Debt watcher ready and monitoring...'));

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Stopping Trust Debt watcher...');
  watcher.close();
  process.exit(0);
});
