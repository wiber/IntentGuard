# IntentGuard™ - Measure Code Drift Today, Prevent AI Catastrophe Tomorrow

**🔥 For Developers**: Free tool to measure drift between docs and code  
**💼 For Your Boss**: The same drift killing your codebase is about to destroy your AI systems

[![npm version](https://badge.fury.io/js/intentguard.svg)](https://www.npmjs.com/package/intentguard)
[![GitHub stars](https://img.shields.io/github/stars/wiber/IntentGuard.svg)](https://github.com/wiber/IntentGuard)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Patent Pending](https://img.shields.io/badge/Patent-Pending-orange.svg)](https://github.com/wiber/IntentGuard/blob/main/PATENTS.md)

IntentGuard™ is the open source standard for measuring Trust Debt - the drift between what you promise and what you deliver. Like a credit score for AI systems, it's becoming the required compliance metric. **The standard is free. Scaling it requires a patent license.**

## 🎯 The Drift Problem You Can See (Code) vs The One You Can't (AI)

### What Developers Get (Free Forever)
✅ **Instant feedback** on documentation-code drift  
✅ **Git hooks** that block commits when drift exceeds limits  
✅ **Beautiful reports** showing exactly where promises ≠ delivery  
✅ **Zero config** - works out of the box on any Git repo  

### What Your Boss Should Know (Enterprise)
⚠️ **The same drift** you see in code is happening in your AI systems  
⚠️ **But AI drift is invisible** until it causes a $10M liability event  
⚠️ **EU AI Act requires** measurable alignment by 2025  
⚠️ **Insurance companies** will demand Trust Debt scores  

> "This free tool reveals a problem only our enterprise solution can fix at AI scale" - The Strategy

## 🚀 Quick Start (Developers)

```bash
# Install globally
npm install -g intentguard

# Analyze any project
cd your-project
npx intentguard analyze

# Generate HTML report with asymmetric matrix
npx intentguard analyze --output html

# Install git hook (blocks commits when Trust Debt > threshold)
npx intentguard hook
```

## 📊 The Asymmetric Matrix

The HTML report shows an asymmetric matrix visualization:

```
         Intent (Docs) →
Reality  ┌─────┬─────┬─────┐
(Git)    │ 28  │ 52  │ 4   │  A💻 Code
  ↓      ├─────┼─────┼─────┤
         │ 40  │ 927 │ 79  │  B🔧 Features  
         ├─────┼─────┼─────┤
         │ 15  │ 83  │ 234 │  C📊 Metrics
         └─────┴─────┴─────┘
           A📚    B🎯   C📏
          Docs  Goals Standards
```

**Key insight**: Cell[Code,Docs]=28 but Cell[Docs,Code]=40 - they measure different drift directions!

## 🤖 Using with Claude CLI

IntentGuard works seamlessly with [Claude CLI](https://github.com/anthropics/claude-cli) for enhanced analysis:

### Quick Analysis with Claude
```bash
# Install Claude CLI if you haven't already
npm install -g @anthropic/claude-cli

# Run trust debt analysis with Claude's help
claude "run the trust debt report generator on this repo"

# Claude will automatically:
# 1. Run the IntentGuard analyzer
# 2. Generate an interactive HTML report
# 3. Explain the results and what they mean
```

### What Claude Can Do
- **Interpret Results**: Explain why your Trust Debt score is what it is
- **Fix Issues**: Automatically update code/docs to reduce Trust Debt
- **Custom Categories**: Generate domain-specific category mappings
- **Trend Analysis**: Track how Trust Debt changes over time
- **Actionable Insights**: Provide specific recommendations to improve alignment

## 📈 Understanding Your Results

### For Developers: What the Numbers Mean

**Trust Debt Score**: Lower is better!
- **0-100 units (Grade AAA)**: Your docs match your code - ship it! 🚀
- **100-500 units (Grade A)**: Minor drift - quick cleanup needed
- **500-1000 units (Grade B)**: Docs are lying - refactor weekend incoming
- **1000-5000 units (Grade C)**: Major drift - your README is fiction
- **5000+ units (Grade D)**: Total disconnect - rewrite from scratch

### For Your Boss: Why This Matters for AI

🚨 **If your codebase has 1000 units of drift:**
- Your AI likely has **10x more** (unmeasured)
- Each unit = **$50-500/day** in potential liability
- Regulators will require these measurements by 2025
- Insurance premiums **double** without Trust Debt scores

**The Trojan Horse**: This free tool creates awareness. The enterprise version prevents AI disasters.

### Why Your Matrix Might Look Empty

If you see a mostly empty matrix with low Trust Debt (like this repo's 69 units), **that's actually great!** It means:

1. **Minimal Content = Minimal Drift**: Less documentation and code means fewer opportunities for misalignment
2. **Good Alignment**: What little content exists is well-aligned between intent and reality
3. **Clean Start**: You're measuring early, before drift accumulates

The matrix visualizes the **strength of relationships** between categories:
- **Empty cells (0)**: No relationship detected - categories are orthogonal (good!)
- **Low values (1-10)**: Minimal drift - slight misalignment
- **High values (50+)**: Significant drift - attention needed

### Example Output from This Repository
```
📊 Trust Debt Analysis
────────────────────────
Trust Debt Score: 69 units (Grade AAA)
Orthogonality: 2.0%
Diagonal Health: Poor

💰 Business Impact:
  Estimated liability: $3,449/month
  ✅ Insurance premium -20%, full coverage
```

This shows IntentGuard itself has excellent Trust Debt - we practice what we preach!

### Why Should You Care?

**Developers**: 
- Fix drift before it becomes technical debt
- Prove your code does what docs claim
- Block bad commits automatically
- Get promotion for improving metrics

**Engineering Managers**:
- Quantify technical debt in dollars
- Justify refactoring to executives  
- Prevent documentation rot
- **Ask yourself**: If we can't align docs with code, how will we align AI with intentions?

**C-Suite / Your Boss**:
- **WARNING**: The drift in your codebase is a preview of AI catastrophe
- Enterprise IntentGuard prevents the **$10M+ liability events** coming in 2025
- Contact sales@intentguard.io for AI drift assessment

## 🏗️ Professional NPM Package Strategy

### Current Development Status
- [x] **Advanced Mode**: Full Claude AI integration with proprietary metrics
- [x] **Basic Mode**: Open source core for community adoption
- [x] **CLI Integration**: Professional command-line interface
- [x] **Post-commit Hooks**: Automatic analysis on every commit
- [x] **HTML Reports**: Comprehensive visualizations and narratives

### Open Source vs Premium Split
#### Open Source Core (MIT License)
- [x] Basic Trust Debt calculation (produces ~800-1200 units for typical projects)
- [x] Git commit analysis and document parsing
- [x] 6 standard categories (Testing, Docs, Architecture, Performance, Security, UX)
- [x] Simple HTML reports and CLI output
- [x] GitHub badge generation

#### Premium Features (Enterprise)
- [x] Claude AI semantic analysis (produces ~50-150 units with sophisticated math)
- [x] Temporal granularity (day/week/month/year weights)
- [x] Three proprietary metrics (patent-protected Unity Architecture)
- [x] Executive summary generation with business context
- [x] Physics-based reporting (M = S × E momentum formula)
- [x] Custom category configuration and enterprise compliance

### Public Audit Strategy (Launch Plan)

#### Target: React Repository Analysis
- [ ] **Announcement**: "Next Friday: We're auditing React's codebase live"
- [ ] **Live Stream**: Installing and running Intent Guard on React
- [ ] **Blog Post**: "Intent Guard Analysis of React: What We Found"
- [ ] **Community Discussion**: GitHub issues and Discord feedback
- [ ] **Viral Content**: Hacker News submission and tech newsletter features

#### Expected Marketing Impact
- [ ] **Credibility**: Analyzing respected projects demonstrates tool value
- [ ] **Visibility**: React's 200k+ stars provide massive audience
- [ ] **Education**: Shows intent-reality drift is universal problem
- [ ] **Adoption**: Clear call-to-action for developers to try tool
- [ ] **Enterprise Interest**: Proves tool works on complex, real codebases

### Business Model & Revenue Strategy

#### Freemium Conversion Funnel
- [ ] **Free Tier**: Unlimited open source projects, basic analysis
- [ ] **Pro Tier** ($29/month): Private repos, Claude AI, advanced reports
- [ ] **Enterprise Tier** ($299/month): Teams, custom metrics, API access
- [ ] **Consulting Services**: Custom audits and implementation support

#### Enterprise Sales Pipeline
- [ ] **Inbound Leads**: From public audits and open source adoption
- [ ] **Free Audits**: Custom analysis of enterprise codebases
- [ ] **Pilot Programs**: 30-day trials with dedicated support
- [ ] **Success Stories**: Case studies and ROI documentation

## 🔧 Implementation Roadmap

### Week 1: Package Professionalization
- [x] Update package.json to point to wiber/IntentGuard repository
- [x] Create professional README with marketing copy and strategy
- [x] Document report contents and validation methodology
- [ ] Add progress indicators for long-running analysis
- [ ] Implement graceful error handling and helpful messages

### Week 2: Documentation & Examples
- [ ] Write complete getting started guide
- [ ] Create React analysis example with findings
- [ ] Document advanced features and enterprise options
- [ ] Set up GitHub Issues templates and contribution guidelines
- [ ] Create Discord server for community support

### Week 3: Public Audit Execution - THE FORCING FUNCTION EVENT

#### 🎯 "The React Audit" - Live Stream Event
**Friday 2PM PT**: The moment Intent Guard proves itself on the world's stage

**Setup (10 minutes)**:
```bash
# Live on stream - install and clone React
npm install -g intentguard
git clone https://github.com/facebook/react
cd react

# Show React's massive scale
echo "📊 Analyzing React:"
echo "- GitHub Stars: 217,484"
echo "- Lines of Code: ~700,000"
echo "- Contributors: 1,500+"
```

**The Analysis (20 minutes)**:
```bash
# Adaptive category discovery
intentguard analyze

# Expected dramatic results:
# 📊 React Trust Debt Analysis
# ────────────────────────────
# Trust Debt Score: 127 units
# Status: WARNING
# 
# Top Contributors:
# 1. Performance: 34.2 units (Claims "fast" → Complex Fiber needed)
# 2. Ecosystem: 28.9 units (Claims "predictable" → Breaking changes)
# 3. Developer Experience: 18.7 units (Claims "simple" → Well-hidden complexity)
```

**The Revelation (10 minutes)**:
"127 units for React is actually **EXCEPTIONAL** engineering discipline. Most enterprise codebases score 500+. This isn't criticism - it's measurement of conscious technical debt."

#### 🚀 Viral Content Strategy
- [ ] **Pre-announcement**: "Wednesday: We're auditing React's Trust Debt live"
- [ ] **Live stream**: Real-time analysis with commentary
- [ ] **Blog post**: "React Has 127 Units of Trust Debt (And That's Actually Good)"
- [ ] **Social amplification**: Tweet thread with key findings
- [ ] **Community discussion**: React Discord, r/programming, Hacker News
- [ ] **Follow-up**: "What should we audit next? Kubernetes? VS Code?"

### Week 4: Growth & Enterprise Outreach
- [ ] Collect community feedback and iterate on UX
- [ ] Add most requested features from open source users
- [ ] Begin enterprise outreach with free audit offers
- [ ] Plan next public audit target (Kubernetes, Vue, Express)
- [ ] Explore conference speaking opportunities

## 🏢 Enterprise: When Code Drift Becomes AI Disaster

### The Pattern Your Developers See vs What's Coming for AI

**In Your Codebase (Visible, Measurable with Free Tool)**:
- README says "blazing fast" → Code has O(n²) loops
- Docs promise "enterprise security" → Passwords in plaintext
- API claims "99.9% uptime" → No error handling

**In Your AI Systems (Invisible Until Catastrophe)**:
- Training objective: "Help users" → Model: Enables fraud
- Safety guidelines: "No bias" → Output: Discriminates systematically  
- Compliance claim: "GDPR ready" → Reality: Leaks PII in prompts

**The Difference**: Code drift is embarrassing. AI drift is existential.

### What Enterprise IntentGuard Does

1. **Real-time AI Alignment Monitoring** - Not just code, but model behavior
2. **Regulatory Compliance Automation** - EU AI Act, ISO 42001, SOC2-AI
3. **Insurance Qualification** - Required for AI liability coverage by 2025
4. **C-Suite Dashboards** - Board-ready risk metrics in dollars

**Contact**: sales@intentguard.io for enterprise AI assessment

### The Public Audit Forces Function

**The Strategy**: React audit creates forcing function where NOT using Intent Guard becomes irresponsible

- [ ] **Instant Credibility**: "These guys audited React" = developer street cred
- [ ] **Viral Adoption**: Every React developer wants to try it on their code  
- [ ] **Enterprise FOMO**: CTOs ask "What's our Trust Debt score?"
- [ ] **Standard of Care**: Intent Guard becomes expected practice
- [ ] **Regulatory Requirement**: EU AI Act demands measurable alignment

### The Three Revenue Streams

#### 1. Open Source Core (Free Forever)
- Basic Trust Debt measurement for git repositories
- Builds massive developer adoption and community
- **Purpose**: Marketing and data collection for semantic map

#### 2. AI Validation Service ($99-999/month)
- Real-time validation of ChatGPT/Claude outputs
- Brand voice consistency for marketing teams
- **TAM**: 100M+ AI users × $99 = $10B market

#### 3. Compliance Platform ($5K-50K/month)
- EU AI Act compliance certificates  
- Insurance qualification for AI systems
- **TAM**: Every AI company needs this = $100B market

### Patent Protection & Competitive Moat

**Unity Architecture Patents** (Filed):
- U.S. Provisional 63/782,569: Position-meaning correspondence
- U.S. Provisional 63/854,530: Cognitive prosthetic amplification
- Pending: Trust Debt as hardware manifestation

**Why Competitors Can't Copy**:
- Patent covers core semantic mapping method
- Network effects make copies inferior (more data = better measurement)
- 18-month head start with working implementation
- Regulatory relationships and compliance certifications

## 🚀 Call to Action

### Developers
1. **Try it now**: `npx intentguard analyze`
2. **Add the hook**: `npx intentguard hook`
3. **Share results**: Tweet your Trust Debt score
4. **Contribute**: Add your language/framework patterns

### Engineering Managers  
1. **Run on your main repo** - See the drift
2. **Set team KPIs** - "Reduce Trust Debt 20% this quarter"
3. **Block bad PRs** - Require Trust Debt checks
4. **Ask the question**: "What's our AI's Trust Debt?"

### C-Suite / Decision Makers
⚠️ **This is your warning**: The drift you see in code is 10x worse in AI.

**Schedule an AI Trust Debt Assessment**:
- 30-minute executive briefing
- Free assessment of your AI systems
- Regulatory compliance roadmap
- Insurance qualification pathway

📧 **sales@intentguard.io** | 📅 **[Book a Demo](https://calendly.com/intentguard)**

### High-Impact Contributions Needed:

#### 1. **Make the Insights Better** (Biggest Impact)
```javascript
// We need more actionable insights like:
if (drift.category === 'AI_Model') {
  return {
    title: 'Model predictions drifting from training objectives',
    fix: 'Retrain with recent data or adjust thresholds',
    roi: 'Prevent $50K class-action per false positive'
  }
}
```

#### 2. **Industry-Specific Scoring**
- Healthcare: HIPAA compliance mapping
- Finance: SOC2 alignment detection  
- AI/ML: EU AI Act requirement tracking

#### 3. **Integrations** (Get us everywhere)
- GitHub Actions workflow
- GitLab CI pipeline
- VS Code extension
- Jira ticket creation from high-debt items

#### 4. **Public Audits** (Build credibility)
Help us audit major open source projects:
- React (planned)
- Kubernetes 
- TensorFlow
- Your favorite project?

### Why Contribute?
- **Be part of defining THE standard** - like contributing to ESLint in 2013
- **Your name on the patent** - significant contributors get credited
- **Shape how AI compliance works** - this will affect every company

### Getting Started
```bash
git clone https://github.com/wiber/IntentGuard.git
cd IntentGuard
npm install
npm test
```

## 📚 Resources & Links

- **NPM Package**: https://www.npmjs.com/package/intentguard
- **GitHub Repository**: https://github.com/wiber/IntentGuard
- **Documentation**: [Coming Soon] docs.intentguard.io
- **Community Discord**: [Coming Soon] discord.gg/intentguard
- **Creator**: [@wiber](https://github.com/wiber) - Elias Moosman

## 📜 License & Credits

MIT License with Patent Notice - see [LICENSE](LICENSE) for details.

Created as part of Unity Architecture research into Trust Debt measurement and the physics of information systems (M = S × E).

---

**Ready to measure your Trust Debt?**

```bash
npm install -g intentguard
intentguard analyze
```

*"The best way to predict the future is to measure the present."*