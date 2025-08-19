#!/usr/bin/env node

/**
 * Enhanced Trust Debt Week Coherence™ (t:week)
 * 
 * Uses FIM-based Trust Debt analysis with M = S × E framework
 * Generates HTML with per-prompt estimates
 * Always opens HTML after generation
 * 
 * Usage: pnpm t:week
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { FIMTrustDebtAnalyzer, FIM_STRUCTURE, SEMANTIC_INDICATORS } = require('./trust-debt-fim-analyzer');
const { getCurrentWeek, WEEK_THEMES } = require('./linkedin-week-coherence');

/**
 * Generate enhanced HTML with FIM visualization and per-prompt estimates
 */
const generateEnhancedTrustDebtHTML = async (analysis, weekData) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trust Debt FIM Analysis - Week ${weekData.weekNumber} | M = S × E</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'SF Pro Display', -apple-system, sans-serif;
            background: #000;
            color: #e2e8f0;
            line-height: 1.7;
            overflow-x: hidden;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 40px 20px;
        }

        .header {
            text-align: center;
            padding: 80px 20px;
            background: radial-gradient(circle at center, rgba(139, 92, 246, 0.2) 0%, transparent 70%);
            margin-bottom: 60px;
            border-radius: 20px;
            position: relative;
            overflow: hidden;
        }

        .header::before {
            content: 'M = S × E';
            position: absolute;
            top: 20px;
            right: 20px;
            font-size: 2rem;
            font-weight: 900;
            color: rgba(139, 92, 246, 0.3);
            font-family: 'Courier New', monospace;
        }

        h1 {
            font-size: 4rem;
            font-weight: 900;
            background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #06ffa5 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 20px;
            animation: gradient 3s ease infinite;
        }

        @keyframes gradient {
            0%, 100% { filter: hue-rotate(0deg); }
            50% { filter: hue-rotate(30deg); }
        }

        .unity-principle {
            font-size: 1.5rem;
            color: #06ffa5;
            margin: 20px 0;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
        }

        .score-display {
            font-size: 6rem;
            font-weight: 900;
            margin: 40px 0;
            background: ${analysis.trustDebt?.score >= 70 ? 'linear-gradient(135deg, #10b981 0%, #06ffa5 100%)' : analysis.trustDebt?.score >= 50 ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' : 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)'};
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .insurability-badge {
            display: inline-block;
            padding: 12px 40px;
            background: ${analysis.trustDebt?.insurabilityThreshold ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'};
            border: 3px solid ${analysis.trustDebt?.insurabilityThreshold ? '#10b981' : '#ef4444'};
            border-radius: 50px;
            font-weight: 900;
            font-size: 1.3rem;
            margin-top: 20px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .framework-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 30px;
            margin: 60px 0;
        }

        .framework-card {
            background: rgba(30, 41, 59, 0.8);
            border-radius: 20px;
            padding: 30px;
            border: 2px solid rgba(139, 92, 246, 0.3);
            position: relative;
            overflow: hidden;
        }

        .framework-card::before {
            content: attr(data-label);
            position: absolute;
            top: 10px;
            left: 20px;
            font-size: 3rem;
            font-weight: 900;
            color: rgba(139, 92, 246, 0.2);
        }

        .framework-title {
            font-size: 1.5rem;
            color: #8b5cf6;
            margin-bottom: 15px;
            margin-top: 30px;
        }

        .framework-score {
            font-size: 3rem;
            font-weight: 900;
            background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .framework-details {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid rgba(139, 92, 246, 0.2);
        }

        .fim-structure {
            background: rgba(15, 23, 42, 0.9);
            border: 2px solid rgba(139, 92, 246, 0.3);
            border-radius: 20px;
            padding: 40px;
            margin: 60px 0;
        }

        .fim-title {
            font-size: 2rem;
            color: #8b5cf6;
            margin-bottom: 30px;
            text-align: center;
        }

        .dimension-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }

        .dimension-card {
            background: rgba(0, 0, 0, 0.5);
            border-radius: 12px;
            padding: 20px;
            border-left: 4px solid;
            position: relative;
        }

        .dimension-card.high { border-color: #10b981; }
        .dimension-card.medium { border-color: #f59e0b; }
        .dimension-card.low { border-color: #ef4444; }

        .dimension-key {
            font-size: 2rem;
            font-weight: 900;
            color: #8b5cf6;
            position: absolute;
            top: 15px;
            right: 20px;
        }

        .dimension-name {
            font-size: 1.2rem;
            font-weight: 700;
            margin-bottom: 10px;
        }

        .dimension-score {
            font-size: 1.8rem;
            font-weight: 900;
            margin: 10px 0;
        }

        .dimension-bar {
            height: 8px;
            background: rgba(139, 92, 246, 0.2);
            border-radius: 4px;
            overflow: hidden;
            margin-top: 10px;
        }

        .dimension-fill {
            height: 100%;
            background: linear-gradient(90deg, #8b5cf6 0%, #ec4899 100%);
            transition: width 0.5s ease;
        }

        .violations-section {
            background: rgba(239, 68, 68, 0.05);
            border: 2px solid rgba(239, 68, 68, 0.3);
            border-radius: 20px;
            padding: 40px;
            margin: 60px 0;
        }

        .violation-card {
            background: rgba(0, 0, 0, 0.5);
            padding: 20px;
            border-radius: 12px;
            margin: 20px 0;
            border-left: 4px solid #ef4444;
        }

        .violation-type {
            font-size: 1.3rem;
            color: #ef4444;
            font-weight: 700;
            margin-bottom: 10px;
        }

        .prompts-section {
            background: rgba(16, 185, 129, 0.05);
            border: 2px solid rgba(16, 185, 129, 0.3);
            border-radius: 20px;
            padding: 40px;
            margin: 60px 0;
        }

        .prompt-card {
            background: rgba(0, 0, 0, 0.5);
            padding: 25px;
            border-radius: 12px;
            margin: 20px 0;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .prompt-title {
            font-size: 1.4rem;
            color: #10b981;
            font-weight: 700;
            margin-bottom: 15px;
        }

        .prompt-content {
            background: rgba(0, 0, 0, 0.3);
            padding: 20px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 0.95rem;
            line-height: 1.6;
            white-space: pre-wrap;
            color: #94a3b8;
            max-height: 400px;
            overflow-y: auto;
        }

        .copy-button {
            background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
            color: white;
            border: none;
            padding: 10px 25px;
            border-radius: 25px;
            font-weight: 700;
            cursor: pointer;
            margin-top: 15px;
            transition: all 0.3s ease;
        }

        .copy-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(139, 92, 246, 0.3);
        }

        .orthogonality-matrix {
            background: rgba(0, 0, 0, 0.5);
            padding: 30px;
            border-radius: 12px;
            margin: 30px 0;
        }

        .matrix-title {
            font-size: 1.3rem;
            color: #8b5cf6;
            margin-bottom: 20px;
        }

        .matrix-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid rgba(139, 92, 246, 0.1);
        }

        .matrix-pair {
            font-weight: 700;
            color: #e2e8f0;
        }

        .matrix-correlation {
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: 700;
        }

        .correlation-good {
            background: rgba(16, 185, 129, 0.2);
            color: #10b981;
        }

        .correlation-bad {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
        }

        .black-scholes {
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%);
            border: 2px solid rgba(139, 92, 246, 0.3);
            border-radius: 20px;
            padding: 40px;
            margin: 60px 0;
        }

        .formula-display {
            font-size: 1.5rem;
            font-family: 'Courier New', monospace;
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background: rgba(0, 0, 0, 0.5);
            border-radius: 12px;
            color: #06ffa5;
        }

        .timestamp {
            color: #64748b;
            font-size: 0.9rem;
            text-align: center;
            margin-top: 20px;
        }

        .cta-section {
            text-align: center;
            margin: 80px 0;
            padding: 60px;
            background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
            border-radius: 30px;
        }

        .cta-title {
            font-size: 2.5rem;
            font-weight: 900;
            color: white;
            margin-bottom: 20px;
        }

        .cta-button-main {
            display: inline-block;
            background: white;
            color: #8b5cf6;
            padding: 20px 50px;
            border-radius: 30px;
            text-decoration: none;
            font-weight: 900;
            font-size: 1.2rem;
            margin: 20px;
            transition: all 0.3s ease;
        }

        .cta-button-main:hover {
            transform: scale(1.05);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="unity-principle">Shape = Symbol</div>
            <h1>Trust Debt FIM Analysis</h1>
            <p style="font-size: 1.3rem; color: #94a3b8;">
                Week ${weekData.weekNumber}: ${weekData.theme.name}
            </p>
            <div class="score-display">${analysis.trustDebt?.score || 0}/100</div>
            <div class="insurability-badge">
                ${analysis.trustDebt?.insurabilityThreshold ? '✅ INSURABLE' : '❌ UNINSURABLE'}
            </div>
            <div class="timestamp">Generated: ${new Date().toISOString()}</div>
        </div>

        <!-- M = S × E Framework -->
        <div class="framework-grid">
            <div class="framework-card" data-label="E">
                <div class="framework-title">Environment (Structure)</div>
                <div class="framework-score">${((analysis.momentum?.components?.environment || 0) * 100).toFixed(1)}%</div>
                <div class="framework-details">
                    <p>Hierarchy Integrity: ${analysis.environment?.hierarchyIntegrity?.toFixed(1) || 0}%</p>
                    <p>Position Alignment: ${analysis.environment?.positionSemanticAlignment?.toFixed(1) || 0}%</p>
                    <p>Depth: ${analysis.environment?.depth || 0} levels</p>
                </div>
            </div>

            <div class="framework-card" data-label="S">
                <div class="framework-title">Skill (Process)</div>
                <div class="framework-score">${((analysis.momentum?.components?.skill || 0) * 100).toFixed(1)}%</div>
                <div class="framework-details">
                    <p>Orthogonality: ${analysis.skill?.decompositionQuality?.toFixed(1) || 0}%</p>
                    <p>Intent Preserved: ${analysis.skill?.intentPreservation?.toFixed(1) || 0}%</p>
                    <p>Wedge Amplification: ${analysis.skill?.wedgeAmplification?.toFixed(1) || 0}%</p>
                </div>
            </div>

            <div class="framework-card" data-label="M">
                <div class="framework-title">Momentum (Result)</div>
                <div class="framework-score">${((analysis.momentum?.raw || 0) * 100).toFixed(1)}%</div>
                <div class="framework-details">
                    <p>Raw: ${((analysis.momentum?.raw || 0) * 100).toFixed(1)}%</p>
                    <p>Leveraged: ${((analysis.momentum?.leveraged || 0) * 100).toFixed(1)}%</p>
                    <p>361x Potential: ${analysis.momentum?.potential361x?.toFixed(0) || 0}x</p>
                </div>
            </div>
        </div>

        <!-- FIM Structure Visualization -->
        <div class="fim-structure">
            <h2 class="fim-title">FIM Hierarchical Analysis</h2>
            
            <div class="dimension-grid">
                ${Object.entries(analysis.environment?.nodes || {})
                    .filter(([key]) => FIM_STRUCTURE[key]?.level === 1)
                    .map(([key, node]) => {
                        const score = node.score || 0;
                        const level = score >= 70 ? 'high' : score >= 50 ? 'medium' : 'low';
                        const color = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
                        return `
                        <div class="dimension-card ${level}">
                            <div class="dimension-key">${key}</div>
                            <div class="dimension-name">${FIM_STRUCTURE[key].name}</div>
                            <div class="dimension-score" style="color: ${color}">${score}%</div>
                            <div class="dimension-bar">
                                <div class="dimension-fill" style="width: ${score}%"></div>
                            </div>
                            <div style="margin-top: 15px; font-size: 0.9rem; color: #94a3b8;">
                                Weight: ${(FIM_STRUCTURE[key].weight * 100).toFixed(0)}%<br>
                                Target ε: ${FIM_STRUCTURE[key].orthogonalityTarget}
                            </div>
                        </div>
                        `;
                    }).join('')}
            </div>
        </div>

        <!-- Orthogonality Matrix -->
        <div class="orthogonality-matrix">
            <h3 class="matrix-title">Orthogonality Analysis (Target: |ρ| < 0.1)</h3>
            ${Object.entries(analysis.skill?.orthogonality || {}).map(([pair, data]) => `
                <div class="matrix-row">
                    <span class="matrix-pair">${pair}</span>
                    <span class="matrix-correlation ${data.withinTarget ? 'correlation-good' : 'correlation-bad'}">
                        ρ = ${data.correlation.toFixed(3)} ${data.withinTarget ? '✓' : '✗'}
                    </span>
                </div>
            `).join('')}
        </div>

        <!-- Black-Scholes Trust Debt -->
        <div class="black-scholes">
            <h2 style="color: #8b5cf6; margin-bottom: 30px;">Black-Scholes Trust Debt Framework</h2>
            
            <div class="formula-display">
                TD = Drift × (Intent - Reality) × √(σ²t)
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 30px; margin-top: 30px;">
                <div>
                    <h4 style="color: #ec4899; margin-bottom: 15px;">Components</h4>
                    <p>Intent: ${analysis.trustDebt?.components?.intent || 100}</p>
                    <p>Reality: ${analysis.trustDebt?.components?.reality || 0}%</p>
                    <p>Drift: ${analysis.trustDebt?.components?.drift || 0}%</p>
                    <p>Volatility (σ): ${((analysis.trustDebt?.components?.volatility || 0) * 100).toFixed(1)}%</p>
                </div>
                <div>
                    <h4 style="color: #ec4899; margin-bottom: 15px;">Projections</h4>
                    <p>Daily Accumulation: ${analysis.trustDebt?.dailyAccumulation || 0.3}%</p>
                    <p>Annual Projection: ${analysis.trustDebt?.projectedAnnual?.toFixed(1) || 0}%</p>
                    <p>Insurability: ${analysis.trustDebt?.insurabilityThreshold ? 'YES' : 'NO'}</p>
                    <p>Risk Level: ${analysis.trustDebt?.score >= 70 ? 'Low' : analysis.trustDebt?.score >= 50 ? 'Medium' : 'High'}</p>
                </div>
            </div>
        </div>

        <!-- Violations -->
        ${analysis.violations && analysis.violations.length > 0 ? `
        <div class="violations-section">
            <h2 style="color: #ef4444; margin-bottom: 30px;">⚠️ Unity Violations Detected</h2>
            ${analysis.violations.map(violation => `
                <div class="violation-card">
                    <div class="violation-type">${violation.type}</div>
                    <p style="margin: 10px 0;">${violation.description}</p>
                    <p style="color: #f59e0b;">Impact: ${violation.impact}</p>
                    <p style="color: #ef4444;">Severity: ${violation.severity}</p>
                </div>
            `).join('')}
        </div>
        ` : ''}

        <!-- Improvement Prompts -->
        <div class="prompts-section">
            <h2 style="color: #10b981; margin-bottom: 30px;">📋 Improvement Prompts</h2>
            
            ${analysis.prompts?.map((prompt, index) => `
                <div class="prompt-card">
                    <div class="prompt-title">
                        ${prompt.title}
                        ${prompt.priority ? `<span style="background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 3px 10px; border-radius: 12px; margin-left: 10px; font-size: 0.9rem;">${prompt.priority}</span>` : ''}
                    </div>
                    <div class="prompt-content" id="prompt-${index}">${prompt.content}</div>
                    <button class="copy-button" onclick="copyPrompt('prompt-${index}')">
                        Copy Prompt
                    </button>
                </div>
            `).join('')}
        </div>

        <!-- Per-Prompt Estimates -->
        <div class="prompts-section" style="background: rgba(139, 92, 246, 0.05); border-color: rgba(139, 92, 246, 0.3);">
            <h2 style="color: #8b5cf6; margin-bottom: 30px;">🎯 Per-Prompt Trust Debt Estimates</h2>
            
            <div class="prompt-card">
                <div class="prompt-title">Prompt 1: Fix Strategic Nudges Pattern</div>
                <p>Current Score: ${analysis.environment?.nodes?.A?.score || 0}%</p>
                <p>Target Score: 85%</p>
                <p>Trust Debt Impact: +${Math.min(15, 85 - (analysis.environment?.nodes?.A?.score || 0))} points</p>
                <div class="prompt-content">
Replace all generic timing language with:
"One breakthrough question, delivered in 30 seconds at your moment of maximum receptivity."

Remove: "We'll help when we can"
Add: "Precisely timed for 30% acceleration"

This change alone will improve Trust Debt by ~${Math.min(15, 85 - (analysis.environment?.nodes?.A?.score || 0))} points.
                </div>
            </div>

            <div class="prompt-card">
                <div class="prompt-title">Prompt 2: Quantify Trust Debt</div>
                <p>Current Score: ${analysis.environment?.nodes?.B?.score || 0}%</p>
                <p>Target Score: 85%</p>
                <p>Trust Debt Impact: +${Math.min(15, 85 - (analysis.environment?.nodes?.B?.score || 0))} points</p>
                <div class="prompt-content">
Add specific Trust Debt measurements:
"Your Trust Debt Score: 73/100
Daily drift: 0.3%
Accumulated debt: $47K/month"

This quantification will improve Trust Debt by ~${Math.min(15, 85 - (analysis.environment?.nodes?.B?.score || 0))} points.
                </div>
            </div>

            <div class="prompt-card">
                <div class="prompt-title">Prompt 3: Name Patterns Memorably</div>
                <p>Current Score: ${analysis.environment?.nodes?.C?.score || 0}%</p>
                <p>Target Score: 85%</p>
                <p>Trust Debt Impact: +${Math.min(10, 85 - (analysis.environment?.nodes?.C?.score || 0))} points</p>
                <div class="prompt-content">
Replace generic pattern names:
Before: "Issue type 3"
After: "The Thursday Panic Pattern"

Add cost quantification:
"Costs 12 hours/week" or "$50K annually"

Pattern naming improvement: +${Math.min(10, 85 - (analysis.environment?.nodes?.C?.score || 0))} Trust Debt points.
                </div>
            </div>

            <div class="prompt-card">
                <div class="prompt-title">Prompt 4: Engineer Recognition</div>
                <p>Current Score: ${analysis.environment?.nodes?.D?.score || 0}%</p>
                <p>Target Score: 85%</p>
                <p>Trust Debt Impact: +${Math.min(8, 85 - (analysis.environment?.nodes?.D?.score || 0))} points</p>
                <div class="prompt-content">
Stop teaching, start triggering:
Before: "Let me explain how this works..."
After: "Remember yesterday at 3pm when everything clicked?"

Add daily oh moment commitment:
"One breakthrough insight, every single day."

Recognition engineering: +${Math.min(8, 85 - (analysis.environment?.nodes?.D?.score || 0))} Trust Debt points.
                </div>
            </div>

            <div class="prompt-card">
                <div class="prompt-title">Prompt 5: Clarify 361x Precision</div>
                <p>Current Score: ${analysis.environment?.nodes?.E?.score || 0}%</p>
                <p>Target Score: 85%</p>
                <p>Trust Debt Impact: +${Math.min(8, 85 - (analysis.environment?.nodes?.E?.score || 0))} points</p>
                <div class="prompt-content">
Correct the 361x claim:
Wrong: "361x faster processing"
Right: "361x precision in semantic alignment"

Add mathematical grounding:
"Geometric alignment, mathematically proven, 73% reproducible."

Precision clarification: +${Math.min(8, 85 - (analysis.environment?.nodes?.E?.score || 0))} Trust Debt points.
                </div>
            </div>

            <div style="margin-top: 40px; padding: 30px; background: rgba(0, 0, 0, 0.5); border-radius: 12px;">
                <h3 style="color: #06ffa5; margin-bottom: 20px;">Total Estimated Improvement</h3>
                <p style="font-size: 1.3rem;">
                    Current Trust Debt: <strong>${analysis.trustDebt?.score || 0}/100</strong><br>
                    After All Prompts: <strong>${Math.min(100, (analysis.trustDebt?.score || 0) + 40)}/100</strong><br>
                    Total Gain: <strong>+${Math.min(40, 100 - (analysis.trustDebt?.score || 0))} points</strong>
                </p>
                <p style="margin-top: 20px; color: #94a3b8;">
                    ${analysis.trustDebt?.score < 70 ? 
                    'These improvements will bring you above the insurability threshold (70/100).' :
                    'These improvements will optimize your already insurable Trust Debt score.'}
                </p>
            </div>
        </div>

        <!-- CTA Section -->
        <div class="cta-section">
            <h2 class="cta-title">Ready to Eliminate Trust Debt?</h2>
            <p style="font-size: 1.3rem; margin-bottom: 30px;">
                Implement these ${analysis.prompts?.length || 5} improvements to achieve<br>
                ${Math.min(40, 100 - (analysis.trustDebt?.score || 0))}+ point Trust Debt improvement
            </p>
            <a href="#" class="cta-button-main">Start Improving</a>
        </div>

        <div style="text-align: center; margin-top: 60px; color: #64748b;">
            <p style="font-size: 1.2rem;">M = S × E</p>
            <p>Momentum = Skill × Environment</p>
            <p style="margin-top: 20px;">Shape = Symbol | Unity Principle</p>
            <p style="margin-top: 10px;">Powered by FIM Technology | Patent Pending</p>
        </div>
    </div>

    <script>
        function copyPrompt(id) {
            const element = document.getElementById(id);
            const text = element.textContent;
            
            navigator.clipboard.writeText(text).then(() => {
                const button = element.nextElementSibling;
                const originalText = button.textContent;
                button.textContent = 'Copied!';
                button.style.background = 'linear-gradient(135deg, #10b981 0%, #06ffa5 100%)';
                
                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)';
                }, 2000);
            });
        }
    </script>
</body>
</html>`;

  return html;
};

// Main execution
const main = async () => {
  console.log('🎯 Trust Debt FIM Analysis (t:week)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Using M = S × E Framework | Shape = Symbol Unity Principle\n');
  
  try {
    // 1. Get current week data
    const weekNumber = getCurrentWeek();
    const weekData = {
      weekNumber,
      theme: WEEK_THEMES[weekNumber]
    };
    
    console.log(`📅 Week ${weekNumber}: ${weekData.theme.name}`);
    
    // 2. Analyze with FIM-based Trust Debt
    console.log('\n🔍 Analyzing Trust Debt with FIM...');
    const analyzer = new FIMTrustDebtAnalyzer();
    
    // Get content to analyze
    let content = '';
    const weekFile = path.join(__dirname, '..', `WEEK_${weekNumber}_RECOGNITION_DISRUPTION.md`);
    
    if (fsSync.existsSync(weekFile)) {
      console.log('  Analyzing week content file...');
      content = await fs.readFile(weekFile, 'utf-8');
    } else {
      // Analyze CLAUDE.md as fallback
      const claudeFile = path.join(__dirname, '..', 'CLAUDE.md');
      if (fsSync.existsSync(claudeFile)) {
        console.log('  Analyzing CLAUDE.md...');
        content = await fs.readFile(claudeFile, 'utf-8');
      } else {
        content = 'Strategic Nudges via Un-Robocall. Trust Debt measurement. Pattern recognition.';
      }
    }
    
    // Perform FIM analysis
    const analysis = analyzer.analyzeFIM(content);
    
    console.log(`\n✅ M = S × E Analysis Complete:`);
    console.log(`   E (Environment): ${(analysis.momentum.components.environment * 100).toFixed(1)}%`);
    console.log(`   S (Skill): ${(analysis.momentum.components.skill * 100).toFixed(1)}%`);
    console.log(`   M (Momentum): ${(analysis.momentum.raw * 100).toFixed(1)}%`);
    console.log(`\n📊 Trust Debt Score: ${analysis.trustDebt.score}/100`);
    console.log(`   Insurability: ${analysis.trustDebt.insurabilityThreshold ? '✅ YES' : '❌ NO'}`);
    console.log(`   Daily Drift: ${analysis.trustDebt.dailyAccumulation}%`);
    
    if (analysis.violations.length > 0) {
      console.log(`\n⚠️  ${analysis.violations.length} Unity Violations Detected`);
    }
    
    // 3. Generate enhanced HTML
    console.log('\n🎨 Generating FIM visualization...');
    const htmlContent = await generateEnhancedTrustDebtHTML(analysis, weekData);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const htmlPath = path.join(__dirname, '..', `trust-debt-fim-${timestamp}.html`);
    await fs.writeFile(htmlPath, htmlContent);
    console.log(`✅ Created: ${path.basename(htmlPath)}`);
    
    // 4. ALWAYS open HTML in browser
    console.log('\n🌐 Opening Trust Debt FIM visualization...');
    try {
      execSync(`open "${htmlPath}"`, { stdio: 'ignore' });
      console.log('✅ Opened Trust Debt FIM analysis in browser');
    } catch (error) {
      // Fallback for non-Mac
      try {
        execSync(`xdg-open "${htmlPath}"`, { stdio: 'ignore' });
        console.log('✅ Opened in browser');
      } catch (e) {
        console.log(`📖 View at: ${htmlPath}`);
      }
    }
    
    // 5. Generate comprehensive Claude prompt
    const claudePrompt = `# 🎯 Trust Debt FIM Analysis - Week ${weekData.weekNumber}

## Unity Principle: Shape = Symbol
The position in hierarchy must equal semantic meaning and hardware pattern.
Current Position-Semantic Alignment: ${analysis.environment.positionSemanticAlignment.toFixed(1)}%

## M = S × E Framework Results

### E (Environment/Structure): ${(analysis.momentum.components.environment * 100).toFixed(1)}%
- Fractal Working Memory Depth: ${analysis.environment.depth} levels
- Hierarchy Integrity: ${analysis.environment.hierarchyIntegrity.toFixed(1)}%
- Position-Semantic Alignment: ${analysis.environment.positionSemanticAlignment.toFixed(1)}%

### S (Skill/Process): ${(analysis.momentum.components.skill * 100).toFixed(1)}%
- Orthogonal Decomposition Quality: ${analysis.skill.decompositionQuality.toFixed(1)}%
- Intent Preservation: ${analysis.skill.intentPreservation.toFixed(1)}%
- Wedge Amplification: ${analysis.skill.wedgeAmplification.toFixed(1)}%

### M (Momentum/Result): ${(analysis.momentum.raw * 100).toFixed(1)}%
- Raw Momentum: ${(analysis.momentum.raw * 100).toFixed(1)}%
- Leveraged (depth ${analysis.environment.depth}): ${(analysis.momentum.leveraged * 100).toFixed(1)}%
- 361x Potential: ${analysis.momentum.potential361x.toFixed(0)}x

## Black-Scholes Trust Debt Calculation
Using the patent's Trust Debt as options pricing framework:

**Trust Debt Score: ${analysis.trustDebt.score}/100**
- Intent: ${analysis.trustDebt.components.intent}
- Reality: ${analysis.trustDebt.components.reality}%
- Drift: ${analysis.trustDebt.components.drift}%
- Semantic Volatility (σ): ${(analysis.trustDebt.components.volatility * 100).toFixed(1)}%
- Daily Accumulation: ${analysis.trustDebt.dailyAccumulation}%
- **Insurable: ${analysis.trustDebt.insurabilityThreshold ? 'YES ✅' : 'NO ❌ (Below 70 threshold)'}**

## Orthogonality Analysis (ε ≈ 0.1 Target)
${Object.entries(analysis.skill.orthogonality)
  .map(([pair, data]) => `${pair}: ρ=${data.correlation.toFixed(3)} ${data.withinTarget ? '✓' : '✗ VIOLATION'}`)
  .join('\n')}

## Unity Violations
${analysis.violations.length > 0 ? 
  analysis.violations.map(v => `
### ${v.type} (${v.severity})
- Description: ${v.description}
- Impact: ${v.impact}`).join('\n') :
  'No violations detected - Unity Principle maintained'}

## FIM Dimension Analysis
${['A', 'B', 'C', 'D', 'E'].map(key => {
  const node = analysis.environment.nodes[key];
  const structure = FIM_STRUCTURE[key];
  return `
### ${key}. ${structure.name} (Weight: ${(structure.weight * 100).toFixed(0)}%)
- Current Score: ${node?.score || 0}%
- Hits: ${node?.hits || 0}
- Misses: ${node?.misses || 0}
- Gap to Target: ${85 - (node?.score || 0)}%`;
}).join('\n')}

## Specific Improvements Required

${analysis.prompts[0]?.content || 'No specific improvements generated'}

## Implementation Priority
1. ${!analysis.trustDebt.insurabilityThreshold ? '🚨 CRITICAL: Achieve insurability (70+ score)' : '✅ Maintain insurability'}
2. Fix orthogonality violations (|ρ| < 0.1)
3. Restore Unity Principle (Shape = Symbol)
4. Maximize M through S × E optimization

## Next Steps
1. Review the HTML visualization (now open)
2. Implement the 5 per-prompt improvements
3. Re-run t:week to verify Trust Debt reduction
4. Achieve insurability threshold if not met

The HTML dashboard with per-prompt estimates is now open in your browser.
Each prompt shows specific Trust Debt point improvements.

Ready to implement improvements?`;
    
    // 6. Save and potentially launch Claude
    const promptPath = path.join(__dirname, '..', 'logs', `trust-debt-fim-prompt-${Date.now()}.txt`);
    await fs.mkdir(path.dirname(promptPath), { recursive: true });
    await fs.writeFile(promptPath, claudePrompt);
    
    console.log('\n📋 Full analysis saved to:', path.basename(promptPath));
    console.log('\n✨ Trust Debt FIM Analysis Complete!');
    console.log('   View the HTML for per-prompt Trust Debt estimates');
    
  } catch (error) {
    console.error('❌ Trust Debt FIM analysis failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = { generateEnhancedTrustDebtHTML };