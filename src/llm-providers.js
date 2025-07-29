const OpenAI = require('openai');
const axios = require('axios');

class LLMProvider {
  async analyze(prompt) {
    throw new Error('analyze() must be implemented by subclass');
  }
}

class OpenAIProvider extends LLMProvider {
  constructor(apiKey, model = 'gpt-4o') {
    super();
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }
  
  async analyze(prompt) {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });
    
    return JSON.parse(response.choices[0].message.content);
  }
}

class ClaudeProvider extends LLMProvider {
  constructor(apiKey, model = 'claude-3-5-sonnet-20241022') {
    super();
    this.apiKey = apiKey;
    this.model = model;
  }
  
  async analyze(prompt) {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: this.model,
        max_tokens: 1024,
        messages: [{ 
          role: 'user', 
          content: prompt + '\n\nRespond only with valid JSON.' 
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        }
      }
    );
    
    // Claude returns text, so we need to parse it
    const content = response.data.content[0].text;
    return JSON.parse(content);
  }
}

class LocalProvider extends LLMProvider {
  constructor(endpoint = 'http://localhost:11434/api/generate') {
    super();
    this.endpoint = endpoint;
  }
  
  async analyze(prompt) {
    // For Ollama or other local LLMs
    const response = await axios.post(this.endpoint, {
      model: 'llama2',
      prompt: prompt + '\n\nRespond only with valid JSON.',
      stream: false
    });
    
    return JSON.parse(response.data.response);
  }
}

function createProvider(config) {
  const provider = config.provider || 'openai';
  const apiKey = config.apiKey || process.env[`${provider.toUpperCase()}_API_KEY`];
  
  switch (provider.toLowerCase()) {
    case 'openai':
      return new OpenAIProvider(apiKey, config.model);
    case 'claude':
    case 'anthropic':
      return new ClaudeProvider(apiKey, config.model);
    case 'local':
    case 'ollama':
      return new LocalProvider(config.endpoint);
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

module.exports = {
  createProvider,
  OpenAIProvider,
  ClaudeProvider,
  LocalProvider
};