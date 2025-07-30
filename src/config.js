const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.intentguard');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

async function ensureConfigDir() {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch (error) {
    // Directory already exists, that's fine
  }
}

async function getConfig() {
  await ensureConfigDir();
  
  let config = {};
  
  // 1. Load global config
  try {
    const content = await fs.readFile(CONFIG_FILE, 'utf8');
    config = JSON.parse(content);
  } catch (error) {
    // No global config yet
  }
  
  // 2. Load project config (.intentguardrc)
  try {
    const projectConfig = await fs.readFile('.intentguardrc', 'utf8');
    const projectSettings = JSON.parse(projectConfig);
    config = { ...config, ...projectSettings };
  } catch (error) {
    // No project config, that's fine
  }
  
  // 3. Check environment variables (highest priority)
  const envProvider = process.env.INTENTGUARD_PROVIDER;
  if (envProvider) {
    config.provider = envProvider;
  }
  
  // Check for API keys in environment
  if (!config.apiKey) {
    if (config.provider === 'claude' || config.provider === 'anthropic') {
      config.apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    } else if (config.provider === 'openai' || !config.provider) {
      config.apiKey = process.env.OPENAI_API_KEY;
    }
  }
  
  return config;
}

async function saveConfig(config) {
  await ensureConfigDir();
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

async function updateConfig(updates) {
  const current = await getConfig();
  const updated = { ...current, ...updates };
  await saveConfig(updated);
  return updated;
}

module.exports = {
  getConfig,
  saveConfig,
  updateConfig
};