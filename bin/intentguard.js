#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const { init, analyze } = require('../src/index');

program
  .name('intentguard')
  .description('Semantic co-pilot for git commits')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize IntentGuard in your repository')
  .action(async () => {
    try {
      await init();
    } catch (error) {
      console.error('Error initializing IntentGuard:', error.message);
      process.exit(1);
    }
  });

program
  .command('analyze')
  .description('Manually analyze staged changes')
  .action(async () => {
    try {
      await analyze();
    } catch (error) {
      console.error('Error analyzing changes:', error.message);
      process.exit(1);
    }
  });

program.parse();