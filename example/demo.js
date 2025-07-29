#!/usr/bin/env node

/**
 * IntentGuard Demo Script
 * 
 * This demonstrates how IntentGuard analyzes commit messages vs code changes
 */

const { analyze } = require('../src');
const chalk = require('chalk');

console.log(chalk.cyan('\n=== IntentGuard Demo ===\n'));

// Simulate different scenarios
const scenarios = [
  {
    name: 'Well-aligned commit',
    message: 'Add error handling to API endpoints',
    diff: `
diff --git a/src/api.js b/src/api.js
index abc123..def456 100644
--- a/src/api.js
+++ b/src/api.js
@@ -5,6 +5,9 @@ app.get('/users', (req, res) => {
+  try {
     const users = await db.getUsers();
     res.json(users);
+  } catch (error) {
+    res.status(500).json({ error: 'Failed to fetch users' });
+  }
 });`
  },
  {
    name: 'Misaligned commit',
    message: 'Fix typo in README',
    diff: `
diff --git a/src/database.js b/src/database.js
index abc123..def456 100644
--- a/src/database.js
+++ b/src/database.js
@@ -1,3 +1,15 @@
+const mongoose = require('mongoose');
+
+const userSchema = new mongoose.Schema({
+  name: String,
+  email: String,
+  password: String,
+  createdAt: Date
+});
+
+module.exports = mongoose.model('User', userSchema);`
  }
];

async function runDemo() {
  for (const scenario of scenarios) {
    console.log(chalk.yellow(`\nScenario: ${scenario.name}`));
    console.log(chalk.gray('Commit message:'), scenario.message);
    console.log(chalk.gray('Analyzing...'));
    
    // Mock the git functions for demo
    const originalGetDiff = require('../src/git').getGitDiff;
    const originalGetMessage = require('../src/git').getCommitMessage;
    
    require('../src/git').getGitDiff = async () => scenario.diff;
    require('../src/git').getCommitMessage = async () => scenario.message;
    
    try {
      await analyze(scenario.message);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
    }
    
    // Restore originals
    require('../src/git').getGitDiff = originalGetDiff;
    require('../src/git').getCommitMessage = originalGetMessage;
    
    console.log(chalk.gray('\n' + '-'.repeat(50)));
  }
}

// Check if API key is configured
const { getConfig } = require('../src/config');
getConfig().then(config => {
  if (!config.apiKey) {
    console.log(chalk.red('\n⚠️  No API key configured!'));
    console.log(chalk.yellow('Run "intentguard init" to set up your OpenAI API key.\n'));
    process.exit(1);
  }
  
  runDemo().catch(console.error);
});