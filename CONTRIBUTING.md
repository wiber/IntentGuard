# Contributing to IntentGuard: The Developer's Guide to Trust Debt

## 🎯 The "Aha!" Moment We're Building

IntentGuard isn't just another linter. It reveals the **hidden story** of why your code breaks, why onboarding is hell, and why that refactor you did last month is still causing issues.

## 🚀 Quick Start: Fix Your Own Project First

```bash
# 1. Clone IntentGuard locally
git clone https://github.com/wiber/IntentGuard.git
cd IntentGuard

# 2. Hardlink to your project (or use it as a submodule)
ln -s ../your-project test-project

# 3. Run analysis on your project
node src/trust-debt-final.js

# 4. Open the report and find YOUR "aha!" moment
open trust-debt-final.html
```

## 💡 The Conversation We Want to Unlock

Instead of: "Your Trust Debt is 7924 units"

We want: "That Performance module you refactored last month? It's now secretly dependent on the Design system, but nobody updated the docs. That's why the new hire broke production yesterday."

## 🧠 Using Claude to Evolve Categories (AI-Assisted Orthogonalization)

### The Current Category Problem
Our categories aren't perfectly orthogonal (27.3% correlation). This is actually GOOD - it shows real-world coupling. But we need to evolve them intelligently.

### How to Contribute Better Categories

1. **Analyze Your Domain**: Run IntentGuard on your project
2. **Identify Coupling**: Look for high off-diagonal values
3. **Ask Claude**: Use this prompt:

```
I'm analyzing Trust Debt in my [domain] project. Current categories are:
- A🚀 Performance (optimization, efficient, fast)
- B🔒 Security (protect, guard, defend)
- C💨 Speed (quick, rapid, instant)
- D🧠 Intelligence (pattern, analyze, ai)
- E🎨 Experience (visual, design, ui)

My hotspots show coupling between [X] and [Y].
Should we:
1. Create a new subcategory for this coupling?
2. Redefine keywords to reduce overlap?
3. Accept this as domain-specific reality?

Context: [paste your worst drift patterns]
```

4. **Submit a PR** with your category evolution and rationale

## 📖 Story-Driven Insights: The Template

When you find a drift pattern, document it like this:

```markdown
### 💡 AHA! [Catchy Title for the Problem]
**Drift Score**: X units (Y× asymmetry)

**The Story**: 
[2-3 sentences explaining what's happening in human terms]
Example: "Your Performance code is calling Design.render() 47 times per second, 
but the architecture docs claim they're independent modules."

**Why This Matters**:
- 🔥 **Daily Pain**: [What breaks/slows because of this]
- 📉 **Performance Hit**: [Quantified impact]
- ⚠️ **Future Risk**: [What will break next]

**High-ROI Fix**:
1. **Quick Win** (5 min): Update README.md to mention the dependency
2. **Proper Fix** (2 hours): Refactor to use event system instead
3. **Strategic Fix** (sprint): Redesign module boundaries

**Expected Impact**: -30 units of Trust Debt
```

## 🔄 The Viral Loop We're Creating

```
Developer runs IntentGuard
    ↓
Sees specific story about THEIR code
    ↓
"Holy shit, that's why X keeps breaking!"
    ↓
Fixes the issue (usually just updates docs)
    ↓
Trust Debt drops 30%
    ↓
Shares the before/after on Twitter
    ↓
Their manager sees the financial impact
    ↓
Manager schedules enterprise demo
    ↓
Enterprise sale
```

## 🛠️ What to Contribute

### 1. Domain-Specific Categories
Every domain has its patterns. Help us identify them:

**Frontend**: 
- Components vs Services
- State vs Props
- Sync vs Async

**Backend**:
- API vs Database
- Auth vs Authorization  
- Sync vs Queue

**ML/AI**:
- Training vs Inference
- Model vs Data
- Accuracy vs Speed

### 2. Better Keyword Mappings

Current keywords are generic. Make them specific:

```javascript
// Instead of:
'A🚀': ['performance', 'optimize', 'efficient']

// Domain-specific:
'A🚀.web': ['lighthouse', 'fps', 'ttfb', 'cls', 'lcp']
'A🚀.ml': ['epochs', 'batch', 'gpu', 'tensor', 'gradient']
'A🚀.db': ['query', 'index', 'join', 'transaction', 'lock']
```

### 3. Story Templates for Common Patterns

We need a library of "aha!" moments:

```javascript
const DRIFT_STORIES = {
  'performance_design_coupling': {
    title: "Performance Hijacked by UI",
    story: "Your performance optimizations are entangled with UI rendering",
    pain: "Every UI change risks breaking your optimization",
    fix: "Separate computation from presentation"
  },
  'security_speed_tradeoff': {
    title: "Security Theater vs Actual Speed",
    story: "Your auth checks are in the hot path",
    pain: "Every request is 200ms slower than needed",
    fix: "Move auth to edge/gateway layer"
  }
  // Add your patterns here!
}
```

## 🎯 Staying Partially AI-Orthogonalized

### The Goal
We want ~10% correlation (currently 27.3%). But NOT zero - that would be unrealistic.

### The Strategy
1. **Accept Reality**: Some coupling is real and should be documented
2. **Identify False Coupling**: Keyword overlap that doesn't reflect actual dependency
3. **Create Intersection Categories**: For legitimate cross-cutting concerns

### How to Test Orthogonality

```bash
# After changing categories, measure the impact:
node src/trust-debt-final.js > before.txt

# Make your category changes

node src/trust-debt-final.js > after.txt

# Compare orthogonality scores
diff before.txt after.txt | grep "Orthogonality"
```

## 📊 Measuring Your Contribution's Impact

Every PR should include:

1. **Before/After Trust Debt scores**
2. **Orthogonality improvement** (if applicable)
3. **Story clarity** (does it create an "aha!" moment?)
4. **Fix actionability** (can a developer act on it immediately?)

## 🚢 Shipping Your Changes

1. **Fork and Clone**
2. **Create Feature Branch**: `git checkout -b story/performance-design-coupling`
3. **Test on Multiple Projects**: Ensure your changes work across domains
4. **Document the Story**: Add to DRIFT_PATTERNS.md
5. **Submit PR** with:
   - The problem you're solving
   - The "aha!" moment you're creating
   - Before/after metrics
   - Why this matters for developers

## 💬 The Conversation We Want

Join our discussions on evolving categories:

**GitHub Discussions**: Share your domain-specific patterns
**Discord**: Real-time category evolution discussions
**Twitter**: Share your "aha!" moments with #TrustDebt

## 🎪 The Bigger Picture

Remember: We're building a Trojan Horse. 

- **For Developers**: A tool that explains why things break
- **For Managers**: A metric that quantifies technical debt in dollars
- **For Enterprises**: A compliance requirement for AI systems

Your contribution helps all three audiences.

## 📝 Contribution Checklist

- [ ] Ran IntentGuard on my own project
- [ ] Found at least one "aha!" moment
- [ ] Documented the story in human terms
- [ ] Provided actionable fixes with effort estimates
- [ ] Tested changes on 3+ different projects
- [ ] Improved orthogonality (or explained why not)
- [ ] Added domain-specific insights
- [ ] Created shareable before/after visualization

## 🤝 Code of Conduct

We're building a tool that reveals uncomfortable truths about code. Be kind:

- **No shaming**: High Trust Debt isn't "bad code" - it's misalignment
- **Constructive**: Focus on fixes, not blame
- **Inclusive**: Every domain has its patterns
- **Pragmatic**: Perfect orthogonality is impossible

## 🎉 Recognition

Contributors who identify new drift patterns that become part of the core get:
- Credit in the pattern library
- Co-authorship on related blog posts
- Invitation to enterprise customer advisory sessions
- Early access to AI-powered features

---

**Ready to find your "aha!" moment?**

```bash
git clone https://github.com/wiber/IntentGuard.git
cd IntentGuard
npm install
node src/trust-debt-final.js

# What story will your code tell?
```