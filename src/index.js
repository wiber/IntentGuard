const { initializeRepo } = require('./init');
const { analyzeCommit } = require('./analyzer');
const { getGitDiff, getCommitMessage } = require('./git');
const { askUserChoice } = require('./ui');
const { addSemanticDebt, checkSemanticDebt } = require('./debt');

async function init() {
  await initializeRepo();
}

async function analyze(commitMessage = null) {
  try {
    // Check for unresolved semantic debt
    const debtReminder = await checkSemanticDebt();
    
    // Get commit message and diff
    const message = commitMessage || await getCommitMessage();
    const diff = await getGitDiff();
    
    if (!message) {
      throw new Error('No commit message provided');
    }
    
    if (!diff || diff.trim() === '') {
      console.log('No staged changes to analyze.');
      return { proceed: true };
    }
    
    // Analyze alignment
    const analysis = await analyzeCommit(message, diff);
    
    // Display debt reminder if any
    if (debtReminder) {
      console.log(debtReminder);
    }
    
    // Handle based on alignment score
    if (analysis.alignment_score >= 0.7) {
      console.log(`\n✅ Intent Alignment: HIGH (${Math.round(analysis.alignment_score * 100)}/100). Commit proceeding.`);
      return { proceed: true };
    } else {
      console.log(`\n⚠️ WARNING: High Semantic Drift Detected! (${Math.round(analysis.alignment_score * 100)}/100)`);
      console.log(`   ${analysis.explanation}\n`);
      
      const choice = await askUserChoice();
      
      if (choice === 'abort') {
        return { proceed: false };
      } else if (choice === 'acknowledge') {
        await addSemanticDebt(message, analysis);
        return { proceed: true };
      } else {
        return { proceed: true };
      }
    }
  } catch (error) {
    console.error('Error during analysis:', error);
    throw error;
  }
}

module.exports = {
  init,
  analyze
};