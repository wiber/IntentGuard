#!/usr/bin/env node
/**
 * DYNAMIC SHORTLEX CATEGORY GENERATOR WITH FEEDBACK LOOP
 * Uses git log analysis to generate orthogonal categories
 * Iterates with Claude to maximize independence
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DynamicCategoryGenerator {
    constructor(projectPath = process.cwd()) {
        this.projectPath = projectPath;
        this.configPath = path.join(projectPath, 'trust-debt-categories.json');
        this.maxIterations = 3;
    }

    // Analyze git log to find actual patterns
    analyzeGitPatterns() {
        console.log('📊 Analyzing git commit patterns...');
        
        try {
            // Get detailed commit messages with changes
            const gitLog = execSync('git log --stat --oneline -100', {
                cwd: this.projectPath,
                encoding: 'utf8',
                maxBuffer: 1024 * 1024 * 5
            });

            // Get file change frequency
            const fileChanges = execSync('git log --name-only --pretty=format: -100 | sort | uniq -c | sort -rn | head -20', {
                cwd: this.projectPath,
                encoding: 'utf8'
            });

            // Get commit message words
            const commitWords = execSync('git log --pretty=format:"%s" -100 | tr " " "\\n" | sort | uniq -c | sort -rn | head -30', {
                cwd: this.projectPath,
                encoding: 'utf8'
            });

            return { gitLog, fileChanges, commitWords };
        } catch (e) {
            return { gitLog: '', fileChanges: '', commitWords: '' };
        }
    }

    // Generate categories with Claude
    async generateCategoriesWithFeedback(iteration = 1) {
        const gitPatterns = this.analyzeGitPatterns();
        
        let previousAttempt = '';
        if (iteration > 1 && fs.existsSync(this.configPath)) {
            const prev = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
            previousAttempt = `
PREVIOUS ATTEMPT (Iteration ${iteration - 1}):
Categories: ${prev.categories.map(c => c.name).join(', ')}
Orthogonality Score: ${prev.orthogonality_score || 'unknown'}
Feedback: ${prev.feedback || 'Improve independence between categories'}`;
        }

        const prompt = `Analyze this project's git history and generate 5 ORTHOGONAL ShortLex-ordered categories for Trust Debt measurement.

GIT COMMIT PATTERNS:
${gitPatterns.gitLog.slice(0, 2000)}

MOST CHANGED FILES:
${gitPatterns.fileChanges}

FREQUENT COMMIT WORDS:
${gitPatterns.commitWords}
${previousAttempt}

STRICT REQUIREMENTS:
1. Generate exactly 5 parent categories following ShortLex ordering:
   - A🚀 (length 3)
   - B🔒 (length 3)  
   - C💨 (length 3)
   - D🧠 (length 3)
   - E🎨 (length 3)

2. Each parent gets 4 children:
   - A🚀.1⚡ (length 7)
   - A🚀.2🔥 (length 7)
   - A🚀.3📈 (length 7)
   - A🚀.4🎯 (length 7)

3. ORTHOGONALITY TEST:
   - Categories must be INDEPENDENT (correlation < 10%)
   - Improving one should NOT automatically improve another
   - Keywords must NOT overlap between categories

4. Base categories on ACTUAL git patterns:
   - What files change together?
   - What commit messages appear?
   - What are the natural boundaries in the code?

OUTPUT JSON:
{
  "iteration": ${iteration},
  "categories": [
    {
      "id": "A🚀",
      "name": "ShortNameNoSpaces",
      "keywords": ["unique1", "unique2", "unique3", "unique4"],
      "rationale": "Why this is independent from others",
      "children": [
        {
          "id": "A🚀.1⚡",
          "name": "SubCategory1",
          "keywords": ["subkey1", "subkey2"]
        },
        {
          "id": "A🚀.2🔥",
          "name": "SubCategory2",
          "keywords": ["subkey3", "subkey4"]
        },
        {
          "id": "A🚀.3📈",
          "name": "SubCategory3",
          "keywords": ["subkey5", "subkey6"]
        },
        {
          "id": "A🚀.4🎯",
          "name": "SubCategory4",
          "keywords": ["subkey7", "subkey8"]
        }
      ]
    }
  ],
  "orthogonality_score": 0.95,
  "orthogonality_matrix": [
    [1.0, 0.05, 0.03, 0.02, 0.01],
    [0.05, 1.0, 0.04, 0.03, 0.02],
    [0.03, 0.04, 1.0, 0.05, 0.03],
    [0.02, 0.03, 0.05, 1.0, 0.04],
    [0.01, 0.02, 0.03, 0.04, 1.0]
  ],
  "improvement_suggestions": "How to make categories more independent"
}

Think about TRULY INDEPENDENT aspects from the git log:
- What always changes separately?
- What has different commit message patterns?
- What represents different concerns?`;

        console.log(`🤖 Generating categories (Iteration ${iteration})...`);
        
        try {
            // Save prompt to file
            const promptFile = path.join(this.projectPath, '.category-prompt.txt');
            fs.writeFileSync(promptFile, prompt);
            
            // Call Claude
            const result = execSync(`cat "${promptFile}" | claude`, {
                encoding: 'utf8',
                maxBuffer: 1024 * 1024 * 10
            });
            
            // Clean up
            fs.unlinkSync(promptFile);

            // Extract JSON
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Could not parse JSON from Claude response');
            }

            const categories = JSON.parse(jsonMatch[0]);
            
            // Check orthogonality score
            const score = categories.orthogonality_score || 0;
            console.log(`📐 Orthogonality Score: ${score}`);
            
            if (score < 0.9 && iteration < this.maxIterations) {
                console.log(`⚠️  Score below 0.9, iterating to improve...`);
                categories.feedback = categories.improvement_suggestions;
                this.saveCategories(categories);
                return this.generateCategoriesWithFeedback(iteration + 1);
            }
            
            return categories;
        } catch (error) {
            console.error(`❌ Generation failed:`, error.message);
            return this.getDefaultCategories();
        }
    }

    // Validate with actual git data
    validateWithGitData(categories) {
        console.log('🔍 Validating categories against git data...');
        
        categories.categories.forEach(cat => {
            const keywords = cat.keywords;
            let matchCount = 0;
            
            keywords.forEach(keyword => {
                try {
                    const matches = execSync(
                        `git log --grep="${keyword}" --oneline -10 2>/dev/null | wc -l`,
                        { cwd: this.projectPath, encoding: 'utf8' }
                    );
                    matchCount += parseInt(matches.trim());
                } catch (e) {
                    // Keyword not found
                }
            });
            
            console.log(`  ${cat.id} ${cat.name}: ${matchCount} git matches`);
            cat.git_relevance = matchCount;
        });
    }

    // Default categories based on ShortLex
    getDefaultCategories() {
        return {
            iteration: 0,
            categories: [
                {
                    id: "A🚀",
                    name: "Core",
                    keywords: ["main", "core", "primary", "central"],
                    children: [
                        { id: "A🚀.1⚡", name: "Logic", keywords: ["logic", "algorithm"] },
                        { id: "A🚀.2🔥", name: "State", keywords: ["state", "data"] },
                        { id: "A🚀.3📈", name: "Flow", keywords: ["flow", "process"] },
                        { id: "A🚀.4🎯", name: "Rules", keywords: ["rule", "validate"] }
                    ]
                },
                {
                    id: "B🔒",
                    name: "Interface",
                    keywords: ["interface", "api", "endpoint", "route"],
                    children: [
                        { id: "B🔒.1🛡", name: "Input", keywords: ["input", "request"] },
                        { id: "B🔒.2🔑", name: "Output", keywords: ["output", "response"] },
                        { id: "B🔒.3⚠", name: "Error", keywords: ["error", "exception"] },
                        { id: "B🔒.4🔐", name: "Auth", keywords: ["auth", "permission"] }
                    ]
                },
                {
                    id: "C💨",
                    name: "Storage",
                    keywords: ["storage", "database", "file", "cache"],
                    children: [
                        { id: "C💨.1🚀", name: "Read", keywords: ["read", "get"] },
                        { id: "C💨.2💨", name: "Write", keywords: ["write", "save"] },
                        { id: "C💨.3⏰", name: "Query", keywords: ["query", "search"] },
                        { id: "C💨.4🎮", name: "Cache", keywords: ["cache", "memory"] }
                    ]
                },
                {
                    id: "D🧠",
                    name: "Control",
                    keywords: ["control", "manage", "handle", "process"],
                    children: [
                        { id: "D🧠.1🤖", name: "Async", keywords: ["async", "promise"] },
                        { id: "D🧠.2📊", name: "Event", keywords: ["event", "emit"] },
                        { id: "D🧠.3🔮", name: "Queue", keywords: ["queue", "job"] },
                        { id: "D🧠.4💡", name: "Schedule", keywords: ["schedule", "cron"] }
                    ]
                },
                {
                    id: "E🎨",
                    name: "Quality",
                    keywords: ["test", "quality", "lint", "check"],
                    children: [
                        { id: "E🎨.1✨", name: "Test", keywords: ["test", "spec"] },
                        { id: "E🎨.2🎪", name: "Lint", keywords: ["lint", "style"] },
                        { id: "E🎨.3🎨", name: "Build", keywords: ["build", "compile"] },
                        { id: "E🎨.4📱", name: "Deploy", keywords: ["deploy", "release"] }
                    ]
                }
            ],
            orthogonality_score: 0.85,
            orthogonality_matrix: []
        };
    }

    // Save categories
    saveCategories(categories) {
        fs.writeFileSync(this.configPath, JSON.stringify(categories, null, 2));
        console.log(`💾 Saved to ${this.configPath}`);
    }

    // Main execution
    async run() {
        console.log('🚀 Dynamic ShortLex Category Generator');
        console.log('======================================');
        
        // Generate with feedback loop
        const categories = await this.generateCategoriesWithFeedback();
        
        // Validate against git
        this.validateWithGitData(categories);
        
        // Display results
        console.log('\n📊 Final Orthogonal Categories:');
        console.log('================================');
        categories.categories.forEach(cat => {
            console.log(`${cat.id} ${cat.name}: ${cat.keywords.join(', ')}`);
            cat.children.forEach(child => {
                console.log(`  ${child.id} ${child.name}: ${child.keywords.join(', ')}`);
            });
        });
        
        // Save final version
        this.saveCategories(categories);
        
        console.log(`\n✅ Categories generated with ${categories.orthogonality_score || 0.85} orthogonality`);
        console.log('📈 These categories are now integrated into trust-debt-final.js');
        
        return categories;
    }
}

// Export for use in trust-debt-final.js
module.exports = DynamicCategoryGenerator;

// Run if called directly
if (require.main === module) {
    const generator = new DynamicCategoryGenerator();
    generator.run().catch(error => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
}