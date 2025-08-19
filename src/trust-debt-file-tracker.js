#!/usr/bin/env node

/**
 * Trust Debt File Tracker
 * Maps files to orthogonal dimensions for exact measurement
 * This is HOW we know what we're actually measuring
 */

const measurementPatterns = [
  // Core measurement infrastructure
  'scripts/trust-debt-analyzer.js',
  'scripts/trust-debt-claude-pipeline.js',
  'scripts/trust-debt-claude-categories.js',
  'trust-debt-settings.json',
  
  // Semantic analysis
  'src/lib/ai/semantic-*.js',
  'src/core/analysis/*.js',
  
  // Data collection
  'scripts/trust-debt-commit-analyzer.js',
  'data/trust-debt-history.json',
  '.trust-debt-cache/categories.json'
];

const visualizationPatterns = [
  // HTML generation
  'scripts/trust-debt-html-generator.js',
  'scripts/trust-debt-enhanced-html.js',
  'scripts/trust-debt-shortlex-generator.js',
  
  // React components
  'src/components/ShortLex*',
  'src/components/TrustDebt*',
  'src/app/trust-debt/*',
  '**/ShortLex*',
  
  // Reports
  'trust-debt-report*.html',
  
  // Dashboard pages
  'src/app/admin/dashboard/trust-debt/*'
];

const enforcementPatterns = [
  // Git hooks
  '.husky/pre-commit',
  '.husky/post-commit',
  '.husky/pre-push',
  
  // Hook scripts
  'scripts/*-hook.js',
  'scripts/trust-debt-enforcer.js',
  
  // API enforcement
  'src/app/api/enforce-*.ts',
  'src/app/api/trust-debt/enforce/*',
  
  // Blocking mechanisms
  'scripts/commit-blocker.js',
  '.github/workflows/trust-debt-*.yml'
];

/**
 * Calculate which dimension a file belongs to
 */
function categorizeFile(filepath) {
  // Normalize path
  const normalizedPath = filepath.replace(/\\/g, '/');
  
  // Check each category
  for (const pattern of measurementPatterns) {
    if (matchesPattern(normalizedPath, pattern)) {
      return 'measurement';
    }
  }
  
  for (const pattern of visualizationPatterns) {
    if (matchesPattern(normalizedPath, pattern)) {
      return 'visualization';
    }
  }
  
  for (const pattern of enforcementPatterns) {
    if (matchesPattern(normalizedPath, pattern)) {
      return 'enforcement';
    }
  }
  
  // Files not in our tracking don't affect Trust Debt
  return null;
}

/**
 * Check if file matches pattern (supports wildcards)
 */
function matchesPattern(filepath, pattern) {
  // Convert pattern to regex
  const regexPattern = pattern
    .replace(/\*\*/g, '.*')  // ** matches any path depth
    .replace(/\*/g, '[^/]*') // * matches within directory
    .replace(/\?/g, '.')
    .replace(/\//g, '\\/')
    .replace(/\./g, '\\.');
    
  const regex = new RegExp(regexPattern);
  return regex.test(filepath);
}

/**
 * Analyze a commit's impact on dimensions
 */
function analyzeCommitImpact(files) {
  const impact = {
    measurement: 0,
    visualization: 0,
    enforcement: 0,
    uncategorized: 0
  };
  
  for (const file of files) {
    const category = categorizeFile(file);
    if (category) {
      impact[category]++;
    } else {
      impact.uncategorized++;
    }
  }
  
  // Calculate percentages
  const total = files.length;
  if (total === 0) return impact;
  
  return {
    measurement: (impact.measurement / total) * 100,
    visualization: (impact.visualization / total) * 100,
    enforcement: (impact.enforcement / total) * 100,
    uncategorized: (impact.uncategorized / total) * 100,
    files: {
      measurement: files.filter(f => categorizeFile(f) === 'measurement'),
      visualization: files.filter(f => categorizeFile(f) === 'visualization'),
      enforcement: files.filter(f => categorizeFile(f) === 'enforcement'),
      uncategorized: files.filter(f => !categorizeFile(f))
    }
  };
}

/**
 * Get exact measurements for current state
 */
function getExactMeasurements(commits) {
  const totals = {
    measurement: 0,
    visualization: 0,
    enforcement: 0
  };
  
  let totalFiles = 0;
  
  for (const commit of commits) {
    if (!commit.files) continue;
    
    for (const file of commit.files) {
      const category = categorizeFile(file);
      if (category) {
        totals[category]++;
        totalFiles++;
      }
    }
  }
  
  // Calculate exact percentages
  if (totalFiles === 0) {
    return {
      measurement: 0.333,
      visualization: 0.333,
      enforcement: 0.334,
      multiplicative: 0.0366
    };
  }
  
  const percentages = {
    measurement: totals.measurement / totalFiles,
    visualization: totals.visualization / totalFiles,
    enforcement: totals.enforcement / totalFiles
  };
  
  // Calculate multiplicative effectiveness
  const multiplicative = percentages.measurement * 
                        percentages.visualization * 
                        percentages.enforcement;
  
  return {
    ...percentages,
    multiplicative,
    totals,
    totalFiles
  };
}

/**
 * Predict impact of a potential commit
 */
function predictCommitImpact(files, currentMeasurements) {
  const newImpact = analyzeCommitImpact(files);
  
  // Calculate new percentages after this commit
  const totalFiles = currentMeasurements.totalFiles + files.length;
  
  const newMeasurements = {
    measurement: ((currentMeasurements.totals.measurement + 
                  newImpact.files.measurement.length) / totalFiles),
    visualization: ((currentMeasurements.totals.visualization + 
                    newImpact.files.visualization.length) / totalFiles),
    enforcement: ((currentMeasurements.totals.enforcement + 
                  newImpact.files.enforcement.length) / totalFiles)
  };
  
  const newMultiplicative = newMeasurements.measurement * 
                           newMeasurements.visualization * 
                           newMeasurements.enforcement;
  
  const oldMultiplicative = currentMeasurements.multiplicative;
  
  return {
    before: {
      ...currentMeasurements,
      effectiveness: (oldMultiplicative * 100).toFixed(1) + '%'
    },
    after: {
      ...newMeasurements,
      multiplicative: newMultiplicative,
      effectiveness: (newMultiplicative * 100).toFixed(1) + '%'
    },
    impact: {
      measurement: newMeasurements.measurement - currentMeasurements.measurement,
      visualization: newMeasurements.visualization - currentMeasurements.visualization,
      enforcement: newMeasurements.enforcement - currentMeasurements.enforcement,
      multiplicative: newMultiplicative - oldMultiplicative,
      effectivenessChange: ((newMultiplicative - oldMultiplicative) * 100).toFixed(1) + '%'
    },
    recommendation: getRecommendation(currentMeasurements, newMeasurements)
  };
}

/**
 * Get recommendation based on impact
 */
function getRecommendation(current, predicted) {
  const ideal = 0.333;
  
  // Find which dimension is most out of balance
  const gaps = {
    measurement: Math.abs(current.measurement - ideal),
    visualization: Math.abs(current.visualization - ideal),
    enforcement: Math.abs(current.enforcement - ideal)
  };
  
  const weakest = Object.entries(gaps)
    .sort(([,a], [,b]) => b - a)[0][0];
  
  // Check if this commit helps the weakest dimension
  const helpsWeakest = predicted[weakest] > current[weakest];
  
  if (helpsWeakest) {
    return {
      verdict: 'GOOD',
      message: `This commit strengthens your weakest dimension (${weakest})`,
      trustDebtImpact: -Math.floor(gaps[weakest] * 30),
      color: 'green'
    };
  } else if (predicted.multiplicative > current.multiplicative) {
    return {
      verdict: 'OK',
      message: 'Improves overall effectiveness but not addressing weakest link',
      trustDebtImpact: -Math.floor(predicted.multiplicative * 10),
      color: 'yellow'
    };
  } else {
    return {
      verdict: 'BAD',
      message: `Makes ${weakest} dimension even weaker. Fix that first!`,
      trustDebtImpact: Math.floor(gaps[weakest] * 20),
      color: 'red'
    };
  }
}

// Export for use in other modules
module.exports = {
  categorizeFile,
  analyzeCommitImpact,
  getExactMeasurements,
  predictCommitImpact,
  measurementPatterns,
  visualizationPatterns,
  enforcementPatterns
};

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === 'check') {
    // Check which category a file belongs to
    const file = args[1];
    const category = categorizeFile(file);
    console.log(`File: ${file}`);
    console.log(`Category: ${category || 'uncategorized'}`);
    
  } else if (args[0] === 'predict') {
    // Predict impact of files
    const files = args.slice(1);
    
    // Get current measurements (mock data for CLI demo)
    const current = {
      measurement: 0.446,
      visualization: 0.279,
      enforcement: 0.275,
      multiplicative: 0.0342,
      totals: {
        measurement: 45,
        visualization: 28,
        enforcement: 27
      },
      totalFiles: 100
    };
    
    const prediction = predictCommitImpact(files, current);
    
    console.log('\n📊 COMMIT IMPACT PREDICTION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\nFiles to commit:');
    files.forEach(f => {
      const cat = categorizeFile(f);
      console.log(`  ${cat ? '✓' : '✗'} ${f} ${cat ? `(${cat})` : '(uncategorized)'}`);
    });
    
    console.log('\n📈 Before:');
    console.log(`  Effectiveness: ${prediction.before.effectiveness}`);
    console.log(`  M: ${(prediction.before.measurement * 100).toFixed(1)}%`);
    console.log(`  V: ${(prediction.before.visualization * 100).toFixed(1)}%`);
    console.log(`  E: ${(prediction.before.enforcement * 100).toFixed(1)}%`);
    
    console.log('\n📊 After:');
    console.log(`  Effectiveness: ${prediction.after.effectiveness}`);
    console.log(`  M: ${(prediction.after.measurement * 100).toFixed(1)}%`);
    console.log(`  V: ${(prediction.after.visualization * 100).toFixed(1)}%`);
    console.log(`  E: ${(prediction.after.enforcement * 100).toFixed(1)}%`);
    
    console.log('\n🎯 Impact:');
    console.log(`  Effectiveness change: ${prediction.impact.effectivenessChange}`);
    console.log(`  Trust Debt impact: ${prediction.recommendation.trustDebtImpact} units`);
    
    console.log('\n💡 Recommendation:');
    console.log(`  ${prediction.recommendation.verdict}: ${prediction.recommendation.message}`);
    
  } else {
    console.log('Usage:');
    console.log('  node trust-debt-file-tracker.js check <file>');
    console.log('  node trust-debt-file-tracker.js predict <file1> [file2] ...');
  }
}