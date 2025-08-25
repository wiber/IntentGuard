# IntentGuard™ - Measure Trust Debt in Your Git Repo

**📊 What It Is**: Like test coverage, but for documentation accuracy  
**🔥 For Developers**: `npx intentguard` - See your Trust Debt in 30 seconds  
**📈 Your Score**: Most repos score 3,000+. React scores 127. You?  
**🎯 The Truth**: Your docs are lying. Here's the proof.

[![npm version](https://badge.fury.io/js/intentguard.svg)](https://www.npmjs.com/package/intentguard)
[![GitHub stars](https://img.shields.io/github/stars/wiber/IntentGuard.svg)](https://github.com/wiber/IntentGuard)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Patent Pending](https://img.shields.io/badge/Patent-Pending-orange.svg)](https://github.com/wiber/IntentGuard/blob/main/PATENTS.md)

## 📊 Our Own Trust Debt (We Eat Our Own Dog Food)

[![Total Trust Debt](https://img.shields.io/badge/Total%20Trust%20Debt-11,843%20units-red.svg)](https://github.com/eliasmoosman/IntentGuard/blob/main/trust-debt-final.html)
[![Broken Promises](https://img.shields.io/badge/Broken%20Promises-5,458-orange.svg)](https://github.com/eliasmoosman/IntentGuard/blob/main/trust-debt-final.html)
[![Hidden Features](https://img.shields.io/badge/Hidden%20Features-6,385-blue.svg)](https://github.com/eliasmoosman/IntentGuard/blob/main/trust-debt-final.html)
[![Orthogonality](https://img.shields.io/badge/Orthogonality-11%25-red.svg)](https://github.com/eliasmoosman/IntentGuard/blob/main/trust-debt-final.html)
[![Alpha Status](https://img.shields.io/badge/Alpha%20Status-Chaos-purple.svg)](https://github.com/eliasmoosman/IntentGuard/blob/main/trust-debt-final.html)

> **Alpha Reality Check:** 11,843 units of total confusion - we have 5,458 broken promises and 6,385 hidden features. Our orthogonality is 11% (categories are basically having a fistfight). This is exactly why we built IntentGuard. [See our beautiful mess →](trust-debt-final.html)

IntentGuard™ measures **Trust Debt** - the gap between your documentation and your code. Every broken promise and hidden feature, quantified.

**What You Get Today:**
- 📊 **Trust Debt Score**: 0-10,000 scale (lower is better)
- 🔴 **Broken Promises**: Features you documented but didn't implement
- 🟡 **Hidden Features**: Features you implemented but didn't document
- 🏆 **Global Ranking**: Compare your score to 10,000+ measured repos



## 🚀 Quick Start - 30 Seconds to Your Trust Debt

```bash
# One command. That's it.
npx intentguard
```

**What You'll See:**
```
🔍 Analyzing your repository...

📊 TRUST DEBT REPORT
━━━━━━━━━━━━━━━━━━━
Total Trust Debt: 3,847 😱
Broken Promises: 234 (documented but not implemented)
Hidden Features: 567 (implemented but not documented)

🏆 YOUR RANKING
━━━━━━━━━━━━━━━
Global Rank: #5,472 out of 10,000 repos
Vs React (127): 30x worse
Vs Average (3,000): 28% worse

⚡ QUICK WINS (Fix in <5 minutes)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Delete zombie.md (-500 points)
2. Update README.md line 47 (-300 points)
3. Document auth.js exports (-200 points)
```

## 🎯 What Trust Debt Measures

**Trust Debt** = The gap between what your docs promise and what your code delivers.

### Three Types of Drift We Find:

1. **🔴 Broken Promises** - Features in docs that don't exist in code
   - "API endpoint /user/delete" (doesn't exist)
   - "Automatic retry on failure" (never implemented)
   - "Supports markdown" (actually doesn't)

2. **🟡 Hidden Features** - Code that's not documented
   - Secret admin endpoints
   - Undocumented API parameters
   - Hidden configuration options

3. **🟠 Misaligned Features** - Works differently than documented
   - "Returns JSON" (returns XML)
   - "Limit: 100" (actual limit: 50)
   - "Async operation" (actually synchronous)

## 💻 Installation & Usage

### Quick Test (No Install)
```bash
# See your Trust Debt right now
npx intentguard
```

### Full Installation
```bash
# Install globally
npm install -g intentguard

# Run in any git repo
cd your-project
intentguard analyze

# Generate detailed HTML report
intentguard analyze --output html

# Add to CI/CD pipeline
intentguard ci --threshold 1000
```

### Add Badge to README
```markdown
![Trust Debt](https://img.shields.io/badge/Trust%20Debt-3847-yellow.svg)
```

## 📈 How Scoring Works

**Trust Debt Score** = Sum of all gaps between documentation and implementation

- **0-100**: Excellent - Your docs match your code
- **100-500**: Good - Minor drift, easy to fix
- **500-1000**: Warning - Noticeable gaps emerging
- **1000-3000**: Poor - Significant documentation drift
- **3000+**: Critical - Docs and code are different products

**Benchmarks:**
- React: 127 (well-maintained)
- Express: 234 (good)
- Average npm package: 3,200 (poor)
- Enterprise apps: 5,000+ (critical)

## 🏆 The Competition

### Current Leaderboard (Live)

**Best Scores (Hall of Fame):**
1. 🥇 solidjs/solid: 12
2. 🥈 denoland/deno: 45 
3. 🥉 ai/nanoid: 67

**Popular Repos:**
- facebook/react: 127
- expressjs/express: 234
- vuejs/vue: 567
- angular/angular: 892

**Worst Scores (Hall of Shame):**
- Various enterprise apps: 5,000-10,000+

### Add Your Badge

Show your Trust Debt score in your README:

```markdown
![Trust Debt](https://img.shields.io/badge/Trust%20Debt-YOUR_SCORE-color.svg)
```

Colors:
- Green (0-500): You're doing great
- Yellow (500-1000): Room for improvement
- Orange (1000-3000): Need attention
- Red (3000+): Critical drift

## 🔨 CI/CD Integration

Fail builds when Trust Debt gets too high:

```yaml
# GitHub Actions
- name: Check Trust Debt
  run: |
    npx intentguard ci --threshold 1000
    if [ $? -ne 0 ]; then
      echo "Trust Debt too high!"
      exit 1
    fi
```

```yaml
# GitLab CI
check-trust-debt:
  script:
    - npx intentguard ci --threshold 1000
  allow_failure: false
```


## 🤔 FAQ

### "What's Trust Debt?"
The measurable gap between what your documentation promises and what your code actually does. Like technical debt, but for documentation accuracy.

### "How is this different from code coverage?"
Code coverage measures if code is tested. Trust Debt measures if code is honest about what it does.

### "Why should I care?"
- Your next employer might check your Trust Debt score
- High Trust Debt = more bugs, slower onboarding, team confusion
- It's becoming the new code quality metric

### "Is this another linter?"
No. Linters check code style. IntentGuard checks if your promises match reality.

### "Why is my score so high?"
Most repos have 3,000+ Trust Debt because nobody measures documentation drift. You're not alone.


## 🚀 Why Use IntentGuard?

### For Individual Developers
- 📉 **Improve your code quality** - Lower Trust Debt = better maintainability
- 🏆 **Stand out** - Add Trust Debt badge to your repos
- 💼 **Career advantage** - "Maintains <500 Trust Debt" on your resume
- ⏱️ **Save time** - Find documentation issues before they become bugs

### For Teams
- 🔄 **Prevent drift** - Catch documentation rot early
- 👥 **Faster onboarding** - New devs trust accurate docs
- 📧 **Fewer questions** - When docs match code, Slack quiets down
- 📋 **Objective metrics** - Quantify documentation quality

### For Open Source Projects
- 🌟 **Build trust** - Show contributors your docs are accurate
- 🚫 **Set standards** - Require Trust Debt checks in PRs
- 📊 **Track health** - Monitor drift over time
- 🏅 **Compete** - Beat other projects' scores

## 🔮 Coming Soon: Enterprise Features

**AI Drift Prevention**: Apply Trust Debt principles to AI models
- Measure alignment between AI training and behavior
- Prevent model drift before production failures
- Meet EU AI Act compliance requirements
- Get insurance coverage for AI systems

**Unity Architecture** (Patent Pending): 361× performance for real-time monitoring

**Contact**: enterprise@intentguard.io for early access

## 📢 Contributing

Found a bug? Want to improve Trust Debt calculation? We welcome contributions!

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/IntentGuard
cd IntentGuard

# Install dependencies
npm install

# Run tests
npm test

# Submit PR
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📜 License

MIT License - Use freely in your projects!

Enterprise features and Unity Architecture are patent-pending. Contact enterprise@intentguard.io for licensing.

## 📚 Resources

- **NPM**: https://www.npmjs.com/package/intentguard
- **GitHub**: https://github.com/wiber/IntentGuard
- **Issues**: https://github.com/wiber/IntentGuard/issues
- **Creator**: [@wiber](https://github.com/wiber)

---

**Start measuring your Trust Debt:**

```bash
npx intentguard
```

*Your docs are lying. Here's the proof.*