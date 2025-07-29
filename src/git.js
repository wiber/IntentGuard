const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function getGitDiff() {
  try {
    const { stdout } = await execAsync('git diff --cached');
    return stdout;
  } catch (error) {
    throw new Error(`Failed to get git diff: ${error.message}`);
  }
}

async function getCommitMessage() {
  // Check if we're in the middle of a commit (COMMIT_EDITMSG exists)
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    // Try to read from .git/COMMIT_EDITMSG first
    const gitDir = await getGitDir();
    const commitMsgPath = path.join(gitDir, 'COMMIT_EDITMSG');
    
    try {
      const message = await fs.readFile(commitMsgPath, 'utf8');
      // Remove comments and empty lines
      const cleanMessage = message
        .split('\n')
        .filter(line => !line.startsWith('#') && line.trim() !== '')
        .join('\n')
        .trim();
      
      if (cleanMessage) {
        return cleanMessage;
      }
    } catch (e) {
      // File doesn't exist, that's okay
    }
    
    // If no COMMIT_EDITMSG, check if message was passed via -m flag
    // This would be handled by the git hook passing it as an argument
    return null;
  } catch (error) {
    throw new Error(`Failed to get commit message: ${error.message}`);
  }
}

async function getGitDir() {
  try {
    const { stdout } = await execAsync('git rev-parse --git-dir');
    return stdout.trim();
  } catch (error) {
    throw new Error(`Not in a git repository: ${error.message}`);
  }
}

async function isGitRepo() {
  try {
    await execAsync('git rev-parse --git-dir');
    return true;
  } catch {
    return false;
  }
}

async function getCurrentCommitHash() {
  try {
    const { stdout } = await execAsync('git rev-parse HEAD');
    return stdout.trim().substring(0, 7); // Short hash
  } catch (error) {
    // No commits yet
    return 'initial';
  }
}

module.exports = {
  getGitDiff,
  getCommitMessage,
  getGitDir,
  isGitRepo,
  getCurrentCommitHash
};