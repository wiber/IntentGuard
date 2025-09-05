#!/usr/bin/env node

/**
 * Trust Debt Week Coherence™ (t:week)
 * 
 * Analyzes Trust Debt alignment for the week's content,
 * generates drift visualization HTML,
 * launches Claude with improvement prompts
 * 
 * Usage: pnpm t:week
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { TrustDebtAnalyzer, CORE_PRINCIPLES } = require('./trust-debt-analyzer');

// Import week themes from original c:week
const { getCurrentWeek, WEEK_THEMES } = require('./linkedin-week-coherence');

// Generate Trust Debt HTML visualization
const generateTrustDebtHTML = async (analysis, weekData) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trust Debt Analysis - Week ${weekData.weekNumber}</title>
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
            max-width: 1200px;
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

        .score-display {
            font-size: 5rem;
            font-weight: 900;
            margin: 30px 0;
            color: ${analysis.trustDebtScore >= 70 ? '#10b981' : analysis.trustDebtScore >= 50 ? '#f59e0b' : '#ef4444'};
        }

        .status-badge {
            display: inline-block;
            padding: 10px 30px;
            background: ${analysis.trustDebtScore >= 70 ? 'rgba(16, 185, 129, 0.2)' : analysis.trustDebtScore >= 50 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'};
            border: 2px solid ${analysis.trustDebtScore >= 70 ? '#10b981' : analysis.trustDebtScore >= 50 ? '#f59e0b' : '#ef4444'};
            border-radius: 50px;
            font-weight: 700;
            font-size: 1.2rem;
            margin-top: 20px;
        }

        .principles-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            margin: 60px 0;
        }

        .principle-card {
            background: rgba(30, 41, 59, 0.6);
            border-radius: 16px;
            padding: 30px;
            border: 2px solid transparent;
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
        }

        .principle-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, var(--accent) 0%, transparent 100%);
        }

        .principle-card.high { --accent: #10b981; border-color: rgba(16, 185, 129, 0.3); }
        .principle-card.moderate { --accent: #f59e0b; border-color: rgba(245, 158, 11, 0.3); }
        .principle-card.drift { --accent: #ef4444; border-color: rgba(239, 68, 68, 0.3); }

        .principle-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .principle-name {
            font-size: 1.3rem;
            font-weight: 700;
            margin-bottom: 10px;
            color: #fff;
        }

        .principle-score {
            font-size: 2.5rem;
            font-weight: 900;
            margin: 15px 0;
        }

        .alignment-label {
            font-size: 0.9rem;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .drift-section {
            background: rgba(239, 68, 68, 0.05);
            border: 2px solid rgba(239, 68, 68, 0.2);
            border-radius: 16px;
            padding: 30px;
            margin: 40px 0;
        }

        .drift-title {
            font-size: 1.8rem;
            color: #ef4444;
            margin-bottom: 20px;
        }

        .drift-area {
            background: rgba(0, 0, 0, 0.3);
            padding: 15px;
            border-radius: 8px;
            margin: 10px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .gap-indicator {
            background: #ef4444;
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: 700;
        }

        .pattern-section {
            background: rgba(139, 92, 246, 0.05);
            border: 2px solid rgba(139, 92, 246, 0.2);
            border-radius: 16px;
            padding: 30px;
            margin: 40px 0;
        }

        .pattern-card {
            background: rgba(0, 0, 0, 0.3);
            padding: 20px;
            border-radius: 12px;
            margin: 15px 0;
            border-left: 4px solid #8b5cf6;
        }

        .pattern-name {
            font-size: 1.4rem;
            color: #8b5cf6;
            font-weight: 700;
            margin-bottom: 10px;
        }

        .pattern-cost {
            color: #ef4444;
            font-weight: 700;
            margin-top: 10px;
        }

        .recommendation-box {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
            border: 2px solid rgba(16, 185, 129, 0.3);
            border-radius: 16px;
            padding: 30px;
            margin: 40px 0;
            text-align: center;
        }

        .recommendation-title {
            font-size: 1.5rem;
            color: #10b981;
            margin-bottom: 15px;
        }

        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
            color: white;
            padding: 18px 40px;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 700;
            font-size: 1.1rem;
            margin: 20px 10px;
            transition: all 0.3s ease;
        }

        .cta-button:hover {
            transform: translateY(-3px);
            box-shadow: 0 20px 40px rgba(139, 92, 246, 0.3);
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
            <h1>Trust Debt Analysis</h1>
            <p style="font-size: 1.3rem; color: #94a3b8;">Week ${weekData.weekNumber}: ${weekData.theme.name}</p>
            <div class="score-display">${analysis.trustDebtScore}/100</div>
            <div class="status-badge">${analysis.summary.status}</div>
            <div class="timestamp">Generated: ${new Date().toISOString()}</div>
        </div>

        <div class="principles-grid">
            ${Object.entries(analysis.principles || {}).map(([key, data]) => {
                const alignmentClass = data.score >= 80 ? 'high' : data.score >= 60 ? 'moderate' : 'drift';
                const scoreColor = data.score >= 80 ? '#10b981' : data.score >= 60 ? '#f59e0b' : '#ef4444';
                return `
                <div class="principle-card ${alignmentClass}">
                    <div class="principle-name">${data.name}</div>
                    <div class="principle-score" style="color: ${scoreColor}">${data.score}%</div>
                    <div class="alignment-label">${data.alignment}</div>
                </div>
                `;
            }).join('')}
        </div>

        ${analysis.drift && analysis.drift.areas && analysis.drift.areas.length > 0 ? `
        <div class="drift-section">
            <h2 class="drift-title">⚠️ Drift Areas Detected</h2>
            ${analysis.drift.areas.map(area => `
                <div class="drift-area">
                    <span>${area.principle}</span>
                    <span class="gap-indicator">Gap: ${area.gap}%</span>
                </div>
            `).join('')}
            <p style="margin-top: 20px; color: #f59e0b;">${analysis.drift.recommendation}</p>
        </div>
        ` : ''}

        ${analysis.patterns && analysis.patterns.length > 0 ? `
        <div class="pattern-section">
            <h2 style="font-size: 1.8rem; color: #8b5cf6; margin-bottom: 20px;">🔍 Detected Patterns</h2>
            ${analysis.patterns.map(pattern => `
                <div class="pattern-card">
                    <div class="pattern-name">${pattern.name}</div>
                    <p>${pattern.description}</p>
                    <div class="pattern-cost">Cost: ${pattern.cost}</div>
                </div>
            `).join('')}
        </div>
        ` : ''}

        <div class="recommendation-box">
            <h2 class="recommendation-title">📊 Recommendation</h2>
            <p style="font-size: 1.2rem; line-height: 1.8;">
                ${analysis.summary.recommendation}
            </p>
            <a href="#" class="cta-button">Improve Alignment</a>
        </div>

        <div style="text-align: center; margin-top: 60px; color: #64748b;">
            <p>Trust Debt = Drift × (Intent - Reality)</p>
            <p style="margin-top: 10px;">Powered by FIM Technology</p>
        </div>
    </div>
</body>
</html>`;

  return html;
};

// Generate improvement prompt for Claude
const generateImprovementPrompt = (analysis, weekData) => {
  return `# 🎯 Trust Debt Alignment Analysis - Week ${weekData.weekNumber}

## Current Status
- **Trust Debt Score**: ${analysis.trustDebtScore}/100 (${analysis.summary.status})
- **Week Theme**: ${weekData.theme.name}
- **Goal**: ${weekData.theme.goal}

## Principle Alignment Scores

${Object.entries(analysis.principles || {}).map(([key, data]) => 
  `- **${data.name}**: ${data.score}% (${data.alignment})`
).join('\n')}

## Detected Drift Areas

${analysis.drift && analysis.drift.areas ? 
  analysis.drift.areas.map(area => 
    `- ${area.principle}: ${area.gap}% gap from ideal`
  ).join('\n') : 
  'No significant drift detected'}

## Patterns Found

${analysis.patterns && analysis.patterns.length > 0 ?
  analysis.patterns.map(pattern => 
    `### ${pattern.name}
- Description: ${pattern.description}
- Cost: ${pattern.cost}`
  ).join('\n\n') :
  'No anti-patterns detected'}

## Improvement Actions

Based on the Trust Debt analysis, here are specific improvements needed:

${analysis.trustDebtScore < 70 ? `
### High Priority (Score < 70)
1. **Realign with Strategic Nudges**: Ensure all content emphasizes "30 seconds, 30% acceleration"
2. **Fix Pattern Naming**: Use memorable names like "Thursday Panic" not generic descriptions
3. **Emphasize Recognition over Teaching**: Stop explaining, start triggering "oh moments"
` : analysis.trustDebtScore < 85 ? `
### Medium Priority (Score 70-85)
1. **Strengthen FIM Claims**: Clarify that 361x is about precision, not speed
2. **Increase Oh Moment Density**: Every piece should create recognition
3. **Quantify Trust Debt**: Show measurable drift in all examples
` : `
### Maintenance (Score 85+)
1. **Maintain Consistency**: Keep using established patterns
2. **Document Successes**: Capture what's working
3. **Evolve Carefully**: Test changes before full deployment
`}

## Specific Content Improvements

For this week's "${weekData.theme.name}" theme:

1. **Landing Words**: Ensure they create pause and recognition
2. **Scale Questions**: Always use 0-9 (never 0-10) format
3. **Pattern Names**: Make them memorable and specific
4. **URLs**: Include full IntentGuard.biz links

## Next Steps

1. Review the Trust Debt HTML visualization (now open)
2. Apply the improvements above to high-DIS posts
3. Re-run analysis after changes to verify improvement

Ready to improve Trust Debt alignment. What would you like to focus on first?`;
};

// Main execution
const main = async () => {
  console.log('🎯 Trust Debt Week Coherence™ (t:week)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // 1. Get current week data
    const weekNumber = getCurrentWeek();
    const weekData = {
      weekNumber,
      theme: WEEK_THEMES[weekNumber]
    };
    
    console.log(`\n📅 Week ${weekNumber}: ${weekData.theme.name}`);
    
    // 2. Analyze Trust Debt for current content
    console.log('\n🔍 Analyzing Trust Debt alignment...');
    const analyzer = new TrustDebtAnalyzer();
    
    // Analyze week content file if it exists
    let analysis;
    const weekFile = path.join(__dirname, '..', `WEEK_${weekNumber}_RECOGNITION_DISRUPTION.md`);
    
    if (fsSync.existsSync(weekFile)) {
      console.log('  Analyzing week content file...');
      const content = await fs.readFile(weekFile, 'utf-8');
      analysis = await analyzer.analyzeContent(content, 'week-content');
      
      // Add file-specific analysis
      const fileAnalysis = await analyzer.analyzeFile(weekFile);
      analysis = {
        ...fileAnalysis,
        summary: analyzer.generateSummary(fileAnalysis.overallScore, [fileAnalysis])
      };
    } else {
      console.log('  Analyzing repository alignment...');
      const repoAnalysis = await analyzer.analyzeRepository('.');
      analysis = {
        ...repoAnalysis.files[0], // Use first file as base
        trustDebtScore: repoAnalysis.trustDebtScore,
        summary: repoAnalysis.summary
      };
    }
    
    console.log(`\n✅ Trust Debt Score: ${analysis.trustDebtScore || analysis.overallScore}/100`);
    console.log(`   Status: ${analysis.summary?.status || 'Unknown'}`);
    
    // 3. Generate Trust Debt HTML
    console.log('\n🎨 Generating Trust Debt visualization...');
    const htmlContent = await generateTrustDebtHTML(analysis, weekData);
    const htmlPath = path.join(__dirname, '..', `trust-debt-week-${weekNumber}.html`);
    await fs.writeFile(htmlPath, htmlContent);
    console.log(`✅ Created: ${path.basename(htmlPath)}`);
    
    // 4. Open HTML in browser (ALWAYS)
    console.log('\n🌐 Opening Trust Debt visualization...');
    try {
      execSync(`open "${htmlPath}"`, { stdio: 'ignore' });
      console.log('✅ Opened Trust Debt analysis in browser');
    } catch (error) {
      // Fallback for non-Mac
      try {
        execSync(`xdg-open "${htmlPath}"`, { stdio: 'ignore' });
      } catch (e) {
        console.log(`📖 View at: ${htmlPath}`);
      }
    }
    
    // 5. Generate improvement prompt
    const improvementPrompt = generateImprovementPrompt(analysis, weekData);
    
    // 6. Save prompt to file
    const promptPath = path.join(__dirname, '..', 'logs', `trust-debt-prompt-${Date.now()}.txt`);
    await fs.mkdir(path.dirname(promptPath), { recursive: true });
    await fs.writeFile(promptPath, improvementPrompt);
    
    // 7. Launch Claude with context
    console.log('\n🚀 Launching Claude with Trust Debt analysis...');
    try {
      execSync(`/bin/zsh -c 'cat "${promptPath}" | claude'`, { 
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..')
      });
    } catch (claudeError) {
      console.log('\n💡 Trust Debt Analysis (Manual Mode)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(improvementPrompt);
      console.log('\n🚀 Copy the analysis above and launch Claude manually');
    }
    
    // Clean up temp file
    try { 
      await fs.unlink(promptPath); 
    } catch (e) {
      // Ignore cleanup errors
    }
    
  } catch (error) {
    console.error('❌ Trust Debt analysis failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = { generateTrustDebtHTML, generateImprovementPrompt };