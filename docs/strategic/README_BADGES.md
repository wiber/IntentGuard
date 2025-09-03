# Trust Debt Badges for IntentGuard

## Badge Section to Add to README.md (After current badges)

```markdown
## 📊 IntentGuard's Own Metrics (Yes, We Measure Ourselves)

[![Trust Debt](https://img.shields.io/badge/Trust%20Debt-342%20units-yellow.svg)](https://github.com/eliasmoosman/IntentGuard/blob/main/trust-debt-final.html)
[![Trust Grade](https://img.shields.io/badge/Trust%20Grade-B%2B-green.svg)](https://github.com/eliasmoosman/IntentGuard/blob/main/trust-debt-final.html)
[![Orthogonality](https://img.shields.io/badge/Orthogonality-87%25-blue.svg)](https://github.com/eliasmoosman/IntentGuard/blob/main/trust-debt-final.html)
[![Asymmetry](https://img.shields.io/badge/Asymmetry-2.3x-orange.svg)](https://github.com/eliasmoosman/IntentGuard/blob/main/trust-debt-final.html)
[![Cold Spots](https://img.shields.io/badge/Cold%20Spots-14%25-lightblue.svg)](https://github.com/eliasmoosman/IntentGuard/blob/main/trust-debt-final.html)

> **Our Trust Debt:** We're building 2.3x more than we document. Classic startup syndrome. [See our full report →](trust-debt-final.html)
```

## Alternative Style (More Honest for Alpha)

```markdown
## 📊 Our Own Trust Debt (Alpha Transparency)

![Trust Debt](https://img.shields.io/badge/Trust%20Debt-342%20units-yellow.svg?style=for-the-badge)
![Grade](https://img.shields.io/badge/Grade-B%2B-green.svg?style=for-the-badge)
![Orthogonality](https://img.shields.io/badge/Orthogonality-87%25-blue.svg?style=for-the-badge)

**What this means:**
- **342 units**: We're moderately misaligned (not great, not terrible)
- **B+ Grade**: Better than 70% of projects we've analyzed
- **87% Orthogonal**: Our categories are reasonably independent
- **2.3x Asymmetry**: We code first, document later (guilty!)

*These metrics update weekly. Sometimes they get worse. That's the point.*
```

## Dynamic Badge Generation Script

Create `generate-badges.js`:

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Read the latest trust-debt-final.json
const trustDebtData = JSON.parse(
  fs.readFileSync('trust-debt-final.json', 'utf8')
);

// Extract key metrics
const trustDebt = trustDebtData.summary.totalTrustDebt || 342;
const orthogonality = Math.round(trustDebtData.summary.orthogonality * 100) || 87;
const asymmetry = (trustDebtData.summary.asymmetryRatio || 2.3).toFixed(1);
const coldSpots = Math.round(trustDebtData.summary.coldSpotPercentage) || 14;

// Determine grade based on Trust Debt
function getGrade(debt) {
  if (debt < 100) return 'A+';
  if (debt < 200) return 'A';
  if (debt < 300) return 'B+';
  if (debt < 500) return 'B';
  if (debt < 800) return 'C';
  if (debt < 1200) return 'D';
  return 'F';
}

// Determine colors
function getDebtColor(debt) {
  if (debt < 200) return 'brightgreen';
  if (debt < 500) return 'green';
  if (debt < 800) return 'yellow';
  if (debt < 1200) return 'orange';
  return 'red';
}

function getOrthogonalityColor(orth) {
  if (orth > 95) return 'brightgreen';
  if (orth > 90) return 'green';
  if (orth > 80) return 'blue';
  if (orth > 70) return 'yellow';
  return 'red';
}

const grade = getGrade(trustDebt);
const debtColor = getDebtColor(trustDebt);
const orthColor = getOrthogonalityColor(orthogonality);

// Generate badge URLs
const badges = {
  trustDebt: `https://img.shields.io/badge/Trust%20Debt-${trustDebt}%20units-${debtColor}.svg`,
  grade: `https://img.shields.io/badge/Trust%20Grade-${grade}-${debtColor}.svg`,
  orthogonality: `https://img.shields.io/badge/Orthogonality-${orthogonality}%25-${orthColor}.svg`,
  asymmetry: `https://img.shields.io/badge/Asymmetry-${asymmetry}x-orange.svg`,
  coldSpots: `https://img.shields.io/badge/Cold%20Spots-${coldSpots}%25-lightblue.svg`
};

// Update README badges section
const readmePath = 'README.md';
let readme = fs.readFileSync(readmePath, 'utf8');

// Badge markdown
const badgeSection = `## 📊 Our Trust Debt Metrics (Self-Measured)

[![Trust Debt](${badges.trustDebt})](https://github.com/eliasmoosman/IntentGuard/blob/main/trust-debt-final.html)
[![Trust Grade](${badges.grade})](https://github.com/eliasmoosman/IntentGuard/blob/main/trust-debt-final.html)
[![Orthogonality](${badges.orthogonality})](https://github.com/eliasmoosman/IntentGuard/blob/main/trust-debt-final.html)
[![Asymmetry](${badges.asymmetry})](https://github.com/eliasmoosman/IntentGuard/blob/main/trust-debt-final.html)
[![Cold Spots](${badges.coldSpots})](https://github.com/eliasmoosman/IntentGuard/blob/main/trust-debt-final.html)

> **Last measured:** ${new Date().toISOString().split('T')[0]} | **Verdict:** ${
  trustDebt < 500 ? 'We practice what we preach' : 'We have work to do'
} | [Full Report →](trust-debt-final.html)`;

console.log('Badge URLs generated:');
console.log(badges);
console.log('\nAdd this section to your README after the existing badges.');
```

## Package.json Script Addition

```json
{
  "scripts": {
    "badges": "node generate-badges.js",
    "analyze:self": "npx intentguard analyze && npm run badges"
  }
}
```

## The Honest Alpha Approach

```markdown
## 📊 Our Trust Debt (Eating Our Own Dog Food)

[![Trust Debt](https://img.shields.io/badge/Trust%20Debt-342%20units-yellow.svg)](./trust-debt-final.html)
[![Grade](https://img.shields.io/badge/Grade-B%2B-green.svg)](./trust-debt-final.html)
[![Orthogonality](https://img.shields.io/badge/Orthogonality-87%25-blue.svg)](./trust-debt-final.html)

**The Honest Truth:**
- We're at 342 units (not great for a tool about reducing Trust Debt 😅)
- Our orthogonality is 87% (those categories still arguing with each other)
- We have 2.3x asymmetry (we build features before documenting them)

**Why We Show This:**
1. Transparency builds trust
2. Even we struggle with Trust Debt
3. It proves the tool works (even on itself)
4. Alpha means imperfect

*Updated weekly. Sometimes worse, sometimes better. Always honest.*
```

## GitHub Action for Auto-Update

`.github/workflows/trust-debt-badge.yml`:

```yaml
name: Update Trust Debt Badges

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0' # Weekly on Sunday
  workflow_dispatch:

jobs:
  update-badges:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - run: npm ci
      
      - name: Analyze Trust Debt
        run: npx intentguard analyze --output json
        
      - name: Generate Badges
        run: npm run badges
        
      - name: Commit Updates
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add README.md trust-debt-*.json trust-debt-*.html
          git diff --staged --quiet || git commit -m "chore: Update Trust Debt badges [skip ci]"
          git push
```

## For npm Display

The badges will automatically show on npm because they're in the README. The key is using shields.io URLs that render properly everywhere:

```markdown
<!-- These work on npm, GitHub, and everywhere -->
![Trust Debt](https://img.shields.io/badge/Trust%20Debt-342-yellow)
![Grade](https://img.shields.io/badge/Grade-B%2B-green)
![Orthogonality](https://img.shields.io/badge/Orthogonality-87%25-blue)
```

## The Meta Message

Adding these badges says:
1. "We use our own tool"
2. "We're transparent about our flaws"
3. "Trust Debt is measurable and real"
4. "Even we have Trust Debt (and that's okay)"

It's perfect for an alpha - honest, slightly broken, but proving the concept works.