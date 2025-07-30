# 🚀 IntentGuard v0.2.0 Release

We're excited to announce IntentGuard v0.2.0 with major improvements to LLM provider support, configuration flexibility, and developer experience!

## ✨ New Features

### 🤖 Multi-LLM Provider Support
- **Claude Integration** - Full support for Anthropic's Claude 3.5 Sonnet
- **OpenAI GPT-4** - Enhanced support with GPT-4o model
- **Local LLM Support** - Ollama integration for complete privacy
- Seamless provider switching via configuration

### 🔧 Enhanced Configuration System
- **Global Config** (`~/.intentguard/config.json`) - Set once, use everywhere
- **Project Config** (`.intentguardrc`) - Fine-tune per repository
- **Semantic Rules** - Define custom commit type meanings
- **Project Context** - Add domain-specific understanding
- **Drift Threshold** - Adjustable sensitivity (0.0-1.0)

### 📊 Semantic Debt Tracking
- Improved `.intentdebt.md` format with timestamps
- Status tracking for debt resolution
- Next-commit reminders for unresolved debt
- Automated debt file management

### 🎯 Developer Experience
- **Quick Setup** - Single `intentguard init` command
- **Skip Option** - `SKIP_INTENTGUARD=1` for emergency commits  
- **Better Error Handling** - Graceful failures don't block commits
- **Performance** - Optimized diff truncation for faster analysis
- **Privacy First** - No code storage, local-first architecture

## 🔄 Improvements

- Added comprehensive documentation (CLAUDE_CODE_INTEGRATION.md, STEERING.md)
- Enhanced CLI with better prompts and feedback
- Improved git hook reliability with Husky integration
- Added GitHub Actions workflow for testing
- Better API key management with environment variable support
- Refined semantic analysis prompts for higher accuracy

## 🐛 Bug Fixes

- Fixed ESM package compatibility issues with Node.js
- Corrected repository URLs in package.json
- Improved error handling for missing configurations
- Fixed git hook installation on various platforms

## 📚 Documentation

- New STEERING.md for project alignment and philosophy
- Enhanced README with clear examples and configuration options
- Added CLAUDE_CODE_INTEGRATION.md for Anthropic users
- Comprehensive LAUNCH_NOTES.md with technical details
- PUBLISH.md guide for npm publishing

## 🙏 Thank You

Thanks to all early testers and contributors who helped shape v0.2.0! Your feedback on semantic drift detection has been invaluable.

## 🚀 Getting Started

```bash
npm install -g intentguard
cd your-repo
intentguard init
```

Choose your preferred LLM provider and start catching semantic drift today!

## 📈 What's Next

- VS Code extension (in development)
- GitHub Actions integration
- Team analytics dashboard
- PR-level drift analysis

---

**Remember**: Your commits say one thing. Your code does another. IntentGuard catches the drift before it becomes debt.