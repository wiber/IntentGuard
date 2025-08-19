#!/usr/bin/env node

/**
 * Enhanced Trust Debt Analyzer with ShortLex Categorization
 * Uses 1D hierarchical structure for alignment measurement
 */

const fs = require('fs').promises;
const path = require('path');

// ShortLex 1D Hierarchy of Principles
// Each principle has weight and sub-categories
const SHORTLEX_PRINCIPLES = {
  'A': {
    name: 'Strategic Nudges Pattern',
    weight: 0.25,
    description: 'One question, 30 seconds, 30% acceleration',
    subcategories: {
      'A1': {
        name: 'Timing Precision',
        indicators: ['perfect timing', '30 seconds', 'precise moment', 'strategic timing'],
        antipatterns: ['spam', 'bulk', 'random timing', 'whenever']
      },
      'A2': {
        name: 'Question Quality', 
        indicators: ['one question', 'breakthrough question', 'strategic question'],
        antipatterns: ['multiple questions', 'generic questions', 'surveys']
      },
      'A3': {
        name: 'Acceleration Claim',
        indicators: ['30% acceleration', '30% faster', 'accelerate goals'],
        antipatterns: ['vague improvement', 'maybe helpful', 'could help']
      }
    }
  },
  'B': {
    name: 'Trust Debt Measurement',
    weight: 0.25,
    description: 'Making invisible organizational drift visible and measurable',
    subcategories: {
      'B1': {
        name: 'Quantification',
        indicators: ['measurable', 'quantified', 'score', 'metrics', '73/100'],
        antipatterns: ['fuzzy', 'qualitative', 'feeling', 'sense']
      },
      'B2': {
        name: 'Drift Detection',
        indicators: ['drift', 'divergence', 'gap', 'misalignment'],
        antipatterns: ['stable', 'consistent', 'aligned', 'on track']
      },
      'B3': {
        name: 'Visibility',
        indicators: ['visible', 'revealed', 'exposed', 'discovered'],
        antipatterns: ['hidden', 'unknown', 'mysterious', 'unclear']
      }
    }
  },
  'C': {
    name: 'Pattern Recognition & Naming',
    weight: 0.20,
    description: 'Name the unnameable patterns people feel',
    subcategories: {
      'C1': {
        name: 'Memorable Names',
        indicators: ['thursday panic', 'feature decay', 'named pattern', 'the X pattern'],
        antipatterns: ['pattern 1', 'issue A', 'problem', 'thing']
      },
      'C2': {
        name: 'Recognition Triggers',
        indicators: ['oh moment', 'that\'s it', 'exactly', 'recognition'],
        antipatterns: ['explanation', 'definition', 'theory', 'concept']
      },
      'C3': {
        name: 'Cost Articulation',
        indicators: ['costs X hours', 'wastes Y%', 'loses $Z', 'specific impact'],
        antipatterns: ['some impact', 'affects things', 'causes issues']
      }
    }
  },
  'D': {
    name: 'Oh Moment Creation',
    weight: 0.15,
    description: 'Daily breakthrough insights through recognition not teaching',
    subcategories: {
      'D1': {
        name: 'Recognition Over Teaching',
        indicators: ['remember when', 'you know when', 'that moment when'],
        antipatterns: ['let me explain', 'here\'s how', 'the theory is']
      },
      'D2': {
        name: 'Daily Cadence',
        indicators: ['daily', 'every day', 'one per day', 'daily oh moment'],
        antipatterns: ['sometimes', 'occasionally', 'when needed']
      },
      'D3': {
        name: 'Breakthrough Quality',
        indicators: ['breakthrough', 'insight', 'revelation', 'aha'],
        antipatterns: ['minor', 'small', 'incremental', 'gradual']
      }
    }
  },
  'E': {
    name: 'FIM Precision Claim',
    weight: 0.15,
    description: '361x precision improvement through geometric alignment',
    subcategories: {
      'E1': {
        name: 'Precision Focus',
        indicators: ['361x precision', 'geometric alignment', 'exact', 'precise'],
        antipatterns: ['361x faster', '361x speed', 'quick', 'rapid']
      },
      'E2': {
        name: 'Mathematical Grounding',
        indicators: ['mathematical', 'geometric', 'calculated', 'formulaic'],
        antipatterns: ['intuitive', 'feeling-based', 'approximate', 'rough']
      },
      'E3': {
        name: 'Reproducibility',
        indicators: ['reproducible', 'consistent', 'reliable', 'systematic'],
        antipatterns: ['random', 'unpredictable', 'varies', 'inconsistent']
      }
    }
  }
};

class EnhancedTrustDebtAnalyzer {
  
  analyzeWithShortLex(content) {
    const analysis = {
      timestamp: new Date().toISOString(),
      shortlexScores: {},
      categoryAlignment: {},
      overallTrustDebt: 0,
      detailedPrompts: [],
      patterns: []
    };

    // Analyze each ShortLex category
    for (const [key, principle] of Object.entries(SHORTLEX_PRINCIPLES)) {
      const principleAnalysis = {
        name: principle.name,
        weight: principle.weight,
        subcategories: {},
        averageScore: 0
      };

      // Analyze subcategories
      for (const [subKey, subCategory] of Object.entries(principle.subcategories)) {
        const score = this.calculateSubcategoryScore(content, subCategory);
        principleAnalysis.subcategories[subKey] = {
          name: subCategory.name,
          score,
          alignment: this.getAlignmentLevel(score)
        };
      }

      // Calculate average for principle
      const subScores = Object.values(principleAnalysis.subcategories).map(s => s.score);
      principleAnalysis.averageScore = Math.round(
        subScores.reduce((a, b) => a + b, 0) / subScores.length
      );

      analysis.shortlexScores[key] = principleAnalysis;
    }

    // Calculate overall Trust Debt
    analysis.overallTrustDebt = this.calculateOverallTrustDebt(analysis.shortlexScores);
    
    // Generate detailed prompts
    analysis.detailedPrompts = this.generateDetailedPrompts(analysis);
    
    // Identify patterns
    analysis.patterns = this.identifyDetailedPatterns(analysis);

    return analysis;
  }

  calculateSubcategoryScore(content, subCategory) {
    const lowerContent = content.toLowerCase();
    let positiveHits = 0;
    let negativeHits = 0;

    // Count positive indicators
    subCategory.indicators.forEach(indicator => {
      const regex = new RegExp(indicator, 'gi');
      const matches = lowerContent.match(regex);
      if (matches) positiveHits += matches.length;
    });

    // Count negative indicators (antipatterns)
    subCategory.antipatterns.forEach(antipattern => {
      const regex = new RegExp(antipattern, 'gi');
      const matches = lowerContent.match(regex);
      if (matches) negativeHits += matches.length;
    });

    // Calculate score
    if (positiveHits + negativeHits === 0) return 50;
    
    const score = Math.round((positiveHits / (positiveHits + negativeHits)) * 100);
    return Math.max(0, Math.min(100, score));
  }

  getAlignmentLevel(score) {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 55) return 'Moderate';
    if (score >= 40) return 'Poor';
    return 'Critical';
  }

  calculateOverallTrustDebt(shortlexScores) {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const [key, data] of Object.entries(shortlexScores)) {
      weightedSum += data.averageScore * data.weight;
      totalWeight += data.weight;
    }

    return Math.round(weightedSum / totalWeight);
  }

  generateDetailedPrompts(analysis) {
    const prompts = [];
    
    // For each principle with low score, generate improvement prompt
    for (const [key, data] of Object.entries(analysis.shortlexScores)) {
      if (data.averageScore < 70) {
        const prompt = this.createImprovementPrompt(key, data);
        prompts.push(prompt);
      }
    }

    // Add overall improvement prompt
    prompts.push(this.createOverallPrompt(analysis));

    return prompts;
  }

  createImprovementPrompt(key, data) {
    const worstSubcategory = Object.entries(data.subcategories)
      .sort((a, b) => a[1].score - b[1].score)[0];

    return {
      category: key,
      principle: data.name,
      focus: worstSubcategory[1].name,
      score: worstSubcategory[1].score,
      prompt: `
# Improvement Needed: ${data.name}

## Current State
- Category ${key} Score: ${data.averageScore}/100
- Weakest Area: ${worstSubcategory[1].name} (${worstSubcategory[1].score}/100)
- Weight in Overall Score: ${(data.weight * 100).toFixed(0)}%

## Specific Improvements Required

### For ${worstSubcategory[1].name}:
${this.getSpecificImprovements(key, worstSubcategory[0], worstSubcategory[1])}

## Example Transformation

### Before (Current):
"${this.generateBadExample(key, worstSubcategory[0])}"

### After (Improved):
"${this.generateGoodExample(key, worstSubcategory[0])}"

## Validation Checklist
${this.generateValidationChecklist(key, worstSubcategory[0])}
      `.trim()
    };
  }

  getSpecificImprovements(category, subcategory, data) {
    const improvements = {
      'A1': `
1. Replace vague timing with specific "30-second" claims
2. Add "perfect timing" language to all nudge descriptions
3. Remove any bulk/mass messaging references
4. Emphasize strategic moment selection`,
      'A2': `
1. Focus on "one breakthrough question" not multiple
2. Make questions more strategic and targeted
3. Remove generic question formats
4. Add specificity to each question's purpose`,
      'A3': `
1. Always include "30% acceleration" claim
2. Quantify improvements specifically
3. Remove vague "could help" language
4. Add measurable outcomes`,
      'B1': `
1. Add specific Trust Debt scores (e.g., "73/100")
2. Include quantified metrics in all examples
3. Replace qualitative descriptions with numbers
4. Show measurement methodology`,
      'B2': `
1. Explicitly mention "drift" in content
2. Show gap between intent and reality
3. Add divergence percentages
4. Include misalignment examples`,
      'B3': `
1. Use "revealed" and "visible" language
2. Show before/after visibility
3. Remove mystery, add clarity
4. Include discovery moments`,
      'C1': `
1. Create memorable pattern names like "Thursday Panic"
2. Replace generic labels with specific names
3. Make patterns story-worthy
4. Add alliteration or rhythm to names`,
      'C2': `
1. Add "oh moment" triggers throughout
2. Use "that's exactly it" confirmations
3. Replace explanations with recognitions
4. Include "you know when..." setups`,
      'C3': `
1. Quantify costs: "12 hours/week wasted"
2. Add dollar amounts: "$50K/month lost"
3. Show specific impact metrics
4. Remove vague impact statements`,
      'D1': `
1. Start with "Remember when..." not "Let me explain..."
2. Trigger recognition, don't teach
3. Use experiential language
4. Reference shared experiences`,
      'D2': `
1. Emphasize "daily" oh moments
2. Add daily cadence references
3. Show consistent daily value
4. Remove "sometimes" language`,
      'D3': `
1. Use "breakthrough" and "revelation" language
2. Emphasize transformation not improvement
3. Show dramatic shifts
4. Remove incremental progress references`,
      'E1': `
1. Clarify "361x precision" not speed
2. Focus on alignment accuracy
3. Remove speed/efficiency claims
4. Add geometric precision language`,
      'E2': `
1. Include mathematical formulas
2. Show geometric relationships
3. Add calculated examples
4. Remove intuitive descriptions`,
      'E3': `
1. Emphasize reproducibility
2. Show consistent results
3. Add reliability metrics
4. Remove variability references`
    };

    return improvements[subcategory] || '1. Improve alignment with principle indicators';
  }

  generateBadExample(category, subcategory) {
    const badExamples = {
      'A1': "We'll send you helpful tips when we can.",
      'A2': "Here's a survey with multiple questions about your goals.",
      'A3': "This might help you improve somewhat.",
      'B1': "We have a feeling there's some misalignment.",
      'B2': "Things seem pretty stable and on track.",
      'B3': "There might be hidden issues we don't know about.",
      'C1': "We found problem type 3 in your workflow.",
      'C2': "Let me explain this complex framework to you.",
      'C3': "This pattern has some impact on productivity.",
      'D1': "Here's how the theory works...",
      'D2': "We'll send insights when appropriate.",
      'D3': "Small incremental improvements over time.",
      'E1': "Our system is 361x faster than alternatives.",
      'E2': "Based on our intuitive understanding...",
      'E3': "Results may vary depending on conditions."
    };

    return badExamples[subcategory] || "Generic content without principle alignment";
  }

  generateGoodExample(category, subcategory) {
    const goodExamples = {
      'A1': "One strategic question, delivered in 30 seconds at your moment of maximum receptivity.",
      'A2': "The one breakthrough question that accelerates your specific goal by 30%.",
      'A3': "Guaranteed 30% acceleration toward your goal, measurable from day one.",
      'B1': "Your Trust Debt Score: 73/100, with 0.3% daily drift accumulation.",
      'B2': "47% drift detected between your stated values and actual outputs.",
      'B3': "We revealed the Thursday Panic Pattern costing you 12 hours weekly.",
      'C1': "The 'Thursday Panic Pattern' - that weekly scramble before Friday deadlines.",
      'C2': "You know that moment when everything clicks? That's what we engineer.",
      'C3': "This pattern costs you $47K annually in lost productivity.",
      'D1': "Remember yesterday at 3pm when you had that breakthrough? We triggered it.",
      'D2': "One oh moment daily - your consistent breakthrough cadence.",
      'D3': "Today's breakthrough: You discovered your hidden 10x leverage point.",
      'E1': "361x precision in semantic alignment - not speed, but accuracy.",
      'E2': "Geometric alignment formula: Trust = Intent × Reality² / Drift",
      'E3': "73% reproducible genius capture, consistent across 1000+ sessions."
    };

    return goodExamples[subcategory] || "Perfectly aligned content with principle";
  }

  generateValidationChecklist(category, subcategory) {
    return `
- [ ] Contains positive indicators for ${subcategory}
- [ ] Avoids antipatterns completely
- [ ] Aligns with ${SHORTLEX_PRINCIPLES[category].name}
- [ ] Maintains ${(SHORTLEX_PRINCIPLES[category].weight * 100).toFixed(0)}% weight importance
- [ ] Creates recognition not explanation
- [ ] Quantifies impact specifically
- [ ] Uses memorable language
    `.trim();
  }

  createOverallPrompt(analysis) {
    return {
      category: 'OVERALL',
      principle: 'Complete Trust Debt Alignment',
      focus: 'System-wide coherence',
      score: analysis.overallTrustDebt,
      prompt: `
# Overall Trust Debt Alignment Analysis

## Current Trust Debt Score: ${analysis.overallTrustDebt}/100

## ShortLex Category Breakdown
${Object.entries(analysis.shortlexScores)
  .map(([key, data]) => `
### ${key}. ${data.name} (Weight: ${(data.weight * 100).toFixed(0)}%)
- Score: ${data.averageScore}/100
- Status: ${this.getAlignmentLevel(data.averageScore)}
${Object.entries(data.subcategories)
  .map(([subKey, subData]) => `  - ${subKey}: ${subData.name} = ${subData.score}/100 (${subData.alignment})`)
  .join('\n')}`)
  .join('\n')}

## Priority Improvements (Sorted by Impact)
${this.generatePriorityList(analysis)}

## Specific Action Items
${this.generateActionItems(analysis)}

## Copy-Paste Templates
${this.generateTemplates(analysis)}

## Measurement & Verification
After implementing improvements, re-run analysis to verify:
- Target Score: ${Math.min(100, analysis.overallTrustDebt + 15)}/100
- Must improve: ${Object.entries(analysis.shortlexScores)
  .filter(([k, d]) => d.averageScore < 70)
  .map(([k, d]) => d.name)
  .join(', ')}
      `.trim()
    };
  }

  generatePriorityList(analysis) {
    const priorities = [];
    
    for (const [key, data] of Object.entries(analysis.shortlexScores)) {
      const impact = (100 - data.averageScore) * data.weight;
      priorities.push({
        category: key,
        name: data.name,
        score: data.averageScore,
        weight: data.weight,
        impact
      });
    }

    return priorities
      .sort((a, b) => b.impact - a.impact)
      .map((p, i) => `${i + 1}. **${p.name}** (Current: ${p.score}/100, Impact: ${p.impact.toFixed(1)} points)`)
      .join('\n');
  }

  generateActionItems(analysis) {
    const actions = [];
    
    for (const [key, data] of Object.entries(analysis.shortlexScores)) {
      if (data.averageScore < 85) {
        const worstSub = Object.entries(data.subcategories)
          .sort((a, b) => a[1].score - b[1].score)[0];
        
        actions.push(`- [ ] Fix ${data.name} > ${worstSub[1].name} (boost from ${worstSub[1].score} to 85+)`);
      }
    }

    return actions.join('\n');
  }

  generateTemplates(analysis) {
    return `
### Strategic Nudge Template:
"One breakthrough question, delivered in 30 seconds at your moment of maximum receptivity, accelerating your goal by 30%."

### Trust Debt Score Template:
"Your Trust Debt Score: [X]/100. Daily drift: 0.3%. Pattern detected: [Named Pattern] costing [specific cost]."

### Pattern Recognition Template:
"The '[Memorable Name] Pattern' - you know, that [specific situation] that costs you [quantified impact]."

### Oh Moment Template:
"Remember [specific moment]? That breakthrough wasn't random. We triggered it with precision timing."

### FIM Precision Template:
"361x precision improvement - not in speed, but in semantic alignment accuracy. Geometric, measurable, reproducible."
    `.trim();
  }

  identifyDetailedPatterns(analysis) {
    const patterns = [];
    
    // Check for specific drift patterns
    const lowScoreCount = Object.values(analysis.shortlexScores)
      .filter(d => d.averageScore < 60).length;
    
    if (lowScoreCount > 2) {
      patterns.push({
        name: 'The Coherence Collapse',
        description: `${lowScoreCount} core principles below 60% alignment`,
        cost: 'Complete message incoherence',
        severity: 'CRITICAL'
      });
    }

    // Check for category-specific patterns
    if (analysis.shortlexScores['A']?.averageScore < 60) {
      patterns.push({
        name: 'The Nudge Confusion',
        description: 'Strategic Nudge principle severely misaligned',
        cost: 'Core value proposition unclear',
        severity: 'HIGH'
      });
    }

    if (analysis.shortlexScores['B']?.averageScore < 60) {
      patterns.push({
        name: 'The Measurement Void',
        description: 'Trust Debt quantification missing',
        cost: 'Cannot prove value claims',
        severity: 'HIGH'
      });
    }

    // Check for imbalance
    const scores = Object.values(analysis.shortlexScores).map(d => d.averageScore);
    const variance = this.calculateVariance(scores);
    
    if (variance > 400) {
      patterns.push({
        name: 'The Principle Imbalance',
        description: 'Huge variance between principle alignments',
        cost: 'Inconsistent messaging',
        severity: 'MEDIUM'
      });
    }

    return patterns;
  }

  calculateVariance(scores) {
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const squaredDiffs = scores.map(s => Math.pow(s - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / scores.length;
  }
}

module.exports = { EnhancedTrustDebtAnalyzer, SHORTLEX_PRINCIPLES };