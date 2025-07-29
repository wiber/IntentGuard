# IntentGuard Steering Document 🧭

> This document serves as the semantic anchor for IntentGuard development. Use it to check if new features and changes align with our core intent.

## 🎯 Core Mission

**IntentGuard catches semantic drift between what developers say they're doing and what they actually do.**

### The One-Liner
"Your commits say one thing. Your code does another. IntentGuard catches the drift before it becomes debt."

## 🏗️ Foundational Principles

1. **Semantic Debt is Real** - Misaligned commits compound into architectural confusion
2. **Developer Autonomy** - Never block, always inform
3. **LLM Agnostic** - Any AI that can analyze should work
4. **Local First** - Privacy and speed matter
5. **Simple Integration** - One command to start, zero config to try

## 📐 Architecture Decisions

### What We ARE:
- ✅ A git hook that fires on commit
- ✅ An LLM-powered semantic analyzer
- ✅ A debt tracking system (.intentdebt.md)
- ✅ A feedback loop for better commits

### What We ARE NOT:
- ❌ A linter or syntax checker
- ❌ A commit message formatter
- ❌ A code quality tool
- ❌ A CI/CD pipeline component (yet)

## 🚦 Feature Alignment Check

Before adding any feature, ask:

1. **Does it help catch semantic drift?** If no, stop.
2. **Does it respect developer autonomy?** Must never force behavior.
3. **Does it work with multiple LLMs?** Avoid vendor lock-in.
4. **Can it run locally?** Privacy first.
5. **Is it simple to use?** Complexity kills adoption.

## 📊 Success Metrics

1. **Adoption**: Developers use it voluntarily
2. **Retention**: They keep using it after trying
3. **Debt Reduction**: Measurable decrease in semantic drift over time
4. **Oh Moments**: "I didn't realize my commits were so misaligned!"

## 🗺️ Roadmap Alignment

### Phase 1 (Current) - MVP ✅
- Basic git hook integration
- Multi-LLM support
- Semantic debt tracking
- CLI interface

### Phase 2 - Team Features
- [ ] Shared semantic debt dashboards
- [ ] Team drift patterns analysis
- [ ] PR-level drift detection
- [ ] Custom semantic rules per project

### Phase 3 - IDE Integration
- [ ] VS Code extension
- [ ] IntelliJ plugin
- [ ] Real-time drift warnings while coding
- [ ] Suggested commit messages based on changes

### Phase 4 - CI/CD Pipeline
- [ ] GitHub Actions integration
- [ ] GitLab CI integration
- [ ] Drift gates (optional blocking)
- [ ] Historical drift analysis

## 🚨 Drift Warnings

Watch for these signs of project drift:

1. **Feature Creep**: Adding code analysis beyond semantic alignment
2. **Complexity Creep**: Requiring configuration before first use
3. **Vendor Lock**: Becoming too dependent on one LLM provider
4. **Scope Creep**: Trying to fix commits instead of just detecting drift

## 📝 Semantic Patterns to Maintain

### Commit Messages About IntentGuard Should Follow:
- `feat:` - New drift detection capabilities
- `fix:` - Correcting drift detection errors
- `enhance:` - Improving detection accuracy
- `refactor:` - Internal changes (no drift impact)
- `docs:` - Documentation updates

### Language We Use:
- "Semantic drift" not "bad commits"
- "Alignment score" not "commit quality"
- "Debt tracking" not "mistake logging"
- "Intent analysis" not "AI judgment"

## 🔄 Review Cadence

Every 10 commits to IntentGuard:
1. Run IntentGuard on IntentGuard's commits
2. Check accumulated semantic debt
3. Verify alignment with this document
4. Update this document if intent has legitimately evolved

## 🎭 The Meta Test

**IntentGuard must pass its own test**: Every commit to IntentGuard should have high semantic alignment. If we can't use our own tool effectively, why should others?

---

*Last Updated: January 2025*
*Steering Document Version: 1.0*

> "The best way to prevent drift is to know where you're going." - IntentGuard Philosophy