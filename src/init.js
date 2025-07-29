const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const {
  displayWelcome,
  displaySuccess,
  displayError,
  displayInfo,
  getLLMConfig,
  confirmInit
} = require('./ui');
const { updateConfig, getConfig } = require('./config');
const { isGitRepo } = require('./git');

async function initializeRepo() {
  displayWelcome();
  
  // Check if we're in a git repo
  if (!await isGitRepo()) {
    displayError('Not in a git repository. Run "git init" first.');
    process.exit(1);
  }
  
  // Check if already initialized
  const hasHook = await checkHookExists();
  if (hasHook) {
    displayInfo('IntentGuard is already initialized in this repository.');
    const reinit = await confirmInit();
    if (!reinit) {
      return;
    }
  }
  
  // Get or confirm LLM configuration
  const config = await getConfig();
  if (!config.apiKey && !config.provider) {
    displayInfo('LLM provider configuration required for semantic analysis.');
    displayInfo('API Keys:');
    displayInfo('- OpenAI: https://platform.openai.com/api-keys');
    displayInfo('- Claude: https://console.anthropic.com/account/keys\n');
    
    const llmConfig = await getLLMConfig();
    await updateConfig(llmConfig);
    displaySuccess('LLM configuration saved to ~/.intentguard/config.json');
  } else {
    displaySuccess(`Using existing ${config.provider || 'OpenAI'} configuration`);
  }
  
  // Install husky
  displayInfo('Installing git hooks...');
  try {
    await execAsync('npm install --save-dev husky');
    await execAsync('npx husky install');
    displaySuccess('Husky installed');
  } catch (error) {
    // Husky might already be installed
    try {
      await execAsync('npx husky install');
    } catch (e) {
      displayError('Failed to install husky. Please install manually: npm install --save-dev husky');
      process.exit(1);
    }
  }
  
  // Copy the pre-commit hook
  try {
    const hookSource = path.join(__dirname, '..', 'hooks', 'pre-commit');
    const hookContent = await fs.readFile(hookSource, 'utf8');
    
    // Create husky hook that calls our script
    const huskyHook = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# IntentGuard pre-commit hook
exec node ${hookSource}
`;
    
    await fs.writeFile('.husky/pre-commit', huskyHook);
    await execAsync('chmod +x .husky/pre-commit');
    displaySuccess('Pre-commit hook created');
    
    // Also create commit-msg hook for better message capture
    const commitMsgHookSource = path.join(__dirname, '..', 'hooks', 'commit-msg');
    const commitMsgHook = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# IntentGuard commit-msg hook
exec node ${commitMsgHookSource} "$1"
`;
    
    await fs.writeFile('.husky/commit-msg', commitMsgHook);
    await execAsync('chmod +x .husky/commit-msg');
    displaySuccess('Commit-msg hook created');
  } catch (error) {
    displayError('Failed to create pre-commit hook: ' + error.message);
    process.exit(1);
  }
  
  // Add .intentdebt.md to .gitignore if not already there
  try {
    let gitignore = '';
    try {
      gitignore = await fs.readFile('.gitignore', 'utf8');
    } catch (e) {
      // No .gitignore file
    }
    
    if (!gitignore.includes('.intentdebt.md')) {
      gitignore += '\\n# IntentGuard semantic debt log\\n.intentdebt.md\\n';
      await fs.writeFile('.gitignore', gitignore);
      displaySuccess('Added .intentdebt.md to .gitignore');
    }
  } catch (error) {
    displayInfo('Could not update .gitignore. Consider adding .intentdebt.md manually.');
  }
  
  displaySuccess('\\n✨ IntentGuard initialized successfully!');
  displayInfo('\\nNext steps:');
  displayInfo('1. Make some code changes');
  displayInfo('2. Run: git add .');
  displayInfo('3. Run: git commit -m "your message"');
  displayInfo('\\nIntentGuard will analyze your commits automatically.');
}

async function checkHookExists() {
  try {
    await fs.access('.husky/pre-commit');
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  initializeRepo
};