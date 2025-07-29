# Using IntentGuard with Claude Code 🤖

IntentGuard works seamlessly with Claude Code to analyze your commits using Anthropic's Claude AI.

## Setup

1. **Get your Anthropic API key:**
   - Visit https://console.anthropic.com/account/keys
   - Create a new API key

2. **Install IntentGuard:**
   ```bash
   npm install -g intentguard
   ```

3. **Initialize in your repo:**
   ```bash
   cd your-project
   intentguard init
   ```
   
   When prompted:
   - Select "Claude (Anthropic)" as your provider
   - Enter your Anthropic API key

## How It Works

When you commit with Claude Code watching your project:

```bash
# Make changes with Claude Code
git add .
git commit -m "Refactor authentication system"
```

IntentGuard will:
1. Send your commit message and diff to Claude API
2. Claude analyzes semantic alignment
3. You get instant feedback in your terminal

## Example Session

```
[IntentGuard Analysis]
- Stated Intent: Refactor authentication system
- Code Analysis: Changes modify auth flow, add JWT tokens, update database schema
- Semantic Drift: 15% (High Alignment)

✅ Intent Alignment: HIGH (85/100). Commit proceeding.
```

## Benefits of Claude Integration

- **Superior reasoning**: Claude excels at understanding code semantics and architectural implications
- **Context awareness**: Better at catching subtle drift in complex codebases  
- **Natural explanations**: Claude provides clear, human-readable drift explanations

## Pro Tips

1. **Use descriptive commits**: Claude performs better with clear intent statements
2. **Review drift patterns**: Check `.intentdebt.md` to see how Claude catches your patterns
3. **Adjust threshold**: Modify drift threshold in `.intentguardrc` based on your needs

## Configuration

Your `~/.intentguard/config.json` for Claude:
```json
{
  "provider": "claude",
  "apiKey": "sk-ant-...",
  "model": "claude-3-5-sonnet-20241022"
}
```

## Troubleshooting

- **Rate limits**: Claude has generous limits but may throttle heavy usage
- **API errors**: Ensure your API key has proper permissions
- **Timeout**: Large diffs may take longer; be patient

## Integration with Claude Code Projects

When working on a project with Claude Code:

1. Claude Code helps you write code
2. IntentGuard ensures your commits accurately describe what Claude helped create
3. Together, they maintain semantic coherence in your codebase

This creates a powerful feedback loop where AI assists both in writing code AND maintaining clear documentation through accurate commit messages.