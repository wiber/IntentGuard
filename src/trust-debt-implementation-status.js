#!/usr/bin/env node

/**
 * Trust Debt Implementation Status
 * Shows progress on implementing the matrix-based MVP
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n🎯 Trust Debt MVP Implementation Status');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Check which components exist
const components = [
  {
    name: 'Settings Manager',
    file: 'scripts/trust-debt-settings-manager.js',
    config: 'trust-debt-settings.json',
    status: '✅',
    progress: 100
  },
  {
    name: 'Document Tracker',
    file: 'scripts/trust-debt-document-tracker.js',
    status: '✅',
    progress: 100
  },
  {
    name: 'ShortLex Extractor',
    file: 'scripts/trust-debt-shortlex-extractor.js',
    status: '⏳',
    progress: 0
  },
  {
    name: 'Matrix Generator',
    file: 'scripts/trust-debt-matrix-generator.js',
    status: '⏳',
    progress: 0
  },
  {
    name: 'Blank Spot Detector',
    file: 'scripts/trust-debt-blank-spot-detector.js',
    status: '⏳',
    progress: 0
  },
  {
    name: 'Weekly Aggregator',
    file: 'scripts/trust-debt-weekly-aggregator.js',
    status: '⏳',
    progress: 0
  },
  {
    name: 'Liability Calculator',
    file: 'scripts/trust-debt-liability-calculator.js',
    status: '⏳',
    progress: 0
  },
  {
    name: 'Matrix Visualizer',
    file: 'scripts/trust-debt-matrix-visualizer.js',
    status: '⏳',
    progress: 0
  }
];

// Check file existence
for (const component of components) {
  if (fs.existsSync(component.file)) {
    component.exists = true;
    if (component.progress === 0) {
      component.progress = 100;
      component.status = '✅';
    }
  } else {
    component.exists = false;
  }
  
  if (component.config && fs.existsSync(component.config)) {
    component.configExists = true;
  }
}

// Display status
console.log('\n📦 Component Status:\n');

for (const component of components) {
  const progressBar = '█'.repeat(Math.floor(component.progress / 10)) + 
                      '░'.repeat(10 - Math.floor(component.progress / 10));
  
  console.log(`${component.status} ${component.name.padEnd(20)} [${progressBar}] ${component.progress}%`);
  if (component.file) {
    console.log(`   File: ${component.exists ? '✓' : '✗'} ${component.file}`);
  }
  if (component.config) {
    console.log(`   Config: ${component.configExists ? '✓' : '✗'} ${component.config}`);
  }
}

// Calculate overall progress
const totalProgress = components.reduce((sum, c) => sum + c.progress, 0) / components.length;

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`\n📊 Overall Progress: ${totalProgress.toFixed(0)}%`);

const progressBar = '█'.repeat(Math.floor(totalProgress / 5)) + 
                    '░'.repeat(20 - Math.floor(totalProgress / 5));
console.log(`   [${progressBar}]`);

// Check integration status
console.log('\n🔗 Integration Status:\n');

const integrations = [
  {
    name: 'Post-commit hook exists',
    check: () => fs.existsSync('.husky/post-commit'),
    status: null
  },
  {
    name: 'Settings file configured',
    check: () => {
      if (fs.existsSync('trust-debt-settings.json')) {
        const settings = JSON.parse(fs.readFileSync('trust-debt-settings.json', 'utf8'));
        return settings.documents?.tracked && Object.keys(settings.documents.tracked).length > 0;
      }
      return false;
    },
    status: null
  },
  {
    name: 'Claude analyzer updated',
    check: () => {
      if (fs.existsSync('scripts/trust-debt-claude-analyzer.js')) {
        const content = fs.readFileSync('scripts/trust-debt-claude-analyzer.js', 'utf8');
        return content.includes('SettingsManager') && content.includes('DocumentTracker');
      }
      return false;
    },
    status: null
  },
  {
    name: 'Documents tracked',
    check: () => {
      if (fs.existsSync('trust-debt-settings.json')) {
        const settings = JSON.parse(fs.readFileSync('trust-debt-settings.json', 'utf8'));
        let validDocs = 0;
        for (const doc of Object.values(settings.documents?.tracked || {})) {
          if (fs.existsSync(doc.path)) validDocs++;
        }
        return validDocs >= 2;
      }
      return false;
    },
    status: null
  }
];

for (const integration of integrations) {
  integration.status = integration.check();
  console.log(`${integration.status ? '✅' : '❌'} ${integration.name}`);
}

// Next steps
console.log('\n📝 Next Steps:\n');

const nextSteps = [];

if (totalProgress < 30) {
  nextSteps.push('1. Continue implementing Step 3: ShortLex Category Extraction');
  nextSteps.push('2. Review documentation in docs/03-product/MVP/implementation/');
}

if (!components.find(c => c.name === 'ShortLex Extractor').exists) {
  nextSteps.push('• Create scripts/trust-debt-shortlex-extractor.js');
  nextSteps.push('• Implement category extraction from commits and docs');
  nextSteps.push('• Add Claude integration for orthogonality');
}

if (!components.find(c => c.name === 'Matrix Generator').exists) {
  nextSteps.push('• Create scripts/trust-debt-matrix-generator.js');
  nextSteps.push('• Implement weight calculation');
  nextSteps.push('• Build 2D trade-off matrix');
}

if (nextSteps.length === 0) {
  nextSteps.push('✅ All components implemented! Run integration tests.');
}

for (const step of nextSteps) {
  console.log(step);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Show sample commands
console.log('\n💻 Useful Commands:\n');
console.log('# Check settings and documents:');
console.log('node scripts/trust-debt-settings-manager.js --check');
console.log('\n# Test document analysis:');
console.log('node scripts/trust-debt-document-tracker.js');
console.log('\n# Run full analysis:');
console.log('node scripts/trust-debt-claude-analyzer.js');

console.log('\n✨ Keep implementing one step at a time!\n');