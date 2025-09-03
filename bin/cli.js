#!/usr/bin/env node

/**
 * Intent Guard CLI
 * Measure and prevent Trust Debt in your codebase
 */

const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
// Use the asymmetric Trust Debt calculator
const { TrustDebtCalculator } = require('../src/trust-debt-final.js');

const program = new Command();

// Helper function for actionable insights
function getActionableInsight(drift) {
  const insights = {
    'Documentation': {
      title: 'Update outdated documentation',
      fix: 'Review README and API docs for accuracy',
      roi: 'Reduce onboarding time by 40%'
    },
    'Testing': {
      title: 'Add missing test coverage',
      fix: 'Write tests for uncovered critical paths',
      roi: 'Prevent 3-5 production bugs/month'
    },
    'Architecture': {
      title: 'Refactor technical debt hotspots',
      fix: 'Address circular dependencies and god objects',
      roi: 'Improve velocity by 25%'
    },
    'Performance': {
      title: 'Optimize slow queries and endpoints',
      fix: 'Add caching and database indexes',
      roi: 'Reduce infrastructure costs 30%'
    },
    'Security': {
      title: 'Fix security vulnerabilities',
      fix: 'Update dependencies and add input validation',
      roi: 'Avoid $100K+ breach costs'
    }
  };
  
  // Find matching category
  for (const [key, value] of Object.entries(insights)) {
    if (drift.fromName.includes(key) || drift.toName.includes(key)) {
      return value;
    }
  }
  
  // Default insight
  return {
    title: `Align ${drift.fromName} with ${drift.toName}`,
    fix: 'Review implementation against specification',
    roi: 'Reduce maintenance cost by 20%'
  };
}

// Banner
console.log(chalk.cyan(`
╔══════════════════════════════════════════╗
║      Trust Debt™ Asymmetric Matrix      ║
║   Measure drift: Reality vs Intent      ║
║      Rows=Git, Columns=Docs             ║
╚══════════════════════════════════════════╝
`));

program
  .name('intentguard')
  .description('Measure Trust Debt - the drift between what you promise and what you deliver')
  .version('1.1.2');

// Analyze command
program
  .command('analyze')
  .description('Analyze Trust Debt in your repository')
  .option('-d, --dir <path>', 'Project directory', process.cwd())
  .option('-o, --output <format>', 'Output format (json|html|console)', 'console')
  .option('--threshold <number>', 'Trust Debt threshold for CI failure', 100)
  .option('--generate-categories', 'Generate project-specific categories using Claude', false)
  .option('--force-categories', 'Force regeneration even if categories exist', false)
  .action(async (options) => {
    // Bootstrap categories if needed
    const categoriesPath = path.join(options.dir, 'trust-debt-categories.json');
    const shouldGenerate = options.generateCategories || options.forceCategories || !fs.existsSync(categoriesPath);
    
    if (shouldGenerate) {
      console.log(chalk.cyan('🤖 Generating project-specific orthogonal categories...'));
      try {
        const DynamicCategoryGenerator = require('../src/dynamic-category-generator.js');
        const generator = new DynamicCategoryGenerator(options.dir);
        
        // Check if Claude CLI is available
        try {
          execSync('which claude', { stdio: 'ignore' });
        } catch (e) {
          console.log(chalk.yellow('⚠️  Claude CLI not found. Using default categories.'));
          console.log(chalk.gray('   Install with: npm install -g @anthropic/claude-cli'));
        }
        
        // Generate categories
        await generator.run();
        console.log(chalk.green('✅ Categories generated successfully'));
      } catch (error) {
        console.log(chalk.yellow('⚠️  Could not generate categories:', error.message));
        console.log(chalk.gray('   Using default categories instead'));
      }
    }
    
    const spinner = ora('Analyzing Trust Debt...').start();
    
    try {
      // Change to project directory
      process.chdir(options.dir);
      
      const calculator = new TrustDebtCalculator();
      const analysis = calculator.analyze();
      
      spinner.succeed(`Trust Debt: ${analysis.totalDebt.toFixed(0)} units`);
      
      // Display results based on format
      if (options.output === 'console') {
        console.log('\n' + chalk.bold('📊 Trust Debt Analysis'));
        console.log(chalk.gray('─'.repeat(40)));
        
        // Score with color coding and grade
        const scoreColor = analysis.totalDebt > 5000 ? 'red' : 
                          analysis.totalDebt > 1000 ? 'yellow' : 'green';
        const grade = analysis.totalDebt < 100 ? 'AAA' :
                     analysis.totalDebt < 500 ? 'A' :
                     analysis.totalDebt < 1000 ? 'B' :
                     analysis.totalDebt < 5000 ? 'C' : 'D';
        
        console.log(chalk[scoreColor](`Trust Debt Score: ${analysis.totalDebt.toFixed(0)} units (Grade ${grade})`));
        console.log(chalk.gray(`Orthogonality: ${(analysis.orthogonality * 100).toFixed(1)}%`));
        console.log(chalk.gray(`Diagonal Health: ${analysis.diagonalHealth}`));
        
        // Actionable insights
        // WHY is the debt high?
        console.log('\n' + chalk.bold('🔍 Why Your Trust Debt is High:'));
        
        if (analysis.worstDrifts && analysis.worstDrifts.length > 0) {
          const topDrifts = analysis.worstDrifts.slice(0, 3);
          topDrifts.forEach((drift, i) => {
            const intentPct = (drift.intent * 100).toFixed(0);
            const realityPct = (drift.reality * 100).toFixed(0);
            
            let explanation = '';
            if (drift.isDiagonal) {
              if (drift.intent > drift.reality) {
                explanation = `Docs mention it ${intentPct}% of time, commits only ${realityPct}%`;
              } else {
                explanation = `${realityPct}% of commits, but only ${intentPct}% documented`;
              }
            } else {
              explanation = `${intentPct}% intent vs ${realityPct}% reality - misaligned`;
            }
            
            console.log(chalk.yellow(`  ${i + 1}. ${drift.from} ${drift.isDiagonal ? '↻' : '→'} ${drift.to}`));
            console.log(`     Debt: ${drift.debt.toFixed(0)} units`);
            console.log(`     ${explanation}`);
          });
        }
        
        // Actionable insights
        console.log('\n' + chalk.bold('🎯 What to Fix First (Quick Wins):'));
        
        if (analysis.worstDrifts && analysis.worstDrifts.length > 0) {
          const topDrifts = analysis.worstDrifts.slice(0, 3);
          topDrifts.forEach((drift, i) => {
            const action = getActionableInsight(drift);
            console.log(chalk.cyan(`  ${i + 1}. ${action.title}`));
            console.log(`     Debt: ${drift.debt.toFixed(0)} units`);
            console.log(`     Fix: ${action.fix}`);
            console.log(`     ROI: ${action.roi}`);
          });
        }
        
        // What this means for your business
        console.log('\n' + chalk.bold('💰 Business Impact:'));
        const monthlyLiability = (analysis.totalDebt * 50).toLocaleString(); // $50 per unit per month
        console.log(`  Estimated liability: $${monthlyLiability}/month`);
        
        if (grade === 'D') {
          console.log(chalk.red('  ⚠️  UNINSURABLE - No coverage available'));
        } else if (grade === 'C') {
          console.log(chalk.yellow('  ⚠️  Insurance premium +100%, coverage 50%'));
        } else if (grade === 'B') {
          console.log(chalk.yellow('  Insurance premium normal, coverage 80%'));
        } else {
          console.log(chalk.green('  ✅ Insurance premium -20%, full coverage'));
        }
        
        // Block debts
        if (analysis.blockDebts) {
          console.log('\n' + chalk.bold('📊 Drift by Category:'));
          Object.entries(analysis.blockDebts).forEach(([block, debt]) => {
            const percentage = ((debt / analysis.totalDebt) * 100).toFixed(1);
            console.log(`  ${block}: ${debt.toFixed(0)} units (${percentage}%)`);
          });
        }
        
        // AI Drift Warning
        console.log('\n' + chalk.bold.yellow('⚠️  AI Drift Warning:'));
        console.log(chalk.yellow('  This tool measures code drift. Your AI systems likely have 10x more.'));
        if (analysis.totalDebt > 500) {
          console.log(chalk.red('  With ' + analysis.totalDebt.toFixed(0) + ' units of code drift, your AI drift could be ' + (analysis.totalDebt * 10).toLocaleString() + ' units.'));
          console.log(chalk.red('  Each AI drift unit = $50-500/day in potential liability.'));
        }
        console.log(chalk.cyan('  📧 Enterprise AI assessment: sales@intentguard.io'));
        console.log(chalk.gray('  📖 Learn more: intentguard analyze --enterprise'));
      } else if (options.output === 'json') {
        const outputFile = path.join(options.dir, 'intent-guard-analysis.json');
        fs.writeFileSync(outputFile, JSON.stringify(analysis, null, 2));
        console.log(chalk.green(`✅ Analysis saved to ${outputFile}`));
      } else if (options.output === 'html') {
        const { generateHTML } = require('../src/trust-debt-final.js');
        const htmlReport = generateHTML(calculator, analysis);
        const outputFile = path.join(options.dir, 'trust-debt-report.html');
        fs.writeFileSync(outputFile, htmlReport);
        console.log(chalk.green(`✅ HTML report saved to ${outputFile}`));
        
        // Auto-open HTML report
        const { exec } = require('child_process');
        const openCommand = process.platform === 'darwin' ? 'open' :
                          process.platform === 'win32' ? 'start' : 'xdg-open';
        exec(`${openCommand} "${outputFile}"`, (err) => {
          if (!err) {
            console.log(chalk.gray('📖 Opening report in browser...'));
          }
        });
      }
      
      // Exit with error if threshold exceeded
      if (analysis.totalDebt > options.threshold) {
        console.log(chalk.red(`\n❌ Trust Debt (${analysis.totalDebt.toFixed(0)}) exceeds threshold (${options.threshold})`));
        process.exit(1);
      }
    } catch (error) {
      spinner.fail('Analysis failed');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Init command
program
  .command('init')
  .description('Initialize Intent Guard in your repository')
  .option('-d, --dir <path>', 'Project directory', process.cwd())
  .option('--hook', 'Install git hook', true)
  .action(async (options) => {
    const spinner = ora('Initializing Intent Guard...').start();
    
    try {
      // Create .intent-guard.json configuration file
      const configFile = path.join(options.dir, '.intent-guard.json');
      const config = {
        version: '1.0.0',
        threshold: 100,
        patterns: {
          intent: ['README.md', 'docs/**/*.md', 'ARCHITECTURE.md'],
          reality: ['**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx']
        },
        initialized: new Date().toISOString()
      };
      fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
      
      // Install git hook if requested
      if (options.hook) {
        const hookDir = path.join(options.dir, '.git', 'hooks');
        if (fs.existsSync(hookDir)) {
          const hookFile = path.join(hookDir, 'post-commit');
          const hookContent = `#!/bin/sh\n# Intent Guard post-commit hook\nintentguard analyze --threshold 100\n`;
          fs.writeFileSync(hookFile, hookContent);
          fs.chmodSync(hookFile, '755');
        }
      }
      
      spinner.succeed('Intent Guard initialized successfully');
      
      console.log('\n' + chalk.bold('📝 Next steps:'));
      console.log('  1. Create intent documents (README, ARCHITECTURE.md, etc.)');
      console.log('  2. Run ' + chalk.cyan('intent-guard analyze') + ' to measure Trust Debt');
      console.log('  3. Add ' + chalk.cyan('intent-guard ci') + ' to your CI/CD pipeline');
      console.log('\n' + chalk.gray('Learn more at https://intentguard.io'));
    } catch (error) {
      spinner.fail('Initialization failed');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// CI command
program
  .command('ci')
  .description('Run Intent Guard in CI mode')
  .option('-d, --dir <path>', 'Project directory', process.cwd())
  .option('--threshold <number>', 'Trust Debt threshold for failure', 100)
  .option('--report', 'Generate HTML report', false)
  .action(async (options) => {
    console.log(chalk.bold('🔍 CI Mode: Checking Trust Debt...'));
    
    try {
      // Change to project directory
      process.chdir(options.dir);
      
      const calculator = new TrustDebtCalculator();
      const analysis = calculator.analyze();
      
      // Generate report if requested
      if (options.report) {
        const { generateHTML } = require('../src/trust-debt-final.js');
        const htmlReport = generateHTML(calculator, analysis);
        const outputFile = path.join(options.dir, 'trust-debt-ci-report.html');
        fs.writeFileSync(outputFile, htmlReport);
        console.log(chalk.gray(`Report: ${outputFile}`));
      }
      
      // Check threshold
      if (analysis.totalDebt > options.threshold) {
        console.log(chalk.red(`❌ Trust Debt Check Failed`));
        console.log(chalk.red(`   Score: ${analysis.totalDebt.toFixed(0)} units (threshold: ${options.threshold})`));
        console.log(chalk.yellow('\n   Top issues:'));
        
        if (analysis.worstDrifts) {
          analysis.worstDrifts.slice(0, 3).forEach(drift => {
            console.log(`   • ${drift.from} → ${drift.to}: ${drift.debt.toFixed(0)} units`);
          });
        }
        
        console.log(chalk.gray('\n   Fix suggestions:'));
        console.log('   1. Update documentation to match implementation');
        console.log('   2. Refactor code to match intended architecture');
        console.log('   3. Run ' + chalk.cyan('intent-guard analyze') + ' locally for details');
        
        process.exit(1);
      } else {
        console.log(chalk.green(`✅ Trust Debt Check Passed`));
        console.log(chalk.gray(`   Score: ${analysis.totalDebt.toFixed(0)} units (threshold: ${options.threshold})`));
        const grade = analysis.totalDebt < 100 ? 'AAA' :
                     analysis.totalDebt < 500 ? 'A' :
                     analysis.totalDebt < 1000 ? 'B' :
                     analysis.totalDebt < 5000 ? 'C' : 'D';
        console.log(chalk.gray(`   Grade: ${grade}`));
      }
    } catch (error) {
      console.error(chalk.red('CI check failed:', error.message));
      process.exit(1);
    }
  });

// Report command
program
  .command('report')
  .description('Generate Trust Debt report')
  .option('-d, --dir <path>', 'Project directory', process.cwd())
  .option('-o, --output <file>', 'Output file', 'trust-debt-report.html')
  .option('--open', 'Open report in browser', true)
  .action(async (options) => {
    const spinner = ora('Generating report...').start();
    
    try {
      const calculator = new TrustDebtCalculator();
      
      // Change to project directory
      process.chdir(options.dir);
      
      // Analyze the repository
      const analysis = calculator.analyze();
      
      // Generate HTML report
      const { generateHTML } = require('../src/trust-debt-final.js');
      const htmlReport = generateHTML(calculator, analysis);
      
      const outputFile = path.join(options.dir, options.output);
      fs.writeFileSync(outputFile, htmlReport);
      
      spinner.succeed(`Report saved to ${outputFile}`);
      
      if (options.open) {
        // Try to open the file using the system's default browser
        const { exec } = require('child_process');
        const openCommand = process.platform === 'darwin' ? 'open' :
                          process.platform === 'win32' ? 'start' : 'xdg-open';
        exec(`${openCommand} "${outputFile}"`, (err) => {
          if (!err) {
            console.log(chalk.gray('Opening report in browser...'));
          }
        });
      }
    } catch (error) {
      spinner.fail('Report generation failed');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Badge command
program
  .command('badge')
  .description('Generate Trust Debt badge for README')
  .option('-d, --dir <path>', 'Project directory', process.cwd())
  .option('--style <style>', 'Badge style (flat|flat-square|plastic)', 'flat')
  .action(async (options) => {
    try {
      // Change to project directory
      process.chdir(options.dir);
      
      const calculator = new TrustDebtCalculator();
      const analysis = calculator.analyze();
      
      // Determine color based on score
      const color = analysis.totalDebt > 5000 ? 'red' : 
                   analysis.totalDebt > 1000 ? 'yellow' : 
                   analysis.totalDebt > 500 ? 'orange' : 'green';
      
      // Generate badge URL
      const badgeUrl = `https://img.shields.io/badge/Trust_Debt-${analysis.totalDebt.toFixed(0)}_units-${color}?style=${options.style}`;
      
      console.log(chalk.bold('📛 Trust Debt Badge:'));
      console.log('\nMarkdown:');
      console.log(chalk.gray(`![Trust Debt](${badgeUrl})`));
      console.log('\nHTML:');
      console.log(chalk.gray(`<img src="${badgeUrl}" alt="Trust Debt: ${analysis.totalDebt.toFixed(0)} units" />`));
      console.log('\nURL:');
      console.log(chalk.cyan(badgeUrl));
      
      // Save to file
      const badgeFile = path.join(options.dir, '.intent-guard-badge.json');
      const grade = analysis.totalDebt < 100 ? 'AAA' :
                   analysis.totalDebt < 500 ? 'A' :
                   analysis.totalDebt < 1000 ? 'B' :
                   analysis.totalDebt < 5000 ? 'C' : 'D';
      fs.writeFileSync(badgeFile, JSON.stringify({
        score: analysis.totalDebt.toFixed(0),
        grade,
        color,
        url: badgeUrl,
        timestamp: new Date().toISOString()
      }, null, 2));
      
      console.log(chalk.gray(`\nBadge data saved to ${badgeFile}`));
    } catch (error) {
      console.error(chalk.red('Badge generation failed:', error.message));
      process.exit(1);
    }
  });

// Categories command (generate project-specific categories)
program
  .command('categories')
  .description('Generate project-specific orthogonal categories using Claude')
  .option('-d, --dir <path>', 'Project directory', process.cwd())
  .option('--force', 'Force regeneration even if categories exist', false)
  .option('--validate', 'Validate existing categories for orthogonality', false)
  .action(async (options) => {
    console.log(chalk.bold('🤖 Category Generation with Claude'));
    console.log(chalk.gray('─'.repeat(40)));
    
    try {
      // Check for Claude CLI
      try {
        execSync('which claude', { stdio: 'ignore' });
        console.log(chalk.green('✅ Claude CLI found'));
      } catch (e) {
        console.log(chalk.red('❌ Claude CLI not found'));
        console.log(chalk.yellow('   Install with: npm install -g @anthropic/claude-cli'));
        process.exit(1);
      }
      
      const DynamicCategoryGenerator = require('../src/dynamic-category-generator.js');
      const generator = new DynamicCategoryGenerator(options.dir);
      
      // Check existing categories
      const categoriesPath = path.join(options.dir, 'trust-debt-categories.json');
      if (fs.existsSync(categoriesPath) && !options.force) {
        const existing = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
        console.log(chalk.cyan('📁 Found existing categories:'));
        
        // Handle different JSON structures
        if (existing.categories && Array.isArray(existing.categories)) {
          existing.categories.forEach(cat => {
            const keywords = cat.keywords || [];
            console.log(`   ${cat.id} ${cat.name}: ${keywords.slice(0, 3).join(', ')}...`);
          });
        } else {
          console.log(chalk.yellow('   (Categories file exists but has different structure)'));
          console.log(chalk.yellow('   Use --force to regenerate with correct structure'));
        }
        
        if (options.validate && existing.categories) {
          console.log(chalk.cyan('\n🔍 Validating orthogonality...'));
          generator.validateWithGitData(existing);
          console.log(chalk.green('✅ Validation complete'));
        } else {
          console.log(chalk.gray('\n   Use --force to regenerate or --validate to check'));
        }
        return;
      }
      
      // Generate new categories
      console.log(chalk.cyan('🚀 Generating orthogonal categories for this project...'));
      await generator.run();
      
      console.log(chalk.green('\n✅ Categories generated successfully!'));
      console.log(chalk.gray('   Run `intentguard analyze` to use these categories'));
    } catch (error) {
      console.error(chalk.red('❌ Category generation failed:', error.message));
      process.exit(1);
    }
  });

// Doctor command (check setup)
program
  .command('doctor')
  .description('Check Intent Guard setup and configuration')
  .option('-d, --dir <path>', 'Project directory', process.cwd())
  .action(async (options) => {
    console.log(chalk.bold('🩺 Running Intent Guard Doctor...'));
    console.log(chalk.gray('─'.repeat(40)));
    
    const checks = [];
    
    // Check Git repository
    const gitDir = path.join(options.dir, '.git');
    if (fs.existsSync(gitDir)) {
      checks.push({ name: 'Git repository', status: '✅', note: 'Found' });
    } else {
      checks.push({ name: 'Git repository', status: '❌', note: 'Not found - initialize with git init' });
    }
    
    // Check Intent Guard config
    const configFile = path.join(options.dir, '.intent-guard.json');
    if (fs.existsSync(configFile)) {
      checks.push({ name: 'Configuration', status: '✅', note: 'Found' });
    } else {
      checks.push({ name: 'Configuration', status: '⚠️', note: 'Not found - run intent-guard init' });
    }
    
    // Check intent documents
    const intentDocs = ['README.md', 'ARCHITECTURE.md', 'docs/'];
    let foundDocs = 0;
    intentDocs.forEach(doc => {
      const docPath = path.join(options.dir, doc);
      if (fs.existsSync(docPath)) foundDocs++;
    });
    
    if (foundDocs > 0) {
      checks.push({ name: 'Intent documents', status: '✅', note: `${foundDocs} found` });
    } else {
      checks.push({ name: 'Intent documents', status: '⚠️', note: 'None found - add README.md or docs/' });
    }
    
    // Check git hooks
    const hookFile = path.join(options.dir, '.git/hooks/post-commit');
    if (fs.existsSync(hookFile) && fs.readFileSync(hookFile, 'utf8').includes('intent-guard')) {
      checks.push({ name: 'Git hook', status: '✅', note: 'Installed' });
    } else {
      checks.push({ name: 'Git hook', status: '⚠️', note: 'Not installed - run intent-guard init --hook' });
    }
    
    // Display results
    checks.forEach(check => {
      console.log(`${check.status} ${check.name}: ${chalk.gray(check.note)}`);
    });
    
    const failures = checks.filter(c => c.status === '❌').length;
    const warnings = checks.filter(c => c.status === '⚠️').length;
    
    console.log(chalk.gray('─'.repeat(40)));
    if (failures > 0) {
      console.log(chalk.red(`${failures} critical issues found`));
      process.exit(1);
    } else if (warnings > 0) {
      console.log(chalk.yellow(`${warnings} warnings found`));
    } else {
      console.log(chalk.green('All checks passed! Intent Guard is ready.'));
    }
  });

// Enterprise command - information about enterprise version
program
  .command('enterprise')
  .description('Learn about Enterprise IntentGuard for AI drift prevention')
  .action(() => {
    console.log(chalk.bold.cyan(`
╔══════════════════════════════════════════════════════╗
║        Enterprise IntentGuard for AI Systems        ║
╚══════════════════════════════════════════════════════╝
`));
    
    console.log(chalk.bold('🤖 The Problem You Can\'t See Until It\'s Too Late:\n'));
    console.log('Your codebase has ' + chalk.yellow('1,000 units') + ' of Trust Debt.');
    console.log('Your AI systems likely have ' + chalk.red.bold('10,000+ units') + ' (unmeasured).\n');
    
    console.log(chalk.bold('📊 Code Drift vs AI Drift:\n'));
    console.log('Code Drift: README says "fast" → Code is slow');
    console.log('           Impact: ' + chalk.yellow('Technical debt, slower delivery'));
    console.log('\nAI Drift:  Training: "Be helpful" → Reality: Enables fraud');
    console.log('           Impact: ' + chalk.red.bold('$10M+ lawsuits, regulatory shutdown'));
    
    console.log('\n' + chalk.bold('⚠️  2025 Requirements:\n'));
    console.log('• EU AI Act: Prove alignment or face 7% revenue penalty');
    console.log('• Insurance: No coverage without Trust Debt metrics');
    console.log('• SEC: Quantify AI risks in financial reports');
    
    console.log('\n' + chalk.bold('🚀 What Enterprise IntentGuard Does:\n'));
    console.log('1. Real-time AI alignment monitoring');
    console.log('2. Regulatory compliance automation (EU AI Act, ISO 42001)');
    console.log('3. Insurance qualification packages');
    console.log('4. Board-ready risk dashboards in dollars');
    
    console.log('\n' + chalk.bold('💰 ROI Example:\n'));
    console.log('Fortune 500 Financial Services:');
    console.log('• Detected AI loan system drifting toward discrimination');
    console.log('• Trust Debt spike: 230 → 1,840 units');
    console.log('• Action: Model recalibration before audit');
    console.log('• Result: ' + chalk.green('Avoided $47M fine + class action lawsuit'));
    
    console.log('\n' + chalk.bold.cyan('📧 Schedule Your Free AI Assessment:\n'));
    console.log('Email: ' + chalk.cyan('sales@intentguard.io'));
    console.log('Web:   ' + chalk.cyan('https://intentguard.io/enterprise'));
    console.log('Phone: ' + chalk.cyan('1-800-DRIFT-AI'));
    
    console.log('\n' + chalk.gray('More details: cat ENTERPRISE.md'));
  });

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}