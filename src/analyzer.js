const chalk = require('chalk');
const ora = require('ora');
const { getConfig } = require('./config');
const { createProvider } = require('./llm-providers');

async function analyzeCommit(commitMessage, codeDiff) {
  const spinner = ora('Analyzing semantic alignment...').start();
  
  try {
    const config = await getConfig();
    const provider = createProvider(config);
    
    const prompt = `You are \`IntentGuard\`, a world-class software architect and semantic analyst. Your task is to determine the alignment between a developer's stated intent (from their commit message) and their realized intent (from their code changes).

Analyze the following commit message and code diff.

**Commit Message:**
"""
${commitMessage}
"""

**Code Diff:**
"""
${codeDiff.substring(0, 8000)} ${codeDiff.length > 8000 ? '... (truncated)' : ''}
"""

Respond ONLY in the following JSON format. Do not add any other text or explanation.

{
  "stated_intent_summary": "A concise, one-sentence summary of the commit message's goal.",
  "realized_intent_summary": "A concise, one-sentence summary of what the code changes actually accomplish.",
  "semantic_dimensions": {
    "stated": ["List", "of", "semantic", "areas", "implied", "by", "the", "message"],
    "realized": ["List", "of", "semantic", "areas", "actually", "touched", "by", "the", "code"]
  },
  "alignment_score": A float between 0.0 and 1.0, where 1.0 is perfect alignment and 0.0 is total misalignment. Calculate this based on the overlap and divergence of the semantic dimensions.,
  "explanation": "A brief, human-readable explanation of any significant drift between the stated and realized intents."
}`;

    const analysis = await provider.analyze(prompt);
    
    spinner.stop();
    
    // Display analysis
    console.log(chalk.blue('\n[IntentGuard Analysis]'));
    console.log(chalk.gray('- Stated Intent:'), analysis.stated_intent_summary);
    console.log(chalk.gray('- Code Analysis:'), analysis.realized_intent_summary);
    
    const driftPercentage = Math.round((1 - analysis.alignment_score) * 100);
    const alignmentColor = analysis.alignment_score >= 0.7 ? 'green' : 
                           analysis.alignment_score >= 0.4 ? 'yellow' : 'red';
    
    console.log(chalk.gray('- Semantic Drift:'), 
                chalk[alignmentColor](`${driftPercentage}% (${getAlignmentLabel(analysis.alignment_score)})`));
    
    return analysis;
  } catch (error) {
    spinner.fail('Analysis failed');
    
    if (error.message.includes('API key')) {
      throw new Error('OpenAI API key not configured. Run "intentguard init" to set it up.');
    }
    
    throw error;
  }
}

function getAlignmentLabel(score) {
  if (score >= 0.8) return 'High Alignment';
  if (score >= 0.6) return 'Moderate Alignment';
  if (score >= 0.4) return 'Low Alignment';
  return 'High Misalignment';
}

module.exports = {
  analyzeCommit
};