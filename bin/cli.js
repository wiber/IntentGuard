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
  .version('1.1.0');

// Analyze command
program
  .command('analyze')
  .description('Analyze Trust Debt in your repository')
  .option('-d, --dir <path>', 'Project directory', process.cwd())
  .option('-o, --output <format>', 'Output format (json|html|console)', 'console')
  .option('--threshold <number>', 'Trust Debt threshold for CI failure', 100)
  .action(async (options) => {
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
            // Explain the specific drift
            console.log(chalk.yellow(`  ${i + 1}. ${drift.fromName} → ${drift.toName}`));
            console.log(`     Debt: ${drift.debt.toFixed(0)} units`);
            console.log(`     Means: Your ${drift.fromName.toLowerCase()} promises something`);
            console.log(`            your ${drift.toName.toLowerCase()} doesn't deliver`);
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
      const analyzer = new AnalyzerClass(options.dir);
      
      if (analyzerType === 'advanced') {
        // Advanced mode - use TrustDebtAnalyzer initialization
        console.log(chalk.gray('Using advanced Trust Debt system with Claude AI integration'));
        // The advanced analyzer doesn't need separate initialization in ThetaCoach
      } else {
        // Basic mode - use IntentGuard initialization  
        await analyzer.initialize({ installHook: options.hook });
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
      const analyzer = new AnalyzerClass(options.dir);
      
      // Use appropriate method based on analyzer type
      let analysis;
      if (analyzerType === 'advanced') {
        analysis = await analyzer.runAnalysis({ silent: true });
      } else {
        analysis = await analyzer.analyze();
      }
      
      // Generate report if requested
      if (options.report) {
        let htmlReport;
        if (analyzerType === 'advanced') {
          // Use existing advanced reports
          const reportFiles = ['trust-debt-physics-report.html', 'trust-debt-executive-summary.html'];
          const existingReport = reportFiles.find(file => fs.existsSync(path.join(options.dir, file)));
          if (existingReport) {
            htmlReport = fs.readFileSync(path.join(options.dir, existingReport), 'utf8');
          } else {
            htmlReport = `<h1>Trust Debt CI Report</h1><p>Score: ${analysis.score} units</p>`;
          }
        } else {
          htmlReport = await analyzer.generateHTMLReport(analysis);
        }
        const outputFile = path.join(options.dir, 'trust-debt-ci-report.html');
        fs.writeFileSync(outputFile, htmlReport);
        console.log(chalk.gray(`Report: ${outputFile}`));
      }
      
      // Check threshold
      if (analysis.score > options.threshold) {
        console.log(chalk.red(`❌ Trust Debt Check Failed`));
        console.log(chalk.red(`   Score: ${analysis.score} units (threshold: ${options.threshold})`));
        console.log(chalk.yellow('\n   Top issues:'));
        
        if (analysis.topContributors) {
          analysis.topContributors.slice(0, 3).forEach(c => {
            console.log(`   • ${c.category}: ${c.gap} drift`);
          });
        }
        
        console.log(chalk.gray('\n   Fix suggestions:'));
        console.log('   1. Update documentation to match implementation');
        console.log('   2. Refactor code to match intended architecture');
        console.log('   3. Run ' + chalk.cyan('intent-guard analyze') + ' locally for details');
        
        process.exit(1);
      } else {
        console.log(chalk.green(`✅ Trust Debt Check Passed`));
        console.log(chalk.gray(`   Score: ${analysis.score} units (threshold: ${options.threshold})`));
        console.log(chalk.gray(`   Status: ${analysis.status}`));
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
      const analyzer = new AnalyzerClass(options.dir);
      
      // Use appropriate method based on analyzer type
      let analysis;
      if (analyzerType === 'advanced') {
        analysis = await analyzer.runAnalysis({ silent: true });
      } else {
        analysis = await analyzer.analyze();
      }
      
      let htmlReport;
      if (analyzerType === 'advanced') {
        // Use existing advanced reports
        const reportFiles = ['trust-debt-physics-report.html', 'trust-debt-executive-summary.html', 'trust-debt-report.html'];
        const existingReport = reportFiles.find(file => fs.existsSync(path.join(options.dir, file)));
        if (existingReport) {
          htmlReport = fs.readFileSync(path.join(options.dir, existingReport), 'utf8');
        } else {
          htmlReport = `<h1>Trust Debt Report</h1><p>Score: ${analysis.score} units</p>`;
        }
      } else {
        htmlReport = await analyzer.generateHTMLReport(analysis);
      }
      
      const outputFile = path.join(options.dir, options.output);
      fs.writeFileSync(outputFile, htmlReport);
      
      spinner.succeed(`Report saved to ${outputFile}`);
      
      if (options.open) {
        const open = require('open');
        await open(outputFile);
        console.log(chalk.gray('Opening report in browser...'));
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
      const analyzer = new AnalyzerClass(options.dir);
      
      // Use appropriate method based on analyzer type
      let analysis;
      if (analyzerType === 'advanced') {
        analysis = await analyzer.runAnalysis({ silent: true });
      } else {
        analysis = await analyzer.analyze();
      }
      
      // Determine color based on score
      const color = analysis.score > 200 ? 'red' : 
                   analysis.score > 100 ? 'yellow' : 
                   analysis.score > 50 ? 'orange' : 'green';
      
      // Generate badge URL
      const badgeUrl = `https://img.shields.io/badge/Trust_Debt-${analysis.score}_units-${color}?style=${options.style}`;
      
      console.log(chalk.bold('📛 Trust Debt Badge:'));
      console.log('\nMarkdown:');
      console.log(chalk.gray(`![Trust Debt](${badgeUrl})`));
      console.log('\nHTML:');
      console.log(chalk.gray(`<img src="${badgeUrl}" alt="Trust Debt: ${analysis.score} units" />`));
      console.log('\nURL:');
      console.log(chalk.cyan(badgeUrl));
      
      // Save to file
      const badgeFile = path.join(options.dir, '.intent-guard-badge.json');
      fs.writeFileSync(badgeFile, JSON.stringify({
        score: analysis.score,
        status: analysis.status,
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

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}