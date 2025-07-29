const inquirer = require('inquirer');
const chalk = require('chalk');

async function askUserChoice() {
  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: 'What would you like to do?',
      choices: [
        {
          name: '1. Abort commit (edit message and code)',
          value: 'abort',
          short: 'Abort'
        },
        {
          name: '2. Acknowledge & commit (creates semantic debt)',
          value: 'acknowledge',
          short: 'Acknowledge'
        },
        {
          name: '3. Commit anyway',
          value: 'proceed',
          short: 'Proceed'
        }
      ]
    }
  ]);
  
  return choice;
}

async function getLLMConfig() {
  const { provider } = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Select your LLM provider:',
      choices: [
        { name: 'OpenAI (GPT-4)', value: 'openai' },
        { name: 'Claude (Anthropic)', value: 'claude' },
        { name: 'Local LLM (Ollama)', value: 'local' }
      ],
      default: 'openai'
    }
  ]);
  
  let apiKey = '';
  if (provider !== 'local') {
    const result = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: `Enter your ${provider === 'openai' ? 'OpenAI' : 'Anthropic'} API key:`,
        mask: '*',
        validate: input => input.length > 0 || 'API key is required'
      }
    ]);
    apiKey = result.apiKey;
  }
  
  return { provider, apiKey };
}

async function confirmInit() {
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Initialize IntentGuard in this repository?',
      default: true
    }
  ]);
  
  return confirm;
}

function displayWelcome() {
  console.log(chalk.cyan('\n=== IntentGuard Setup ==='));
  console.log(chalk.gray('Semantic co-pilot for git commits\n'));
}

function displaySuccess(message) {
  console.log(chalk.green('✓'), message);
}

function displayError(message) {
  console.log(chalk.red('✗'), message);
}

function displayInfo(message) {
  console.log(chalk.blue('ℹ'), message);
}

module.exports = {
  askUserChoice,
  getLLMConfig,
  confirmInit,
  displayWelcome,
  displaySuccess,
  displayError,
  displayInfo
};