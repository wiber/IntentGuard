const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const { getCurrentCommitHash } = require('./git');

const DEBT_FILE = '.intentdebt.md';

async function addSemanticDebt(commitMessage, analysis) {
  try {
    const commitHash = await getCurrentCommitHash();
    const date = new Date().toISOString().split('T')[0];
    const driftPercentage = Math.round((1 - analysis.alignment_score) * 100);
    
    const entry = `---
### Semantic Debt Acknowledged: ${date}

**Commit:** \`${commitHash}\`
**Stated Intent:** "${commitMessage}"
**Drift Warning:** High Semantic Drift Detected! (${Math.round(analysis.alignment_score * 100)}/100). ${analysis.explanation}
**Status:** [ ] Unresolved
---

`;
    
    // Check if file exists
    let content = '';
    try {
      content = await fs.readFile(DEBT_FILE, 'utf8');
    } catch (e) {
      // File doesn't exist, create header
      content = `# Semantic Debt Log

This file tracks instances where commit messages didn't fully align with code changes.
Review and resolve these items to maintain codebase coherence.

`;
    }
    
    // Append new entry
    content += entry;
    await fs.writeFile(DEBT_FILE, content);
    
    console.log(chalk.yellow('\n📝 Semantic debt recorded in .intentdebt.md'));
  } catch (error) {
    console.error('Failed to record semantic debt:', error.message);
  }
}

async function checkSemanticDebt() {
  try {
    const content = await fs.readFile(DEBT_FILE, 'utf8');
    
    // Count unresolved items
    const unresolvedCount = (content.match(/\[ \] Unresolved/g) || []).length;
    
    if (unresolvedCount > 0) {
      return chalk.yellow(`\n🔔 Reminder: You have ${unresolvedCount} unresolved Semantic Debt item${unresolvedCount > 1 ? 's' : ''}. Consider addressing ${unresolvedCount > 1 ? 'them' : 'it'} in your next commit.`);
    }
  } catch (e) {
    // No debt file, that's fine
  }
  
  return null;
}

async function getUnresolvedDebt() {
  try {
    const content = await fs.readFile(DEBT_FILE, 'utf8');
    const entries = content.split('---').filter(e => e.includes('Semantic Debt Acknowledged'));
    
    const unresolved = entries
      .filter(entry => entry.includes('[ ] Unresolved'))
      .map(entry => {
        const lines = entry.trim().split('\n');
        const dateMatch = lines[0].match(/(\d{4}-\d{2}-\d{2})/);
        const commitMatch = entry.match(/\*\*Commit:\*\* `([^`]+)`/);
        const intentMatch = entry.match(/\*\*Stated Intent:\*\* "([^"]+)"/);
        
        return {
          date: dateMatch ? dateMatch[1] : 'Unknown',
          commit: commitMatch ? commitMatch[1] : 'Unknown',
          intent: intentMatch ? intentMatch[1] : 'Unknown'
        };
      });
    
    return unresolved;
  } catch (e) {
    return [];
  }
}

async function markDebtResolved(commitHash) {
  try {
    let content = await fs.readFile(DEBT_FILE, 'utf8');
    
    // Replace [ ] with [x] for the given commit
    content = content.replace(
      new RegExp(`(\\*\\*Commit:\\*\\* \`${commitHash}\`[\\s\\S]*?)\\[ \\] Unresolved`, 'g'),
      '$1[x] Resolved'
    );
    
    await fs.writeFile(DEBT_FILE, content);
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  addSemanticDebt,
  checkSemanticDebt,
  getUnresolvedDebt,
  markDebtResolved
};