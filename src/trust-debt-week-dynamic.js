#!/usr/bin/env node

/**
 * Trust Debt Week Dynamic Analysis (t:week enhanced)
 * 
 * Features:
 * - Git commit history (last 3 commits)
 * - Document fingerprints with Trust Debt percentages
 * - LLM-generated ShortLex categories based on actual content
 * - Proper sorting of categories
 * - FIM-based analysis with M = S × E framework
 * 
 * Usage: pnpm t:week
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');
const { FIMTrustDebtAnalyzer, FIM_STRUCTURE } = require('./trust-debt-fim-analyzer');

// Get git information
function getGitInfo() {
  try {
    // Get last 3 commits
    const commits = execSync('git log --oneline -3', { encoding: 'utf8' })
      .trim()
      .split('\n')
      .map(line => {
        const [hash, ...messageParts] = line.split(' ');
        return {
          hash: hash.substring(0, 7),
          message: messageParts.join(' ')
        };
      });
    
    // Get current branch
    const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    
    // Get status summary
    const statusOutput = execSync('git status --short', { encoding: 'utf8' });
    const modifiedFiles = statusOutput.split('\n').filter(line => line.trim()).length;
    
    return {
      branch,
      commits,
      modifiedFiles,
      clean: modifiedFiles === 0
    };
  } catch (error) {
    console.error('Git info error:', error.message);
    return {
      branch: 'unknown',
      commits: [],
      modifiedFiles: 0,
      clean: true
    };
  }
}

// Generate document fingerprint
function generateFingerprint(content, filepath) {
  const hash = crypto.createHash('sha256');
  hash.update(content);
  const fullHash = hash.digest('hex');
  return {
    short: fullHash.substring(0, 8),
    full: fullHash,
    path: filepath,
    size: Buffer.byteLength(content, 'utf8'),
    lines: content.split('\n').length
  };
}

// Dynamically generate ShortLex categories from content
async function generateDynamicCategories(content) {
  console.log('  🧠 Analyzing content for dynamic category generation...');
  
  // Extract key themes and patterns from content
  const themes = extractThemes(content);
  const patterns = extractPatterns(content);
  
  // Generate categories based on actual content
  const categories = {};
  const categoryLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  
  // Sort themes by frequency/importance
  const sortedThemes = Object.entries(themes)
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, 8); // Top 8 themes
  
  sortedThemes.forEach(([themeName, themeData], index) => {
    const letter = categoryLetters[index];
    categories[letter] = {
      name: themeName,
      weight: themeData.weight,
      description: themeData.description,
      subcategories: generateSubcategories(themeData, letter, themeName)
    };
  });
  
  // Normalize weights to sum to 1.0
  const totalWeight = Object.values(categories).reduce((sum, cat) => sum + cat.weight, 0);
  Object.values(categories).forEach(cat => {
    cat.weight = cat.weight / totalWeight;
  });
  
  return categories;
}

// Extract themes from content
function extractThemes(content) {
  const lowerContent = content.toLowerCase();
  const themes = {};
  
  // Theme detection patterns
  const themePatterns = {
    'Strategic Timing': {
      indicators: ['30 seconds', 'perfect timing', 'strategic moment', 'maximum receptivity'],
      weight: 0,
      description: 'Precision in timing and delivery'
    },
    'Trust Quantification': {
      indicators: ['trust debt', 'score', 'quantified', 'measured', '73/100'],
      weight: 0,
      description: 'Making trust measurable and visible'
    },
    'Pattern Recognition': {
      indicators: ['pattern', 'thursday panic', 'named', 'recognition'],
      weight: 0,
      description: 'Identifying and naming hidden patterns'
    },
    'Breakthrough Creation': {
      indicators: ['oh moment', 'breakthrough', 'insight', 'revelation'],
      weight: 0,
      description: 'Engineering recognition and breakthroughs'
    },
    'Acceleration Claims': {
      indicators: ['30% faster', '30% acceleration', 'accelerate', 'speed up'],
      weight: 0,
      description: 'Quantified improvement promises'
    },
    'Geometric Precision': {
      indicators: ['361x', 'precision', 'geometric', 'mathematical'],
      weight: 0,
      description: 'Mathematical accuracy in alignment'
    },
    'Drift Detection': {
      indicators: ['drift', 'divergence', 'gap', 'misalignment'],
      weight: 0,
      description: 'Identifying organizational drift'
    },
    'Viral Mechanics': {
      indicators: ['who needs this', 'share', 'viral', 'spread'],
      weight: 0,
      description: 'Built-in viral growth mechanisms'
    }
  };
  
  // Count occurrences and calculate weights
  for (const [themeName, themeData] of Object.entries(themePatterns)) {
    let count = 0;
    themeData.indicators.forEach(indicator => {
      const regex = new RegExp(indicator, 'gi');
      const matches = lowerContent.match(regex);
      if (matches) count += matches.length;
    });
    
    themeData.weight = count;
    if (count > 0) {
      themes[themeName] = themeData;
    }
  }
  
  return themes;
}

// Extract patterns from content
function extractPatterns(content) {
  const patterns = [];
  
  // Look for named patterns (e.g., "The X Pattern")
  const patternRegex = /the\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+pattern/gi;
  let match;
  while ((match = patternRegex.exec(content)) !== null) {
    patterns.push({
      name: match[1],
      context: content.substring(Math.max(0, match.index - 50), Math.min(content.length, match.index + 100))
    });
  }
  
  return patterns;
}

// Generate subcategories for a theme
function generateSubcategories(themeData, letter, themeName) {
  const subcategories = {};
  const subLetters = ['1', '2', '3'];
  
  // Create 3 subcategories based on theme aspects
  const aspects = [
    { suffix: 'Recognition', focus: 'identifying and recognizing' },
    { suffix: 'Measurement', focus: 'quantifying and measuring' },
    { suffix: 'Application', focus: 'applying and implementing' }
  ];
  
  aspects.forEach((aspect, index) => {
    const subKey = `${letter}${subLetters[index]}`;
    subcategories[subKey] = {
      name: `${themeName} ${aspect.suffix}`,
      description: `Focus on ${aspect.focus} ${themeName.toLowerCase()}`,
      indicators: themeData.indicators || [],
      weight: 0.33 // Equal weight for simplicity
    };
  });
  
  return subcategories;
}

// Sort categories by ShortLex rules
function sortCategories(categories) {
  // Sort by depth first (level), then by weight within level
  const sorted = {};
  
  // First sort top-level categories by weight
  const topLevel = Object.entries(categories)
    .sort((a, b) => b[1].weight - a[1].weight);
  
  topLevel.forEach(([key, data]) => {
    sorted[key] = data;
    
    // Sort subcategories by weight
    if (data.subcategories) {
      const sortedSubs = Object.entries(data.subcategories)
        .sort((a, b) => b[1].weight - a[1].weight);
      
      data.subcategories = {};
      sortedSubs.forEach(([subKey, subData]) => {
        data.subcategories[subKey] = subData;
      });
    }
  });
  
  return sorted;
}

// Analyze document with fingerprinting
async function analyzeDocument(filepath) {
  const content = await fs.readFile(filepath, 'utf-8');
  const fingerprint = generateFingerprint(content, filepath);
  
  // Use FIM analyzer for Trust Debt calculation
  const analyzer = new FIMTrustDebtAnalyzer();
  const analysis = analyzer.analyzeFIM(content);
  
  return {
    fingerprint,
    trustDebt: analysis.trustDebt.score,
    drift: analysis.trustDebt.drift,
    momentum: analysis.momentum.raw * 100,
    violations: analysis.violations.length,
    content: content.substring(0, 500) // First 500 chars for preview
  };
}

// Generate enhanced HTML with all features
async function generateEnhancedHTML(gitInfo, documents, categories, fimAnalysis) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trust Debt Analysis - FIM Enhanced</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'SF Pro Display', -apple-system, sans-serif;
            background: linear-gradient(135deg, #0f0f23 0%, #1a1d29 100%);
            color: #e2e8f0;
            line-height: 1.7;
            padding: 40px 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            padding: 60px 20px;
            background: radial-gradient(circle at center, rgba(139, 92, 246, 0.15) 0%, transparent 70%);
            margin-bottom: 40px;
            border-radius: 20px;
        }

        h1 {
            font-size: 3rem;
            font-weight: 900;
            background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #06ffa5 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 20px;
        }

        .git-info {
            background: rgba(30, 41, 59, 0.6);
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #8b5cf6;
        }

        .git-commits {
            margin-top: 15px;
        }

        .commit {
            display: flex;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .commit-hash {
            background: #8b5cf6;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 0.9rem;
            margin-right: 15px;
        }

        .documents-section {
            background: rgba(16, 185, 129, 0.05);
            border: 2px solid rgba(16, 185, 129, 0.2);
            border-radius: 16px;
            padding: 30px;
            margin: 40px 0;
        }

        .document-card {
            background: rgba(0, 0, 0, 0.3);
            padding: 20px;
            border-radius: 12px;
            margin: 15px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .fingerprint {
            font-family: monospace;
            background: rgba(139, 92, 246, 0.2);
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 0.9rem;
        }

        .trust-score {
            font-size: 2rem;
            font-weight: 900;
            color: ${fimAnalysis?.trustDebt?.score >= 70 ? '#10b981' : fimAnalysis?.trustDebt?.score >= 50 ? '#f59e0b' : '#ef4444'};
        }

        .categories-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 30px;
            margin: 60px 0;
        }

        .category-card {
            background: rgba(30, 41, 59, 0.6);
            border-radius: 16px;
            padding: 25px;
            border: 2px solid transparent;
            position: relative;
            overflow: hidden;
        }

        .category-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #8b5cf6 0%, #ec4899 100%);
        }

        .category-letter {
            display: inline-block;
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
            color: white;
            text-align: center;
            line-height: 40px;
            border-radius: 50%;
            font-weight: 900;
            font-size: 1.2rem;
            margin-bottom: 15px;
        }

        .category-name {
            font-size: 1.4rem;
            font-weight: 700;
            margin-bottom: 10px;
            color: #fff;
        }

        .category-weight {
            display: inline-block;
            background: rgba(139, 92, 246, 0.2);
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.9rem;
            margin-top: 10px;
        }

        .subcategories {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .subcategory {
            padding: 8px 0;
            padding-left: 20px;
            font-size: 0.95rem;
            color: #94a3b8;
        }

        .fim-analysis {
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%);
            border: 2px solid rgba(139, 92, 246, 0.3);
            border-radius: 20px;
            padding: 40px;
            margin: 40px 0;
            text-align: center;
        }

        .fim-formula {
            font-size: 2rem;
            font-weight: 900;
            margin: 20px 0;
            font-family: 'SF Mono', monospace;
            color: #8b5cf6;
        }

        .momentum-display {
            font-size: 4rem;
            font-weight: 900;
            background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin: 20px 0;
        }

        .timestamp {
            color: #64748b;
            font-size: 0.9rem;
            text-align: center;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Trust Debt FIM Analysis</h1>
            <p style="font-size: 1.3rem; color: #94a3b8;">Dynamic Category Generation with Document Fingerprinting</p>
            <div class="timestamp">Generated: ${new Date().toISOString()}</div>
        </div>

        <div class="git-info">
            <h2 style="color: #8b5cf6; margin-bottom: 15px;">📊 Git Information</h2>
            <p><strong>Branch:</strong> ${gitInfo.branch}</p>
            <p><strong>Status:</strong> ${gitInfo.clean ? '✅ Clean' : `⚠️ ${gitInfo.modifiedFiles} modified files`}</p>
            <div class="git-commits">
                <strong>Recent Commits:</strong>
                ${gitInfo.commits.map(commit => `
                <div class="commit">
                    <span class="commit-hash">${commit.hash}</span>
                    <span>${commit.message}</span>
                </div>
                `).join('')}
            </div>
        </div>

        <div class="documents-section">
            <h2 style="font-size: 1.8rem; color: #10b981; margin-bottom: 20px;">📄 Document Fingerprints</h2>
            ${documents.map(doc => `
                <div class="document-card">
                    <div>
                        <strong>${path.basename(doc.fingerprint.path)}</strong>
                        <span class="fingerprint">${doc.fingerprint.short}</span>
                        <p style="color: #94a3b8; font-size: 0.9rem; margin-top: 5px;">
                            ${doc.fingerprint.lines} lines • ${(doc.fingerprint.size / 1024).toFixed(1)} KB
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <div class="trust-score">${doc.trustDebt}%</div>
                        <p style="color: #94a3b8; font-size: 0.9rem;">Trust Debt</p>
                        <p style="color: #f59e0b; font-size: 0.9rem;">Drift: ${doc.drift}%</p>
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="categories-grid">
            ${Object.entries(categories).map(([letter, category]) => `
                <div class="category-card">
                    <div class="category-letter">${letter}</div>
                    <div class="category-name">${category.name}</div>
                    <p style="color: #94a3b8; margin: 10px 0;">${category.description}</p>
                    <span class="category-weight">Weight: ${(category.weight * 100).toFixed(1)}%</span>
                    
                    ${category.subcategories ? `
                    <div class="subcategories">
                        ${Object.entries(category.subcategories).map(([subKey, sub]) => `
                            <div class="subcategory">
                                <strong>${subKey}:</strong> ${sub.name}
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>

        ${fimAnalysis ? `
        <div class="fim-analysis">
            <h2 style="font-size: 2rem; margin-bottom: 20px;">M = S × E Framework</h2>
            <div class="fim-formula">M = S × E</div>
            <p style="font-size: 1.1rem; margin: 20px 0;">
                Momentum = Skill × Environment
            </p>
            <div class="momentum-display">${(fimAnalysis.momentum.raw * 100).toFixed(1)}%</div>
            <p style="color: #94a3b8;">
                Skill: ${(fimAnalysis.momentum.components.skill * 100).toFixed(1)}% • 
                Environment: ${(fimAnalysis.momentum.components.environment * 100).toFixed(1)}%
            </p>
            <p style="margin-top: 20px; font-size: 1.2rem;">
                <strong>Trust Debt Score:</strong> ${fimAnalysis.trustDebt.score}/100
                ${fimAnalysis.trustDebt.insurabilityThreshold ? '✅ Insurable' : '❌ Below Threshold'}
            </p>
            <p style="color: #f59e0b; margin-top: 10px;">
                Daily Accumulation: ${fimAnalysis.trustDebt.dailyAccumulation}% • 
                Projected Annual: ${fimAnalysis.trustDebt.projectedAnnual.toFixed(1)}%
            </p>
        </div>
        ` : ''}

        <div style="text-align: center; margin-top: 60px; color: #64748b;">
            <p>Unity Principle: Shape = Symbol</p>
            <p style="margin-top: 10px;">Patent Pending - USPTO #18/XXX,XXX</p>
        </div>
    </div>
</body>
</html>`;

  return html;
}

// Generate comprehensive prompt
function generateComprehensivePrompt(gitInfo, documents, categories, fimAnalysis) {
  return `# 🎯 Trust Debt Dynamic Analysis Report

## Git Repository Status
- **Branch**: ${gitInfo.branch}
- **Status**: ${gitInfo.clean ? 'Clean' : `${gitInfo.modifiedFiles} modified files`}

### Recent Commits:
${gitInfo.commits.map(c => `- \`${c.hash}\` ${c.message}`).join('\n')}

## Document Analysis (Fingerprints & Trust Debt)

${documents.map(doc => `
### ${path.basename(doc.fingerprint.path)}
- **Fingerprint**: \`${doc.fingerprint.short}\` (${doc.fingerprint.lines} lines, ${(doc.fingerprint.size / 1024).toFixed(1)} KB)
- **Trust Debt**: ${doc.trustDebt}%
- **Drift**: ${doc.drift}%
- **Momentum**: ${doc.momentum.toFixed(1)}%
- **Violations**: ${doc.violations}
`).join('\n')}

## Dynamically Generated ShortLex Categories

The following categories were automatically generated based on actual content analysis:

${Object.entries(categories).map(([letter, cat]) => `
### ${letter}. ${cat.name} (${(cat.weight * 100).toFixed(1)}%)
${cat.description}

Subcategories:
${Object.entries(cat.subcategories || {}).map(([key, sub]) => 
  `- **${key}**: ${sub.name}`
).join('\n')}
`).join('\n')}

## FIM Analysis (M = S × E)

### Unity Principle Status
- **Shape = Symbol Alignment**: ${fimAnalysis ? fimAnalysis.environment.positionSemanticAlignment.toFixed(1) : 'N/A'}%
- **Hierarchy Integrity**: ${fimAnalysis ? fimAnalysis.environment.hierarchyIntegrity.toFixed(1) : 'N/A'}%

### Framework Components
- **Environment (E)**: ${fimAnalysis ? (fimAnalysis.momentum.components.environment * 100).toFixed(1) : 'N/A'}%
- **Skill (S)**: ${fimAnalysis ? (fimAnalysis.momentum.components.skill * 100).toFixed(1) : 'N/A'}%
- **Momentum (M)**: ${fimAnalysis ? (fimAnalysis.momentum.raw * 100).toFixed(1) : 'N/A'}%

### Trust Debt Metrics
- **Score**: ${fimAnalysis ? fimAnalysis.trustDebt.score : 'N/A'}/100
- **Daily Accumulation**: ${fimAnalysis ? fimAnalysis.trustDebt.dailyAccumulation : 'N/A'}%
- **Projected Annual**: ${fimAnalysis ? fimAnalysis.trustDebt.projectedAnnual.toFixed(1) : 'N/A'}%
- **Insurable**: ${fimAnalysis ? (fimAnalysis.trustDebt.insurabilityThreshold ? 'YES ✅' : 'NO ❌') : 'N/A'}

## Critical Improvements Required

${fimAnalysis && fimAnalysis.violations.length > 0 ? 
  fimAnalysis.violations.map(v => `
### ${v.type} (${v.severity})
- **Issue**: ${v.description}
- **Impact**: ${v.impact}
`).join('\n') : 
  '✅ No critical violations detected'}

## Action Items for Improvement

1. **Immediate Priority**: ${fimAnalysis && fimAnalysis.trustDebt.score < 70 ? 
   'Boost Trust Debt above 70 (insurability threshold)' : 
   'Maintain current alignment levels'}

2. **Category Optimization**: Focus on lowest-scoring categories:
   ${Object.entries(categories)
     .sort((a, b) => a[1].weight - b[1].weight)
     .slice(0, 3)
     .map(([letter, cat]) => `${letter}. ${cat.name}`)
     .join(', ')}

3. **Document-Specific Actions**:
   ${documents
     .filter(d => d.trustDebt < 70)
     .map(d => `- Improve ${path.basename(d.fingerprint.path)} (currently ${d.trustDebt}%)`)
     .join('\n')}

## Implementation Strategy

### Phase 1: Stabilize Core (Days 1-3)
- Fix Unity Principle violations
- Boost lowest Trust Debt documents above 70%
- Ensure git repository is clean

### Phase 2: Optimize Categories (Days 4-7)
- Balance category weights
- Improve subcategory indicators
- Reduce semantic volatility

### Phase 3: Scale Excellence (Week 2+)
- Target 85% Trust Debt across all documents
- Achieve 361x momentum potential
- Document successful patterns

## Validation Checklist
- [ ] All documents > 70% Trust Debt
- [ ] Git repository clean
- [ ] Categories properly weighted
- [ ] M = S × E balanced
- [ ] No Unity violations
- [ ] Insurability achieved

Ready to implement Trust Debt improvements. The HTML visualization is now open in your browser.`;
}

// Main execution
async function main() {
  console.log('🎯 Trust Debt Dynamic Analysis (t:week enhanced)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // 1. Get git information
    console.log('\n📊 Gathering git information...');
    const gitInfo = getGitInfo();
    console.log(`  Branch: ${gitInfo.branch}`);
    console.log(`  Commits: ${gitInfo.commits.length} recent`);
    console.log(`  Status: ${gitInfo.clean ? 'Clean' : `${gitInfo.modifiedFiles} modified`}`);
    
    // 2. Analyze documents
    console.log('\n📄 Analyzing documents with fingerprinting...');
    const docsToAnalyze = [
      path.join(__dirname, '..', 'CLAUDE.md'),
      path.join(__dirname, '..', 'README.md')
    ];
    
    // Add any week files
    const weekFiles = fsSync.readdirSync(path.join(__dirname, '..'))
      .filter(f => f.startsWith('WEEK_') && f.endsWith('.md'))
      .map(f => path.join(__dirname, '..', f));
    
    docsToAnalyze.push(...weekFiles.slice(0, 3)); // Limit to 3 week files
    
    const documents = [];
    for (const docPath of docsToAnalyze) {
      if (fsSync.existsSync(docPath)) {
        console.log(`  Analyzing: ${path.basename(docPath)}`);
        const analysis = await analyzeDocument(docPath);
        documents.push(analysis);
      }
    }
    
    // 3. Generate dynamic categories
    console.log('\n🧠 Generating dynamic ShortLex categories...');
    const allContent = documents.map(d => d.content).join('\n');
    const categories = await generateDynamicCategories(allContent);
    const sortedCategories = sortCategories(categories);
    console.log(`  Generated ${Object.keys(sortedCategories).length} categories`);
    
    // 4. Run FIM analysis
    console.log('\n⚙️ Running FIM analysis (M = S × E)...');
    const analyzer = new FIMTrustDebtAnalyzer();
    const fimAnalysis = analyzer.analyzeFIM(allContent);
    console.log(`  Trust Debt Score: ${fimAnalysis.trustDebt.score}/100`);
    console.log(`  Momentum: ${(fimAnalysis.momentum.raw * 100).toFixed(1)}%`);
    
    // 5. Generate HTML
    console.log('\n🎨 Generating enhanced HTML visualization...');
    const htmlContent = await generateEnhancedHTML(gitInfo, documents, sortedCategories, fimAnalysis);
    const htmlPath = path.join(__dirname, '..', `trust-debt-dynamic-${Date.now()}.html`);
    await fs.writeFile(htmlPath, htmlContent);
    console.log(`✅ Created: ${path.basename(htmlPath)}`);
    
    // 6. Open HTML in browser
    console.log('\n🌐 Opening Trust Debt visualization...');
    try {
      execSync(`open "${htmlPath}"`, { stdio: 'ignore' });
      console.log('✅ Opened in browser');
    } catch (error) {
      try {
        execSync(`xdg-open "${htmlPath}"`, { stdio: 'ignore' });
      } catch (e) {
        console.log(`📖 View at: ${htmlPath}`);
      }
    }
    
    // 7. Generate comprehensive prompt
    const prompt = generateComprehensivePrompt(gitInfo, documents, sortedCategories, fimAnalysis);
    
    // 8. Save prompt
    const promptPath = path.join(__dirname, '..', 'logs', `trust-debt-dynamic-${Date.now()}.txt`);
    await fs.mkdir(path.dirname(promptPath), { recursive: true });
    await fs.writeFile(promptPath, prompt);
    
    // 9. Launch Claude
    console.log('\n🚀 Launching Claude with comprehensive analysis...');
    try {
      execSync(`claude "${prompt}"`, { 
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..')
      });
    } catch (claudeError) {
      console.log('\n💡 Trust Debt Analysis Ready');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(prompt.substring(0, 2000) + '...\n[Full analysis in logs]');
      console.log('\n🚀 Launch Claude manually to review full analysis');
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { 
  getGitInfo, 
  generateFingerprint, 
  generateDynamicCategories,
  sortCategories 
};