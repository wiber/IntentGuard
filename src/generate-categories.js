#!/usr/bin/env node
/**
 * DYNAMIC CATEGORY GENERATOR
 * Uses Claude CLI to generate project-specific orthogonal categories
 * Ensures maximum independence for multiplicative Trust Debt gains
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CategoryGenerator {
    constructor(projectPath = process.cwd()) {
        this.projectPath = projectPath;
        this.configPath = path.join(projectPath, 'trust-debt-categories.json');
    }

    // Gather project context for Claude
    gatherProjectContext() {
        console.log('📊 Gathering project context...');
        
        // Read README if exists
        let readme = '';
        const readmePath = path.join(this.projectPath, 'README.md');
        if (fs.existsSync(readmePath)) {
            readme = fs.readFileSync(readmePath, 'utf8').slice(0, 2000);
        }

        // Get file structure
        let fileList = '';
        try {
            fileList = execSync('find . -type f -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.java" 2>/dev/null | head -50', {
                cwd: this.projectPath,
                encoding: 'utf8'
            });
        } catch (e) {
            fileList = 'Could not determine file structure';
        }

        // Get recent commit messages
        let commits = '';
        try {
            commits = execSync('git log --oneline -20 2>/dev/null', {
                cwd: this.projectPath,
                encoding: 'utf8'
            });
        } catch (e) {
            commits = 'No git history available';
        }

        // Get package.json or equivalent
        let dependencies = '';
        const packagePath = path.join(this.projectPath, 'package.json');
        if (fs.existsSync(packagePath)) {
            const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            dependencies = JSON.stringify(pkg.dependencies || {}, null, 2);
        }

        return { readme, fileList, commits, dependencies };
    }

    // Generate categories using Claude
    async generateCategories() {
        const context = this.gatherProjectContext();
        
        const prompt = `Analyze this software project and generate 5 ORTHOGONAL (independent) category dimensions for Trust Debt measurement.

PROJECT CONTEXT:
README excerpt: ${context.readme}
File structure: ${context.fileList}
Recent commits: ${context.commits}
Dependencies: ${context.dependencies}

REQUIREMENTS:
1. Generate exactly 5 parent categories that are ORTHOGONAL (correlation < 10%)
2. Each category must represent an independent dimension of the codebase
3. Categories must be specific to THIS project's domain
4. Each category needs 4 child subcategories
5. Provide specific keywords that would appear in code/docs for each category

ORTHOGONALITY TEST: If improving one category would naturally improve another, they are NOT orthogonal.

OUTPUT FORMAT (valid JSON):
{
  "project_name": "detected project name",
  "domain": "detected domain (e.g., web app, ML, embedded, etc.)",
  "categories": [
    {
      "id": "A🚀",
      "name": "FirstDimension",
      "description": "What this dimension measures",
      "keywords": ["keyword1", "keyword2", "keyword3", "keyword4"],
      "children": [
        {
          "id": "A🚀.1⚡",
          "name": "FirstChild",
          "keywords": ["child1keyword1", "child1keyword2"]
        }
      ]
    }
  ],
  "orthogonality_reasoning": "Explanation of why these 5 dimensions are independent"
}

Think about truly independent aspects like:
- Core functionality vs Infrastructure
- Data flow vs Control flow  
- User-facing vs System-internal
- Synchronous vs Asynchronous
- Creation vs Validation

Make categories SPECIFIC to this project's actual purpose.`;

        console.log('🤖 Generating orthogonal categories with Claude...');
        
        try {
            // Write prompt to temp file to avoid shell escaping issues
            const tempFile = path.join(this.projectPath, '.claude-prompt.txt');
            fs.writeFileSync(tempFile, prompt);
            
            // Use Claude CLI with file input
            const result = execSync(`cat ${tempFile} | claude`, {
                encoding: 'utf8',
                maxBuffer: 1024 * 1024 * 10
            });
            
            // Clean up temp file
            fs.unlinkSync(tempFile);

            // Extract JSON from Claude's response
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Could not parse JSON from Claude response');
            }

            const categories = JSON.parse(jsonMatch[0]);
            
            // Validate orthogonality
            this.validateOrthogonality(categories);
            
            return categories;
        } catch (error) {
            console.error('❌ Failed to generate categories:', error.message);
            return this.getFallbackCategories();
        }
    }

    // Validate that categories are truly orthogonal
    validateOrthogonality(categories) {
        console.log('🔍 Validating orthogonality...');
        
        const categoryNames = categories.categories.map(c => c.name);
        const keywordSets = categories.categories.map(c => new Set(c.keywords));
        
        // Check keyword overlap
        for (let i = 0; i < keywordSets.length; i++) {
            for (let j = i + 1; j < keywordSets.length; j++) {
                const overlap = [...keywordSets[i]].filter(k => keywordSets[j].has(k));
                if (overlap.length > 0) {
                    console.warn(`⚠️  Categories ${categoryNames[i]} and ${categoryNames[j]} share keywords: ${overlap.join(', ')}`);
                }
            }
        }
        
        console.log('✅ Orthogonality check complete');
        console.log(`📐 Reasoning: ${categories.orthogonality_reasoning}`);
    }

    // Fallback categories if Claude fails
    getFallbackCategories() {
        return {
            project_name: "Unknown Project",
            domain: "Generic Software",
            categories: [
                {
                    id: "A🚀",
                    name: "CoreLogic",
                    description: "Business logic and core algorithms",
                    keywords: ["function", "process", "calculate", "algorithm"],
                    children: []
                },
                {
                    id: "B🔒",
                    name: "DataLayer",
                    description: "Data management and persistence",
                    keywords: ["data", "database", "store", "cache"],
                    children: []
                },
                {
                    id: "C💨",
                    name: "Interface",
                    description: "External interfaces and APIs",
                    keywords: ["api", "interface", "endpoint", "request"],
                    children: []
                },
                {
                    id: "D🧠",
                    name: "Infrastructure",
                    description: "System infrastructure and configuration",
                    keywords: ["config", "setup", "deploy", "environment"],
                    children: []
                },
                {
                    id: "E🎨",
                    name: "Quality",
                    description: "Testing and quality assurance",
                    keywords: ["test", "validate", "error", "quality"],
                    children: []
                }
            ],
            orthogonality_reasoning: "Generic fallback categories"
        };
    }

    // Save categories to config file
    saveCategories(categories) {
        fs.writeFileSync(this.configPath, JSON.stringify(categories, null, 2));
        console.log(`💾 Saved categories to ${this.configPath}`);
    }

    // Main execution
    async run() {
        console.log('🚀 Dynamic Category Generator for Trust Debt');
        console.log('============================================');
        
        // Check if categories already exist
        if (fs.existsSync(this.configPath)) {
            console.log(`📁 Found existing categories at ${this.configPath}`);
            const existing = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
            console.log(`   Project: ${existing.project_name}`);
            console.log(`   Domain: ${existing.domain}`);
            
            const answer = await this.prompt('Generate new categories? (y/n): ');
            if (answer.toLowerCase() !== 'y') {
                console.log('Using existing categories');
                return existing;
            }
        }
        
        // Generate new categories
        const categories = await this.generateCategories();
        
        // Display generated categories
        console.log('\n📊 Generated Orthogonal Categories:');
        console.log('===================================');
        categories.categories.forEach((cat, i) => {
            console.log(`${cat.id} ${cat.name}: ${cat.description}`);
            console.log(`   Keywords: ${cat.keywords.join(', ')}`);
        });
        
        // Save to file
        this.saveCategories(categories);
        
        return categories;
    }

    // Simple prompt helper
    prompt(question) {
        return new Promise((resolve) => {
            const readline = require('readline').createInterface({
                input: process.stdin,
                output: process.stdout
            });
            readline.question(question, (answer) => {
                readline.close();
                resolve(answer);
            });
        });
    }
}

// Run if called directly
if (require.main === module) {
    const generator = new CategoryGenerator();
    generator.run().then(() => {
        console.log('\n✅ Category generation complete!');
        console.log('📈 Run `intentguard analyze` to use these categories');
    }).catch(error => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
}

module.exports = CategoryGenerator;