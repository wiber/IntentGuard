#!/usr/bin/env node

import { CategoryManager } from './src/category-manager.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';
import chalk from 'chalk';

/**
 * Interactive CLI for Trust Debt Category Management
 * Supports natural language input (voice or text)
 */
class CategoryCLI {
  constructor() {
    this.categoryManager = new CategoryManager();
    this.currentCategories = [];
    this.configFile = './trust-debt-categories.json';
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.green('🎯 Tell me what to do: ')
    });
  }

  async start() {
    this.printWelcome();
    await this.loadExistingCategories();
    await this.startInteractiveSession();
  }

  printWelcome() {
    console.clear();
    console.log(chalk.blue.bold(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                    🎯 Trust Debt Category Manager                            ║
║                                                                              ║
║  📝 NATURAL LANGUAGE INPUT SUPPORTED                                         ║
║  🎙️  You can SPEAK or TYPE your requests naturally!                          ║
║                                                                              ║
║  Examples:                                                                   ║
║  • "Add a category for code complexity"                                      ║
║  • "Remove security, it overlaps with performance"                           ║
║  • "Make categories more specific to mobile development"                     ║
║  • "Do these categories pass independence tests?"                            ║
║  • "Generate new categories from scratch"                                    ║
║                                                                              ║
║  ⚡ Statistical Analysis: Chi-square, Mutual Information, Correlation        ║
║  🔄 Shortlex Optimization: Minimize overlap, maximize coverage               ║
║  🤖 Claude AI Integration: Semantic analysis and recommendations             ║
╚══════════════════════════════════════════════════════════════════════════════╝
`));
  }

  async loadExistingCategories() {
    if (existsSync(this.configFile)) {
      try {
        const data = JSON.parse(readFileSync(this.configFile, 'utf8'));
        this.currentCategories = data.categories || [];
        console.log(chalk.yellow(`📁 Loaded ${this.currentCategories.length} existing categories from ${this.configFile}`));
      } catch (error) {
        console.log(chalk.red(`❌ Error loading categories: ${error.message}`));
      }
    } else {
      console.log(chalk.yellow('📝 No existing categories found. Starting fresh!'));
    }

    this.displayCurrentCategories();
  }

  async startInteractiveSession() {
    const session = await this.categoryManager.startInteractiveSession(this.currentCategories);
    
    console.log(chalk.cyan('\n' + session.welcome));
    
    this.rl.prompt();
    
    this.rl.on('line', async (input) => {
      const trimmedInput = input.trim();
      
      if (trimmedInput === '') {
        this.rl.prompt();
        return;
      }
      
      if (this.handleSpecialCommands(trimmedInput)) {
        this.rl.prompt();
        return;
      }
      
      await this.processNaturalLanguageInput(trimmedInput, session);
      this.rl.prompt();
    });

    this.rl.on('close', () => {
      console.log(chalk.blue('\n👋 Goodbye! Your categories have been saved.'));
      process.exit(0);
    });
  }

  async processNaturalLanguageInput(input, session) {
    console.log(chalk.gray(`\n🤖 Processing: "${input}"`));
    
    try {
      const result = await session.manager.processInput(input);
      
      if (result.success) {
        console.log(chalk.green(`\n✅ ${result.action_taken}`));
        console.log(chalk.white(result.explanation));
        
        // Update current categories
        this.currentCategories = result.updated_categories;
        session.currentCategories = this.currentCategories;
        
        // Display updated categories
        this.displayCurrentCategories();
        
        // Show validation results if available
        if (result.validation) {
          this.displayValidationSummary(result.validation);
        }
        
        // Show suggestions
        if (result.suggestions && result.suggestions.length > 0) {
          console.log(chalk.magenta('\n💡 Suggestions:'));
          result.suggestions.forEach(suggestion => {
            console.log(chalk.magenta(`  • ${suggestion}`));
          });
        }
        
        // Show next steps
        if (result.next_steps) {
          console.log(chalk.cyan(`\n🔄 Next: ${result.next_steps}`));
        }
        
        // Save to file
        await this.saveCategories();
        
      } else {
        console.log(chalk.red(`\n❌ Error: ${result.error}`));
        if (result.rawResponse) {
          console.log(chalk.gray('Raw response:'), result.rawResponse);
        }
      }
      
    } catch (error) {
      console.log(chalk.red(`\n💥 Unexpected error: ${error.message}`));
      console.log(chalk.gray(error.stack));
    }
  }

  handleSpecialCommands(input) {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput === 'help' || lowerInput === '?') {
      this.showHelp();
      return true;
    }
    
    if (lowerInput === 'clear') {
      console.clear();
      this.displayCurrentCategories();
      return true;
    }
    
    if (lowerInput === 'validate' || lowerInput === 'test') {
      this.runValidation();
      return true;
    }
    
    if (lowerInput === 'optimize') {
      this.runOptimization();
      return true;
    }
    
    if (lowerInput === 'export') {
      this.exportCategories();
      return true;
    }
    
    if (lowerInput === 'quit' || lowerInput === 'exit' || lowerInput === 'q') {
      this.rl.close();
      return true;
    }
    
    return false;
  }

  showHelp() {
    console.log(chalk.blue(`
🎯 Trust Debt Category Manager - Help

🎙️  NATURAL LANGUAGE COMMANDS (speak or type naturally):
  • "Add a category for [topic]"
  • "Remove the [category name] category" 
  • "Rename [old name] to [new name]"
  • "Make categories more specific to [domain]"
  • "Do these categories overlap too much?"
  • "Generate new categories for [domain]"
  • "How can I improve these categories?"

⚡ QUICK COMMANDS:
  • help, ?     - Show this help
  • clear       - Clear screen and show current categories
  • validate    - Run statistical independence tests
  • optimize    - Optimize category order using shortlex
  • export      - Export categories to JSON
  • quit, exit  - Save and quit

💡 TIP: Just describe what you want to do in plain English!
`));
  }

  async runValidation() {
    if (this.currentCategories.length === 0) {
      console.log(chalk.yellow('⚠️  No categories to validate. Add some categories first!'));
      return;
    }
    
    console.log(chalk.gray('🔍 Running statistical validation tests...'));
    
    try {
      const validation = await this.categoryManager.validateSystem(
        this.currentCategories,
        [], // No historical data in CLI version
        ['independence', 'orthogonality', 'completeness', 'semantic_clarity']
      );
      
      this.displayDetailedValidation(validation);
      
    } catch (error) {
      console.log(chalk.red(`❌ Validation failed: ${error.message}`));
    }
  }

  async runOptimization() {
    if (this.currentCategories.length < 2) {
      console.log(chalk.yellow('⚠️  Need at least 2 categories to optimize.'));
      return;
    }
    
    console.log(chalk.gray('⚡ Optimizing category order...'));
    
    try {
      const optimized = await this.categoryManager.shortlexOptimizer.optimize(
        this.currentCategories,
        'balanced'
      );
      
      console.log(chalk.green('\n✅ Optimization complete!'));
      console.log(chalk.white(optimized.analysis));
      
      // Update categories with optimized order
      this.currentCategories = optimized.optimalOrder;
      this.displayCurrentCategories();
      
      await this.saveCategories();
      
    } catch (error) {
      console.log(chalk.red(`❌ Optimization failed: ${error.message}`));
    }
  }

  exportCategories() {
    const exportData = {
      categories: this.currentCategories,
      metadata: {
        exported_at: new Date().toISOString(),
        total_categories: this.currentCategories.length,
        tool: 'trust-debt-category-manager'
      }
    };
    
    const filename = `trust-debt-categories-export-${Date.now()}.json`;
    writeFileSync(filename, JSON.stringify(exportData, null, 2));
    
    console.log(chalk.green(`📤 Categories exported to ${filename}`));
  }

  displayCurrentCategories() {
    if (this.currentCategories.length === 0) {
      console.log(chalk.yellow('\n📝 No categories currently defined.'));
      return;
    }
    
    console.log(chalk.blue('\n📋 Current Categories:'));
    this.currentCategories.forEach((cat, index) => {
      console.log(chalk.white(`  ${index + 1}. ${chalk.bold(cat.name)}`));
      if (cat.description) {
        console.log(chalk.gray(`     ${cat.description}`));
      }
    });
    console.log('');
  }

  displayValidationSummary(validation) {
    console.log(chalk.blue('\n🔍 Validation Summary:'));
    console.log(chalk.white(`Overall Health: ${validation.overallHealth}`));
    
    validation.tests.forEach(test => {
      const color = test.score >= 80 ? 'green' : test.score >= 60 ? 'yellow' : 'red';
      console.log(chalk[color](`  ${test.name}: ${test.score}/100 (${test.status})`));
    });
  }

  displayDetailedValidation(validation) {
    console.log(chalk.blue('\n📊 Detailed Validation Results'));
    console.log(chalk.white('='.repeat(50)));
    
    console.log(chalk.green(`\n🎯 Overall Health: ${validation.overallHealth}`));
    console.log(chalk.white(`📝 Recommendation: ${validation.recommendation}`));
    
    validation.tests.forEach(test => {
      console.log(chalk.blue(`\n📋 ${test.name}`));
      console.log(chalk.white(`   Score: ${test.score}/100`));
      console.log(chalk.white(`   Status: ${test.status}`));
      console.log(chalk.gray(`   Details: ${test.details}`));
      
      if (test.issues.length > 0) {
        console.log(chalk.yellow('   Issues:'));
        test.issues.forEach(issue => {
          console.log(chalk.yellow(`     • ${issue}`));
        });
      }
    });
    
    if (validation.detailedAnalysis) {
      console.log(chalk.blue('\n📈 Analysis:'));
      console.log(chalk.white(validation.detailedAnalysis));
    }
  }

  async saveCategories() {
    const data = {
      categories: this.currentCategories,
      metadata: {
        last_updated: new Date().toISOString(),
        total_categories: this.currentCategories.length,
        version: '1.0.0'
      }
    };
    
    try {
      writeFileSync(this.configFile, JSON.stringify(data, null, 2));
      // Don't log save confirmation for every operation - it's noisy
    } catch (error) {
      console.log(chalk.red(`❌ Error saving categories: ${error.message}`));
    }
  }
}

// Run the CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new CategoryCLI();
  cli.start().catch(error => {
    console.error(chalk.red('💥 Fatal error:'), error);
    process.exit(1);
  });
}

export { CategoryCLI };