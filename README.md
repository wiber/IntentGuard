# IntentGuard 🎯

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/wiber/IntentGuard/pulls)

> AI-powered semantic co-pilot for git commits that catches drift between what you say and what you do

IntentGuard uses AI to analyze your commit messages and code changes in real-time, ensuring they align. It helps maintain codebase coherence by catching "semantic drift" - when your stated intent diverges from your actual implementation.

**Key Innovation**: IntentGuard introduces "semantic debt" tracking - accumulated instances where commits don't match their messages, creating a feedback loop for better development practices.

## 🚀 Quick Start

```bash
# Install globally
npm install -g intentguard

# Initialize in your repository
cd your-git-repo
intentguard init

# Make commits as usual
git add .
git commit -m "Add user authentication"
```

## 🎯 How It Works

1. **You commit code** with a message describing your intent
2. **IntentGuard analyzes** both your message and code changes using AI
3. **You get instant feedback** on alignment between intent and implementation
4. **You decide** whether to proceed, revise, or acknowledge the drift

### Example Output

✅ **Good Commit:**
```
[IntentGuard Analysis]
- Stated Intent: Refactor authentication to use JWTs.
- Code Analysis: Changes introduce jsonwebtoken library, modify login functions, and update token handling.
- Semantic Drift: 7% (High Alignment)

✅ Intent Alignment: HIGH (93/100). Commit proceeding.
```

⚠️ **Misaligned Commit:**
```
[IntentGuard Analysis]
- Stated Intent: Add logging to user module.
- Code Analysis: Changes add logging, but also modify database schemas and introduce a new external API.
- Semantic Drift: 72% (High Misalignment)

⚠️ WARNING: High Semantic Drift Detected! (28/100)
   Commit message seems incomplete. Code changes introduce significant architectural modifications beyond logging.

What would you like to do?
1. Abort commit (edit message and code)
2. Acknowledge & commit (creates semantic debt)
3. Commit anyway
```

## 📊 Semantic Debt Tracking

IntentGuard introduces the concept of "semantic debt" - acknowledged instances where your commit message didn't fully capture your code changes. This debt is tracked in `.intentdebt.md` and you're reminded to address it in future commits.

```markdown
### Semantic Debt Acknowledged: 2024-01-15

**Commit:** `a3f4c1d`
**Stated Intent:** "Add logging to user module."
**Drift Warning:** High Semantic Drift Detected! (28/100). Code changes also modified database schemas.
**Status:** [ ] Unresolved
```

On your next commit, you'll see:
```
🔔 Reminder: You have 1 unresolved Semantic Debt item. Consider addressing it in your next commit.
```

## 🔧 Configuration

### Quick Setup

```bash
# Install globally
npm install -g intentguard

# Initialize in your repo
cd your-project
intentguard init

# Choose your LLM provider when prompted:
# - OpenAI (GPT-4)
# - Claude (Anthropic) 
# - Local LLM (Ollama)
```

### Configuration Files

#### Global Config (`~/.intentguard/config.json`)
Created during first-time setup:
```json
{
  "provider": "openai",      // or "claude", "local"
  "apiKey": "sk-...",        // your API key
  "model": "gpt-4o"          // optional model override
}
```

#### Project Config (`.intentguardrc`)
Optional per-project configuration:
```json
{
  "provider": "claude",
  "drift_threshold": 0.7,    // 0.0-1.0, lower = stricter
  "semantic_rules": {
    "feat": "New functionality",
    "fix": "Bug fixes",
    "docs": "Documentation only"
  },
  "project_context": "E-commerce platform focused on performance"
}
```

### LLM Provider Options

| Provider | Models | API Key Required | Privacy |
|----------|--------|------------------|----------|
| OpenAI | gpt-4o, gpt-4-turbo | Yes | Cloud |
| Claude | claude-3-5-sonnet | Yes | Cloud |
| Ollama | llama2, mistral, etc | No | Local |

### Environment Variables

```bash
# Option 1: Set API key via environment
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...

# Option 2: Use different provider per project
INTENTGUARD_PROVIDER=claude git commit -m "message"

# Option 3: Skip IntentGuard for emergency commits
SKIP_INTENTGUARD=1 git commit -m "emergency fix"
```

### Semantic Debt Tracking

The `.intentdebt.md` file tracks misaligned commits:

```markdown
### Semantic Debt Acknowledged: 2025-01-29

**Commit:** `a3f4c1d`
**Stated Intent:** "Add logging to user module"
**Drift Warning:** High Semantic Drift Detected! (28/100). 
Code changes also modified database schemas.
**Status:** [ ] Unresolved
```

Review regularly and mark items as resolved when addressed:
- `[ ]` → `[x]` when fixed in a later commit

## 🧠 Why IntentGuard?

- **Prevents Technical Debt** - Catch architectural drift before it compounds
- **Improves Documentation** - Ensures commit messages accurately reflect changes
- **Enhances Code Reviews** - Reviewers see commits that mean what they say
- **Builds Better Habits** - Encourages thoughtful, intentional commits

## 📝 Commands

```bash
intentguard init      # Initialize in current repository
intentguard analyze   # Manually analyze staged changes
```

## 🔒 Privacy & Security

- **Local First** - All processing happens on your machine
- **LLM Choice** - Use OpenAI, Claude, or local models for complete privacy
- **No Storage** - IntentGuard doesn't store your code or commit messages
- **Gitignored** - The `.intentdebt.md` file is automatically gitignored

## 📦 Requirements

- Node.js 16+
- Git repository
- API key for your chosen LLM provider (or local LLM)

## 🤝 Contributing

IntentGuard is open source! We welcome contributions.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. **Use IntentGuard on your commits!** 😉
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🗺️ Roadmap

- [ ] VS Code extension
- [ ] GitHub Actions integration
- [ ] Team analytics dashboard
- [ ] Custom semantic rules
- [ ] PR-level drift analysis

## 📚 Documentation

- [Claude Integration Guide](CLAUDE_CODE_INTEGRATION.md)
- [Publishing Guide](PUBLISH.md)
- [Architecture Notes](LAUNCH_NOTES.md)

## 📄 License

MIT License - see LICENSE file for details

---

Built with ❤️ by developers who've written one too many misleading commit messages