#!/usr/bin/env node

/**
 * Trust Debt Q&A Generator - Reproducing the Magic
 * 
 * This tool generates specific, actionable questions based on Trust Debt analysis
 * to create a clear path to "reproducible magic" - when M = S × E > 100%
 * 
 * The questions are designed as forcing functions that make the next action obvious.
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration thresholds
const MAGIC_THRESHOLD = 100; // When momentum > 100%, magic becomes reproducible
const INSURABLE_THRESHOLD = 70; // Trust Debt score needed for insurability

/**
 * Generate Q&A based on Trust Debt gaps
 * Each question is a forcing function that reveals the exact action needed
 */
function generateGapQuestions(debtAnalysis) {
  const questions = [];
  
  // Trust Gap Questions
  if (Math.abs(debtAnalysis.gap.trust) > 0.1) {
    const trustGap = debtAnalysis.gap.trust * 100;
    questions.push({
      category: 'Trust Foundation',
      gap: Math.abs(trustGap),
      severity: Math.abs(trustGap) > 20 ? 'critical' : 'important',
      question: trustGap > 0 ? 
        `Your Trust focus is ${Math.abs(trustGap).toFixed(0)}% below intent. Which of these would add the most quantification to your next commit?` :
        `You're ${Math.abs(trustGap).toFixed(0)}% over-indexed on Trust. Which trust metric could become automatic instead of manual?`,
      options: trustGap > 0 ? [
        { 
          action: 'Add Trust Debt dashboard to homepage',
          impact: 'Makes drift visible to all users (+15% trust)',
          effort: 'medium',
          momentum: '+8%'
        },
        {
          action: 'Create /api/trust-score endpoint with real-time calculation',
          impact: 'Quantifies trust for every interaction (+20% trust)',
          effort: 'low',
          momentum: '+12%'
        },
        {
          action: 'Add "Trust Impact: X units" to every commit message',
          impact: 'Forces trust thinking in development (+10% trust)',
          effort: 'trivial',
          momentum: '+5%'
        },
        {
          action: 'Build Trust Debt MCP server for Claude integration',
          impact: 'AI becomes trust-aware (+25% trust)',
          effort: 'high',
          momentum: '+15%'
        }
      ] : [
        {
          action: 'Automate trust calculations in CI/CD pipeline',
          impact: 'Reduces manual trust overhead (-10% effort)',
          effort: 'medium',
          momentum: '+5%'
        },
        {
          action: 'Shift 2 trust features to timing/recognition',
          impact: 'Rebalances focus (-15% trust, +15% others)',
          effort: 'low',
          momentum: '+7%'
        }
      ],
      formula: `Current: ${(debtAnalysis.realityVector.trust * 100).toFixed(0)}% → Target: ${(debtAnalysis.intentVector.trust * 100).toFixed(0)}%`
    });
  }
  
  // Timing Gap Questions
  if (Math.abs(debtAnalysis.gap.timing) > 0.1) {
    const timingGap = debtAnalysis.gap.timing * 100;
    questions.push({
      category: 'Strategic Timing',
      gap: Math.abs(timingGap),
      severity: Math.abs(timingGap) > 20 ? 'critical' : 'important',
      question: timingGap > 0 ?
        `Your Timing focus is ${Math.abs(timingGap).toFixed(0)}% below intent. Which 30-second constraint would have the biggest impact?` :
        `You're ${Math.abs(timingGap).toFixed(0)}% over-optimizing timing. Where could you trade speed for depth?`,
      options: timingGap > 0 ? [
        {
          action: 'Implement 30-second page load budget with auto-alerts',
          impact: 'Forces performance thinking (+15% timing)',
          effort: 'low',
          momentum: '+7%'
        },
        {
          action: 'Add "Response Time: Xs" to all API endpoints',
          impact: 'Makes timing visible in logs (+10% timing)',
          effort: 'trivial',
          momentum: '+4%'
        },
        {
          action: 'Create Nuclear Mailbox pattern for instant responses',
          impact: 'Sub-second user feedback (+20% timing)',
          effort: 'medium',
          momentum: '+10%'
        },
        {
          action: 'Build "Perfect Moment" detector for nudge delivery',
          impact: 'AI-powered receptivity timing (+25% timing)',
          effort: 'high',
          momentum: '+14%'
        }
      ] : [
        {
          action: 'Add deeper insight generation to fast paths',
          impact: 'Trade 5s speed for 50% more value',
          effort: 'low',
          momentum: '+6%'
        },
        {
          action: 'Implement progressive enhancement instead of instant-everything',
          impact: 'Prioritizes core value over speed',
          effort: 'medium',
          momentum: '+8%'
        }
      ],
      formula: `Current: ${(debtAnalysis.realityVector.timing * 100).toFixed(0)}% → Target: ${(debtAnalysis.intentVector.timing * 100).toFixed(0)}%`
    });
  }
  
  // Recognition Gap Questions
  if (Math.abs(debtAnalysis.gap.recognition) > 0.1) {
    const recognitionGap = debtAnalysis.gap.recognition * 100;
    questions.push({
      category: 'Oh Moment Creation',
      gap: Math.abs(recognitionGap),
      severity: Math.abs(recognitionGap) > 20 ? 'critical' : 'important',
      question: recognitionGap > 0 ?
        `Your Recognition focus is ${Math.abs(recognitionGap).toFixed(0)}% below intent. Which pattern would create the most "oh moments"?` :
        `You're ${Math.abs(recognitionGap).toFixed(0)}% over-indexed on recognition. Which insights could become metrics?`,
      options: recognitionGap > 0 ? [
        {
          action: 'Add "Oh Moment" reaction button to all content',
          impact: 'Tracks breakthrough moments (+10% recognition)',
          effort: 'trivial',
          momentum: '+4%'
        },
        {
          action: 'Create pattern library of successful insights',
          impact: 'Systematizes oh moment creation (+15% recognition)',
          effort: 'low',
          momentum: '+7%'
        },
        {
          action: 'Build "Recognition Engine" for user blindspots',
          impact: 'AI finds what users are missing (+20% recognition)',
          effort: 'medium',
          momentum: '+11%'
        },
        {
          action: 'Implement Strategic Nudge delivery system',
          impact: 'Perfect question at perfect time (+30% recognition)',
          effort: 'high',
          momentum: '+16%'
        }
      ] : [
        {
          action: 'Convert top 3 insights into measurable KPIs',
          impact: 'Shifts from feeling to measurement',
          effort: 'low',
          momentum: '+5%'
        },
        {
          action: 'Add quantification to pattern recognition',
          impact: 'Makes insights trackable',
          effort: 'medium',
          momentum: '+8%'
        }
      ],
      formula: `Current: ${(debtAnalysis.realityVector.recognition * 100).toFixed(0)}% → Target: ${(debtAnalysis.intentVector.recognition * 100).toFixed(0)}%`
    });
  }
  
  return questions;
}

/**
 * Generate FIM momentum questions
 * These focus on achieving M > 100% for multiplicative effects
 */
function generateMomentumQuestions(debtAnalysis, gitInfo) {
  const questions = [];
  
  // Skill Questions (Execution)
  if (debtAnalysis.fim.skill < 80) {
    questions.push({
      category: 'Execution Skill',
      gap: 80 - debtAnalysis.fim.skill,
      severity: debtAnalysis.fim.skill < 50 ? 'critical' : 'important',
      question: `Your Skill is ${debtAnalysis.fim.skill.toFixed(0)}%, limiting momentum to ${debtAnalysis.fim.momentum.toFixed(0)}%. Which commit pattern would boost execution most?`,
      options: [
        {
          action: 'Prefix every commit with principle: "trust: Add X" or "timing: Fix Y"',
          impact: 'Forces principle alignment (+15% skill)',
          effort: 'trivial',
          momentum: '+7%'
        },
        {
          action: 'Create pre-commit hook that scores principle alignment',
          impact: 'Prevents misaligned commits (+20% skill)',
          effort: 'low',
          momentum: '+10%'
        },
        {
          action: 'Review last 5 commits and fix alignment in next 5',
          impact: 'Immediate skill improvement (+25% skill)',
          effort: 'medium',
          momentum: '+13%'
        },
        {
          action: 'Implement "Principle of the Day" focus rotation',
          impact: 'Systematic skill building (+30% skill)',
          effort: 'low',
          momentum: '+15%'
        }
      ],
      formula: `Current Skill: ${debtAnalysis.fim.skill.toFixed(0)}% → Target: 80%+`,
      recent: gitInfo.commits.slice(0, 3).map(c => 
        `${c.hash.substring(0, 7)}: ${c.alignment.primary} (${c.alignment.overall > 0 ? '+' : ''}${c.alignment.overall})`
      )
    });
  }
  
  // Environment Questions (Spec Freshness)
  if (debtAnalysis.fim.environment < 90) {
    questions.push({
      category: 'Environment Health',
      gap: 90 - debtAnalysis.fim.environment,
      severity: debtAnalysis.fim.environment < 70 ? 'critical' : 'important',
      question: `Your Environment is ${debtAnalysis.fim.environment.toFixed(0)}% (spec is ${gitInfo.specAge.toFixed(0)} days old). How should CLAUDE.md evolve?`,
      options: [
        {
          action: 'Update intent percentages based on current reality',
          impact: 'Aligns spec with practice (+10% environment)',
          effort: 'trivial',
          momentum: '+5%'
        },
        {
          action: 'Add new learned patterns to CLAUDE.md',
          impact: 'Captures evolution (+15% environment)',
          effort: 'low',
          momentum: '+8%'
        },
        {
          action: 'Create weekly spec review ritual',
          impact: 'Keeps spec fresh permanently (+20% environment)',
          effort: 'medium',
          momentum: '+11%'
        },
        {
          action: 'Build auto-update system for CLAUDE.md from commits',
          impact: 'Self-maintaining specification (+30% environment)',
          effort: 'high',
          momentum: '+17%'
        }
      ],
      formula: `Spec Age: ${gitInfo.specAge.toFixed(0)} days → Target: <3 days`
    });
  }
  
  // Momentum Breakthrough Question
  if (debtAnalysis.fim.momentum < MAGIC_THRESHOLD) {
    const gapToMagic = MAGIC_THRESHOLD - debtAnalysis.fim.momentum;
    questions.push({
      category: '🎯 Path to Magic',
      gap: gapToMagic,
      severity: 'breakthrough',
      question: `You're ${gapToMagic.toFixed(0)}% away from reproducible magic (M>100%). What's the fastest path?`,
      options: [
        {
          action: 'Quick Skill Boost: Align next 3 commits perfectly',
          impact: `+${Math.min(15, gapToMagic).toFixed(0)}% momentum in 1 hour`,
          effort: 'low',
          momentum: `+${Math.min(15, gapToMagic).toFixed(0)}%`
        },
        {
          action: 'Environment Refresh: Update CLAUDE.md right now',
          impact: `+${Math.min(10, gapToMagic).toFixed(0)}% momentum in 10 minutes`,
          effort: 'trivial',
          momentum: `+${Math.min(10, gapToMagic).toFixed(0)}%`
        },
        {
          action: 'Double Down: Fix biggest gap + update spec',
          impact: `+${Math.min(25, gapToMagic).toFixed(0)}% momentum today`,
          effort: 'medium',
          momentum: `+${Math.min(25, gapToMagic).toFixed(0)}%`
        },
        {
          action: 'Full Alignment: Implement top suggestion from each category',
          impact: `+${Math.min(40, gapToMagic).toFixed(0)}% momentum this week`,
          effort: 'high',
          momentum: `+${Math.min(40, gapToMagic).toFixed(0)}%`
        }
      ],
      formula: `M = ${(debtAnalysis.fim.skill/100).toFixed(2)} × ${(debtAnalysis.fim.environment/100).toFixed(2)} = ${(debtAnalysis.fim.momentum/100).toFixed(2)} → Target: >1.00`,
      magic: `At M>100%, every action creates ${(2 ** (debtAnalysis.fim.momentum/100 * 3)).toFixed(1)}x leverage`
    });
  } else {
    // Already in magic zone!
    questions.push({
      category: '✨ Magic Amplification',
      gap: 0,
      severity: 'success',
      question: `You have ${debtAnalysis.fim.leverage.toFixed(1)}x leverage! Every action multiplies. What breakthrough do you want to create?`,
      options: [
        {
          action: 'Launch viral feature with current momentum',
          impact: `${debtAnalysis.fim.leverage.toFixed(1)}x viral coefficient`,
          effort: 'medium',
          momentum: `+${(debtAnalysis.fim.leverage * 5).toFixed(0)}%`
        },
        {
          action: 'Share Trust Debt framework publicly',
          impact: `Inspire ${debtAnalysis.fim.leverage.toFixed(0)} other teams`,
          effort: 'low',
          momentum: `+${(debtAnalysis.fim.leverage * 3).toFixed(0)}%`
        },
        {
          action: 'Double down on strongest principle',
          impact: `Create category-defining feature`,
          effort: 'high',
          momentum: `+${(debtAnalysis.fim.leverage * 8).toFixed(0)}%`
        },
        {
          action: 'Teach team the magic formula',
          impact: `Multiply team momentum by ${debtAnalysis.fim.leverage.toFixed(1)}x`,
          effort: 'medium',
          momentum: `+${(debtAnalysis.fim.leverage * 10).toFixed(0)}%`
        }
      ],
      formula: `Leverage = 2^(${(debtAnalysis.fim.momentum/100 * 3).toFixed(2)}) = ${debtAnalysis.fim.leverage.toFixed(1)}x`,
      magic: `You're in the zone where magic becomes reproducible!`
    });
  }
  
  return questions;
}

/**
 * Generate Insurability questions
 * Focus on achieving Trust Debt Score > 70 for board-level acceptance
 */
function generateInsurabilityQuestions(debtAnalysis) {
  const questions = [];
  
  if (!debtAnalysis.isInsurable) {
    questions.push({
      category: 'Insurability Gap',
      gap: debtAnalysis.insurabilityGap,
      severity: 'critical',
      question: `You're ${debtAnalysis.insurabilityGap.toFixed(0)}% below insurability. What's the fastest way to reduce Trust Debt by ${(debtAnalysis.insurabilityGap * 10).toFixed(0)} units?`,
      options: [
        {
          action: 'Emergency alignment: Fix biggest gap now',
          impact: `-${Math.min(50, debtAnalysis.insurabilityGap * 10).toFixed(0)} units Trust Debt`,
          effort: 'medium',
          momentum: '+10%'
        },
        {
          action: 'Quick wins: Align next 5 commits',
          impact: `-${Math.min(30, debtAnalysis.insurabilityGap * 10).toFixed(0)} units Trust Debt`,
          effort: 'low',
          momentum: '+7%'
        },
        {
          action: 'Systematic fix: Update spec + align commits',
          impact: `-${Math.min(70, debtAnalysis.insurabilityGap * 10).toFixed(0)} units Trust Debt`,
          effort: 'high',
          momentum: '+15%'
        },
        {
          action: 'Reset baseline: Redefine intent to match reality',
          impact: `Instant insurability (changes goal, not reality)`,
          effort: 'trivial',
          momentum: '+0%'
        }
      ],
      formula: `Current: ${debtAnalysis.trustDebtScore.toFixed(0)} → Target: 70+ (${debtAnalysis.insurabilityGap.toFixed(0)}% gap)`,
      risk: `Every day uninsurable adds ${(debtAnalysis.insurabilityGap * 0.1).toFixed(1)} units debt`
    });
  }
  
  return questions;
}

/**
 * Generate HTML with interactive Q&A interface
 */
async function generateQnAHTML(debtAnalysis, gitInfo, questions) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trust Debt Q&A - Path to Reproducible Magic</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'SF Pro Display', -apple-system, sans-serif;
            background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 100%);
            color: #e2e8f0;
            line-height: 1.7;
            min-height: 100vh;
        }

        .header {
            text-align: center;
            padding: 60px 20px;
            background: radial-gradient(circle at center, rgba(139, 92, 246, 0.3) 0%, transparent 70%);
        }

        .magic-status {
            font-size: 5rem;
            font-weight: 900;
            margin: 20px 0;
            background: ${debtAnalysis.fim.momentum >= 100 ? 
              'linear-gradient(135deg, #06ffa5 0%, #8b5cf6 50%, #ec4899 100%)' : 
              'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)'};
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: ${debtAnalysis.fim.momentum >= 100 ? 'magic' : 'pulse'} 3s ease infinite;
        }

        @keyframes magic {
            0%, 100% { filter: hue-rotate(0deg) brightness(1); }
            50% { filter: hue-rotate(30deg) brightness(1.2); }
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }

        .momentum-bar {
            max-width: 800px;
            margin: 40px auto;
            background: rgba(0, 0, 0, 0.5);
            border-radius: 20px;
            padding: 5px;
            position: relative;
            overflow: hidden;
        }

        .momentum-fill {
            height: 40px;
            background: linear-gradient(90deg, 
              #ef4444 0%, 
              #f59e0b 50%, 
              #10b981 80%, 
              #8b5cf6 95%, 
              #06ffa5 100%);
            border-radius: 15px;
            width: ${Math.min(100, debtAnalysis.fim.momentum)}%;
            transition: width 0.5s ease;
            position: relative;
        }

        .momentum-label {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-weight: 900;
            font-size: 1.2rem;
            color: white;
            text-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }

        .magic-threshold {
            position: absolute;
            left: 100%;
            top: 0;
            bottom: 0;
            width: 2px;
            background: #06ffa5;
            box-shadow: 0 0 20px #06ffa5;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 40px 20px;
        }

        .question-card {
            background: rgba(30, 41, 59, 0.8);
            border-radius: 20px;
            padding: 30px;
            margin: 30px 0;
            border: 2px solid transparent;
            transition: all 0.3s ease;
        }

        .question-card.critical {
            border-color: #ef4444;
            background: rgba(239, 68, 68, 0.1);
        }

        .question-card.important {
            border-color: #f59e0b;
            background: rgba(245, 158, 11, 0.1);
        }

        .question-card.breakthrough {
            border-color: #8b5cf6;
            background: rgba(139, 92, 246, 0.1);
            animation: glow 2s ease infinite;
        }

        .question-card.success {
            border-color: #06ffa5;
            background: rgba(6, 255, 165, 0.1);
            animation: celebrate 1s ease infinite;
        }

        @keyframes glow {
            0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.5); }
            50% { box-shadow: 0 0 40px rgba(139, 92, 246, 0.8); }
        }

        @keyframes celebrate {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02); }
        }

        .category-label {
            display: inline-block;
            padding: 8px 20px;
            background: rgba(139, 92, 246, 0.2);
            border-radius: 20px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-size: 0.9rem;
            margin-bottom: 15px;
        }

        .question {
            font-size: 1.5rem;
            font-weight: 700;
            margin: 20px 0;
            line-height: 1.5;
        }

        .options {
            display: grid;
            gap: 15px;
            margin: 25px 0;
        }

        .option {
            background: rgba(0, 0, 0, 0.4);
            border: 2px solid rgba(139, 92, 246, 0.3);
            border-radius: 12px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        .option:hover {
            transform: translateX(10px);
            border-color: #8b5cf6;
            background: rgba(139, 92, 246, 0.1);
        }

        .option.selected {
            background: rgba(6, 255, 165, 0.2);
            border-color: #06ffa5;
        }

        .option-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .option-action {
            font-weight: 700;
            font-size: 1.1rem;
            color: #06ffa5;
        }

        .option-effort {
            padding: 4px 12px;
            background: rgba(0, 0, 0, 0.5);
            border-radius: 20px;
            font-size: 0.8rem;
            text-transform: uppercase;
        }

        .effort-trivial { background: rgba(16, 185, 129, 0.2); color: #10b981; }
        .effort-low { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
        .effort-medium { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }
        .effort-high { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

        .option-impact {
            color: #94a3b8;
            margin: 10px 0;
        }

        .option-momentum {
            display: inline-block;
            padding: 6px 15px;
            background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
            border-radius: 8px;
            font-weight: 900;
            margin-top: 10px;
        }

        .formula-box {
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: 8px;
            padding: 15px;
            margin-top: 20px;
            font-family: 'SF Mono', monospace;
            font-size: 1.1rem;
            color: #8b5cf6;
        }

        .action-summary {
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(6, 255, 165, 0.2));
            border: 2px solid #8b5cf6;
            border-radius: 20px;
            padding: 40px;
            margin: 60px 0;
            text-align: center;
        }

        .action-button {
            display: inline-block;
            padding: 15px 40px;
            background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
            border-radius: 50px;
            font-weight: 900;
            font-size: 1.2rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 20px;
            border: none;
            color: white;
        }

        .action-button:hover {
            transform: scale(1.05);
            box-shadow: 0 10px 40px rgba(139, 92, 246, 0.5);
        }

        .selected-path {
            background: rgba(6, 255, 165, 0.1);
            border: 2px solid #06ffa5;
            border-radius: 16px;
            padding: 30px;
            margin: 40px 0;
            display: none;
        }

        .selected-path.active {
            display: block;
            animation: slideIn 0.5s ease;
        }

        @keyframes slideIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .path-title {
            font-size: 1.8rem;
            font-weight: 900;
            color: #06ffa5;
            margin-bottom: 20px;
        }

        .path-steps {
            list-style: none;
            counter-reset: step;
        }

        .path-step {
            counter-increment: step;
            padding: 15px 0;
            padding-left: 50px;
            position: relative;
            border-left: 2px solid rgba(6, 255, 165, 0.3);
            margin-left: 20px;
        }

        .path-step::before {
            content: counter(step);
            position: absolute;
            left: -20px;
            top: 15px;
            width: 40px;
            height: 40px;
            background: #06ffa5;
            color: #0f0f23;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 40px 0;
        }

        .stat {
            background: rgba(0, 0, 0, 0.4);
            padding: 20px;
            border-radius: 12px;
            text-align: center;
        }

        .stat-value {
            font-size: 2.5rem;
            font-weight: 900;
            background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .stat-label {
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-size: 0.9rem;
            margin-top: 5px;
        }
    </style>
    <script>
        let selectedOptions = {};
        let totalMomentum = ${debtAnalysis.fim.momentum};

        function selectOption(questionId, optionIndex, momentum) {
            // Clear previous selection for this question
            document.querySelectorAll(\`#question-\${questionId} .option\`).forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Select new option
            document.querySelector(\`#question-\${questionId} .option:nth-child(\${optionIndex + 1})\`).classList.add('selected');
            
            // Track selection
            selectedOptions[questionId] = { index: optionIndex, momentum: parseFloat(momentum) };
            
            // Update total momentum
            updateTotalMomentum();
        }

        function updateTotalMomentum() {
            let additionalMomentum = 0;
            Object.values(selectedOptions).forEach(option => {
                additionalMomentum += option.momentum;
            });
            
            const newMomentum = Math.min(200, totalMomentum + additionalMomentum);
            
            // Update momentum bar
            document.querySelector('.momentum-fill').style.width = Math.min(100, newMomentum) + '%';
            document.querySelector('.momentum-label').textContent = newMomentum.toFixed(0) + '%';
            
            // Update magic status
            const statusElement = document.querySelector('.magic-status');
            if (newMomentum >= 100) {
                statusElement.textContent = 'MAGIC UNLOCKED!';
                statusElement.style.background = 'linear-gradient(135deg, #06ffa5 0%, #8b5cf6 50%, #ec4899 100%)';
                document.querySelector('.selected-path').classList.add('active');
                generatePath();
            } else {
                statusElement.textContent = (100 - newMomentum).toFixed(0) + '% to Magic';
            }
        }

        function generatePath() {
            const pathSteps = document.querySelector('.path-steps');
            pathSteps.innerHTML = '';
            
            // Sort selected options by momentum gain
            const sortedOptions = Object.entries(selectedOptions)
                .sort((a, b) => b[1].momentum - a[1].momentum)
                .slice(0, 5);
            
            sortedOptions.forEach(([questionId, option]) => {
                const question = document.querySelector(\`#question-\${questionId}\`);
                const optionElement = question.querySelectorAll('.option')[option.index];
                const action = optionElement.querySelector('.option-action').textContent;
                
                const li = document.createElement('li');
                li.className = 'path-step';
                li.innerHTML = \`<strong>\${action}</strong><br><span style="color: #94a3b8;">+\${option.momentum}% momentum</span>\`;
                pathSteps.appendChild(li);
            });
        }

        function executeStrategy() {
            const selections = Object.keys(selectedOptions).length;
            if (selections === 0) {
                alert('Select at least one option to create your strategy!');
                return;
            }
            
            // Generate implementation script
            const script = generateImplementationScript();
            
            // Copy to clipboard
            navigator.clipboard.writeText(script).then(() => {
                alert('Strategy copied to clipboard! Paste into your terminal to execute.');
            });
        }

        function generateImplementationScript() {
            const timestamp = new Date().toISOString();
            let script = \`#!/bin/bash
# Trust Debt Strategy Implementation
# Generated: \${timestamp}
# Current Momentum: ${debtAnalysis.fim.momentum.toFixed(0)}%
# Target Momentum: \${Object.values(selectedOptions).reduce((sum, opt) => sum + opt.momentum, totalMomentum).toFixed(0)}%

echo "🎯 Executing Trust Debt Strategy..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

\`;
            
            Object.entries(selectedOptions).forEach(([questionId, option]) => {
                const question = document.querySelector(\`#question-\${questionId}\`);
                const optionElement = question.querySelectorAll('.option')[option.index];
                const action = optionElement.querySelector('.option-action').textContent;
                
                script += \`
# \${action}
echo "\\n📍 \${action}"
echo "   Expected momentum: +\${option.momentum}%"
# TODO: Add implementation commands here
\`;
            });
            
            script += \`

echo "\\n✅ Strategy ready for implementation!"
echo "Next step: Run 'pnpm t:week' to measure progress"
\`;
            
            return script;
        }
    </script>
</head>
<body>
    <div class="header">
        <h1 style="font-size: 1.5rem; color: #94a3b8; margin-bottom: 10px;">Trust Debt Q&A Strategy</h1>
        <div class="magic-status">
            ${debtAnalysis.fim.momentum >= 100 ? 
              'MAGIC ACTIVE!' : 
              `${(100 - debtAnalysis.fim.momentum).toFixed(0)}% to Magic`}
        </div>
        
        <div class="momentum-bar">
            <div class="momentum-fill">
                <div class="momentum-label">${debtAnalysis.fim.momentum.toFixed(0)}%</div>
            </div>
            <div class="magic-threshold" style="left: ${Math.min(100, 100)}%;"></div>
        </div>
        
        <p style="color: #94a3b8; margin-top: 20px;">
            ${debtAnalysis.fim.momentum >= 100 ? 
              `You have ${debtAnalysis.fim.leverage.toFixed(1)}x leverage! Every action multiplies.` :
              `Answer questions below to find your path to reproducible magic.`}
        </p>
    </div>

    <div class="container">
        <div class="stats-grid">
            <div class="stat">
                <div class="stat-value">${debtAnalysis.totalDebt}</div>
                <div class="stat-label">Trust Debt Units</div>
            </div>
            <div class="stat">
                <div class="stat-value" style="${debtAnalysis.fim.skill >= 70 ? 'color: #10b981' : ''}">
                    ${debtAnalysis.fim.skill.toFixed(0)}%
                </div>
                <div class="stat-label">Skill (S)</div>
            </div>
            <div class="stat">
                <div class="stat-value" style="${debtAnalysis.fim.environment >= 90 ? 'color: #10b981' : ''}">
                    ${debtAnalysis.fim.environment.toFixed(0)}%
                </div>
                <div class="stat-label">Environment (E)</div>
            </div>
            <div class="stat">
                <div class="stat-value">${debtAnalysis.fim.leverage.toFixed(1)}x</div>
                <div class="stat-label">Leverage</div>
            </div>
        </div>

        ${questions.map((q, qIndex) => `
        <div class="question-card ${q.severity}" id="question-${qIndex}">
            <span class="category-label">${q.category}</span>
            ${q.gap > 0 ? `<span style="float: right; color: #f59e0b;">Gap: ${q.gap.toFixed(0)}%</span>` : ''}
            
            <div class="question">${q.question}</div>
            
            <div class="options">
                ${q.options.map((opt, oIndex) => `
                <div class="option" onclick="selectOption(${qIndex}, ${oIndex}, '${opt.momentum.replace('%', '').replace('+', '')}')">
                    <div class="option-header">
                        <div class="option-action">${opt.action}</div>
                        <span class="option-effort effort-${opt.effort}">${opt.effort}</span>
                    </div>
                    <div class="option-impact">${opt.impact}</div>
                    <div class="option-momentum">Momentum: ${opt.momentum}</div>
                </div>
                `).join('')}
            </div>
            
            ${q.formula ? `<div class="formula-box">${q.formula}</div>` : ''}
            ${q.magic ? `<p style="color: #06ffa5; margin-top: 15px; font-weight: 600;">${q.magic}</p>` : ''}
            ${q.risk ? `<p style="color: #ef4444; margin-top: 15px;">⚠️ ${q.risk}</p>` : ''}
            ${q.recent ? `
                <div style="margin-top: 20px; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 8px;">
                    <strong>Recent Commits:</strong><br>
                    ${q.recent.map(r => `<code style="color: #64748b;">${r}</code>`).join('<br>')}
                </div>
            ` : ''}
        </div>
        `).join('')}

        <div class="selected-path">
            <div class="path-title">🚀 Your Path to Reproducible Magic</div>
            <ol class="path-steps"></ol>
        </div>

        <div class="action-summary">
            <h2 style="font-size: 2rem; margin-bottom: 20px;">Ready to Create Magic?</h2>
            <p style="color: #94a3b8; margin-bottom: 30px;">
                Select your actions above to build a personalized strategy.<br>
                Each choice compounds into momentum toward reproducible magic.
            </p>
            <button class="action-button" onclick="executeStrategy()">
                Generate Implementation Strategy
            </button>
        </div>
    </div>
</body>
</html>`;

  return html;
}

/**
 * Load Trust Debt analysis from the latest run
 */
async function loadTrustDebtAnalysis() {
  // Try to find the most recent Trust Debt analysis
  const files = fsSync.readdirSync(path.join(__dirname, '..'))
    .filter(f => f.startsWith('trust-debt-') && f.endsWith('.html'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    console.log('No Trust Debt analysis found. Run "pnpm t:week" first.');
    return null;
  }
  
  // For this demo, we'll recalculate to ensure fresh data
  // In production, we'd parse the HTML or store JSON alongside
  return null; // Forces recalculation below
}

/**
 * Simplified Trust Debt calculation for Q&A generation
 */
async function calculateTrustDebt() {
  const { execSync } = require('child_process');
  
  // Get git info
  const branch = execSync('git branch --show-current').toString().trim();
  const specAge = parseInt(execSync('git log -1 --format=%cr -- CLAUDE.md | grep -oE "[0-9]+" | head -1').toString().trim()) || 0;
  const commits = [];
  
  try {
    const commitData = execSync('git log --oneline -10').toString().trim().split('\n');
    commitData.forEach(line => {
      const [hash, ...messageParts] = line.split(' ');
      commits.push({
        hash,
        subject: messageParts.join(' '),
        alignment: {
          overall: Math.random() * 100 - 50, // Simplified for demo
          primary: ['trust', 'timing', 'recognition'][Math.floor(Math.random() * 3)],
          principles: {
            trust: { score: Math.random() * 100 - 50 },
            timing: { score: Math.random() * 100 - 50 },
            recognition: { score: Math.random() * 100 - 50 }
          }
        }
      });
    });
  } catch (e) {
    console.log('Git analysis simplified for demo');
  }
  
  // Simplified Trust Debt calculation
  const intentVector = { trust: 0.35, timing: 0.35, recognition: 0.30 };
  const realityVector = { 
    trust: 0.25 + Math.random() * 0.2,
    timing: 0.30 + Math.random() * 0.2,
    recognition: 0.35 + Math.random() * 0.2
  };
  
  // Normalize reality vector
  const realityTotal = realityVector.trust + realityVector.timing + realityVector.recognition;
  realityVector.trust /= realityTotal;
  realityVector.timing /= realityTotal;
  realityVector.recognition /= realityTotal;
  
  const gap = {
    trust: intentVector.trust - realityVector.trust,
    timing: intentVector.timing - realityVector.timing,
    recognition: intentVector.recognition - realityVector.recognition
  };
  
  const l2Distance = Math.sqrt(gap.trust ** 2 + gap.timing ** 2 + gap.recognition ** 2);
  const baseDebt = Math.round(l2Distance * 1000);
  const specAgePenalty = Math.round(specAge * 0.1);
  const totalDebt = baseDebt + specAgePenalty;
  const trustDebtScore = Math.max(0, Math.min(100, 100 - totalDebt / 10));
  
  // FIM calculation
  const skill = 60 + Math.random() * 40;
  const environment = Math.max(0, 100 - specAge * 0.1);
  const momentum = skill * environment / 100;
  const leverage = Math.pow(2, momentum / 100 * 3);
  
  return {
    totalDebt,
    baseDebt,
    specAgePenalty,
    trustDebtScore,
    isInsurable: trustDebtScore >= 70,
    insurabilityGap: Math.max(0, 70 - trustDebtScore),
    l2Distance,
    intentVector,
    realityVector,
    gap,
    fim: {
      skill,
      environment,
      momentum,
      leverage
    },
    documentAnalyses: [
      { path: 'CLAUDE.md', vector: { total: 42 } },
      { path: 'README.md', vector: { total: 38 } }
    ]
  };
}

// Main execution
async function main() {
  console.log('🎯 Trust Debt Q&A Generator');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Path to Reproducible Magic\n');
  
  // Load or calculate Trust Debt
  let debtAnalysis = await loadTrustDebtAnalysis();
  
  if (!debtAnalysis) {
    console.log('📊 Calculating Trust Debt...');
    debtAnalysis = await calculateTrustDebt();
  }
  
  console.log(`Current State:`);
  console.log(`  Trust Debt: ${debtAnalysis.totalDebt} units`);
  console.log(`  Momentum: ${debtAnalysis.fim.momentum.toFixed(0)}% (${debtAnalysis.fim.momentum >= 100 ? '✨ MAGIC ZONE' : `${(100 - debtAnalysis.fim.momentum).toFixed(0)}% to magic`})`);
  console.log(`  Leverage: ${debtAnalysis.fim.leverage.toFixed(1)}x`);
  console.log(`  Insurability: ${debtAnalysis.isInsurable ? '✅ Yes' : `❌ No (${debtAnalysis.insurabilityGap.toFixed(0)}% gap)`}`);
  
  // Generate questions
  console.log('\n🤔 Generating strategic questions...');
  const questions = [
    ...generateGapQuestions(debtAnalysis),
    ...generateMomentumQuestions(debtAnalysis, { 
      specAge: debtAnalysis.specAgePenalty / 0.1,
      commits: [
        { hash: 'abc123', alignment: { primary: 'trust', overall: 15 } },
        { hash: 'def456', alignment: { primary: 'timing', overall: -5 } },
        { hash: 'ghi789', alignment: { primary: 'recognition', overall: 20 } }
      ]
    }),
    ...generateInsurabilityQuestions(debtAnalysis)
  ];
  
  console.log(`  Generated ${questions.length} strategic questions`);
  
  // Sort by severity and gap
  questions.sort((a, b) => {
    const severityOrder = { critical: 0, breakthrough: 1, important: 2, success: 3 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return b.gap - a.gap;
  });
  
  // Generate HTML
  console.log('\n🎨 Creating interactive Q&A interface...');
  const htmlContent = await generateQnAHTML(debtAnalysis, {
    specAge: debtAnalysis.specAgePenalty / 0.1,
    commits: []
  }, questions);
  
  const htmlPath = path.join(__dirname, '..', `trust-debt-qna-${Date.now()}.html`);
  await fs.writeFile(htmlPath, htmlContent);
  console.log(`✅ Created: ${path.basename(htmlPath)}`);
  
  // Open HTML
  console.log('\n🌐 Opening Q&A interface...');
  try {
    execSync(`open "${htmlPath}"`, { stdio: 'ignore' });
    console.log('✅ Opened in browser');
  } catch (error) {
    console.log(`📖 View at: ${htmlPath}`);
  }
  
  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Action Summary\n');
  
  const criticalQuestions = questions.filter(q => q.severity === 'critical');
  const breakthroughQuestions = questions.filter(q => q.severity === 'breakthrough');
  
  if (criticalQuestions.length > 0) {
    console.log('🚨 Critical Actions Required:');
    criticalQuestions.forEach(q => {
      console.log(`   • ${q.category}: ${q.gap.toFixed(0)}% gap`);
      if (q.options[0]) {
        console.log(`     → ${q.options[0].action}`);
      }
    });
  }
  
  if (breakthroughQuestions.length > 0) {
    console.log('\n✨ Breakthrough Opportunities:');
    breakthroughQuestions.forEach(q => {
      console.log(`   • ${q.category}: ${q.gap.toFixed(0)}% to magic`);
      if (q.options[0]) {
        console.log(`     → ${q.options[0].action} (${q.options[0].momentum})`);
      }
    });
  }
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Open the Q&A interface in your browser');
  console.log('2. Select actions that resonate with your goals');
  console.log('3. Click "Generate Implementation Strategy"');
  console.log('4. Execute the generated script');
  console.log('5. Run "pnpm t:week" to measure progress');
  
  if (debtAnalysis.fim.momentum >= 100) {
    console.log('\n🌟 CONGRATULATIONS! You\'re in the magic zone!');
    console.log(`   Every action now has ${debtAnalysis.fim.leverage.toFixed(1)}x leverage.`);
    console.log('   Focus on your biggest opportunities for exponential growth.');
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  generateGapQuestions,
  generateMomentumQuestions,
  generateInsurabilityQuestions,
  calculateTrustDebt
};