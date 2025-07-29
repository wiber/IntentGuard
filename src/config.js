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
  
  try {
    const content = await fs.readFile(CONFIG_FILE, 'utf8');
    const config = JSON.parse(content);
    
    // Also check environment variable
    if (!config.apiKey && process.env.OPENAI_API_KEY) {
      config.apiKey = process.env.OPENAI_API_KEY;
    }
    
    return config;
  } catch (error) {
    // Check environment variable first
    if (process.env.OPENAI_API_KEY) {
      return { apiKey: process.env.OPENAI_API_KEY };
    }
    
    return {};
  }
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