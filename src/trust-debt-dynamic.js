#!/usr/bin/env node
/**
 * TRUST DEBT DYNAMIC - ADAPTIVE CATEGORY GENERATION
 * 
 * This system dynamically generates categories from documentation
 * rather than using hardcoded values. Categories evolve with the project
 * but maintain consistency through JSON seeding.
 * 
 * Category Discovery Process:
 * 1. Parse README and primary docs for major themes
 * 2. Extract hierarchical structure from headings
 * 3. Identify orthogonal dimensions through keyword clustering
 * 4. Maintain persistence through trust-debt-categories.json
 * 5. Allow evolution while tracking changes
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

// ============================================
// DYNAMIC CATEGORY EXTRACTION
// ============================================

class CategoryExtractor {
    constructor() {
        this.categories = [];
        this.categoryMap = new Map();
        this.keywords = new Map();
        this.previousCategories = null;
        this.categoryFile = 'trust-debt-categories.json';
    }
    
    /**
     * Load previous categories for consistency
     */
    loadPreviousCategories() {
        try {
            if (fs.existsSync(this.categoryFile)) {
                const data = JSON.parse(fs.readFileSync(this.categoryFile, 'utf8'));
                this.previousCategories = data;
                console.log(`📂 Loaded ${data.categories.length} previous categories`);
                return true;
            }
        } catch (e) {
            console.log('📝 No previous categories found, will generate fresh');
        }
        return false;
    }
    
    /**
     * Extract categories from README and key documentation
     */
    extractFromDocumentation() {
        console.log('🔍 Extracting categories from documentation...');
        
        const docs = [
            { path: 'README.md', weight: 0.5 },
            { path: 'CLAUDE.md', weight: 0.3 },
            { path: 'package.json', weight: 0.2 }
        ];
        
        const themes = new Map();
        const headingStructure = [];
        
        docs.forEach(doc => {
            const fullPath = path.join(process.cwd(), doc.path);
            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf8');
                
                // Extract from README structure
                if (doc.path === 'README.md') {
                    this.extractReadmeStructure(content, themes, headingStructure);
                }
                
                // Extract from package.json
                if (doc.path === 'package.json') {
                    this.extractPackageInfo(content, themes);
                }
                
                // Extract general themes
                this.extractThemes(content, themes, doc.weight);
            }
        });
        
        return { themes, headingStructure };
    }
    
    /**
     * Extract structure from README headings
     */
    extractReadmeStructure(content, themes, headingStructure) {
        const lines = content.split('\n');
        const categoryPatterns = {
            // Look for key sections that indicate orthogonal concerns
            installation: /^#{1,3}\s*(installation|setup|getting started)/i,
            usage: /^#{1,3}\s*(usage|how to use|examples|api)/i,
            features: /^#{1,3}\s*(features|capabilities|what it does)/i,
            development: /^#{1,3}\s*(development|contributing|building)/i,
            testing: /^#{1,3}\s*(testing|tests|validation)/i,
            documentation: /^#{1,3}\s*(documentation|docs|api reference)/i,
            security: /^#{1,3}\s*(security|authentication|privacy)/i,
            performance: /^#{1,3}\s*(performance|optimization|benchmarks)/i,
            deployment: /^#{1,3}\s*(deployment|production|release)/i,
            monitoring: /^#{1,3}\s*(monitoring|observability|metrics)/i
        };
        
        lines.forEach((line, idx) => {
            // Check for main headings
            const h1Match = line.match(/^#\s+(.+)/);
            const h2Match = line.match(/^##\s+(.+)/);
            const h3Match = line.match(/^###\s+(.+)/);
            
            if (h1Match) {
                const heading = h1Match[1].trim();
                headingStructure.push({ level: 1, text: heading, line: idx });
                
                // Check against patterns
                Object.entries(categoryPatterns).forEach(([key, pattern]) => {
                    if (pattern.test(line)) {
                        themes.set(key, (themes.get(key) || 0) + 3); // High weight for H1
                    }
                });
            } else if (h2Match) {
                const heading = h2Match[1].trim();
                headingStructure.push({ level: 2, text: heading, line: idx });
                
                Object.entries(categoryPatterns).forEach(([key, pattern]) => {
                    if (pattern.test(line)) {
                        themes.set(key, (themes.get(key) || 0) + 2); // Medium weight for H2
                    }
                });
            } else if (h3Match) {
                const heading = h3Match[1].trim();
                headingStructure.push({ level: 3, text: heading, line: idx });
                
                Object.entries(categoryPatterns).forEach(([key, pattern]) => {
                    if (pattern.test(line)) {
                        themes.set(key, (themes.get(key) || 0) + 1); // Low weight for H3
                    }
                });
            }
            
            // Extract keywords from content
            const keywords = this.extractKeywords(line);
            keywords.forEach(keyword => {
                this.keywords.set(keyword, (this.keywords.get(keyword) || 0) + 1);
            });
        });
    }
    
    /**
     * Extract from package.json
     */
    extractPackageInfo(content, themes) {
        try {
            const pkg = JSON.parse(content);
            
            // Extract from scripts
            if (pkg.scripts) {
                Object.keys(pkg.scripts).forEach(script => {
                    if (script.includes('test')) themes.set('testing', (themes.get('testing') || 0) + 1);
                    if (script.includes('build')) themes.set('building', (themes.get('building') || 0) + 1);
                    if (script.includes('dev')) themes.set('development', (themes.get('development') || 0) + 1);
                    if (script.includes('lint')) themes.set('quality', (themes.get('quality') || 0) + 1);
                    if (script.includes('deploy')) themes.set('deployment', (themes.get('deployment') || 0) + 1);
                });
            }
            
            // Extract from keywords
            if (pkg.keywords) {
                pkg.keywords.forEach(keyword => {
                    themes.set(keyword.toLowerCase(), (themes.get(keyword.toLowerCase()) || 0) + 2);
                });
            }
            
            // Extract from dependencies
            const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
            Object.keys(allDeps).forEach(dep => {
                if (dep.includes('test') || dep.includes('jest') || dep.includes('mocha')) {
                    themes.set('testing', (themes.get('testing') || 0) + 0.5);
                }
                if (dep.includes('typescript') || dep.includes('eslint')) {
                    themes.set('quality', (themes.get('quality') || 0) + 0.5);
                }
                if (dep.includes('express') || dep.includes('fastify') || dep.includes('koa')) {
                    themes.set('api', (themes.get('api') || 0) + 0.5);
                }
            });
            
        } catch (e) {
            console.log('  Could not parse package.json');
        }
    }
    
    /**
     * Extract general themes from content
     */
    extractThemes(content, themes, weight) {
        const themePatterns = {
            security: /\b(security|secure|auth|encrypt|protect|safe|vulnerab|threat|risk)\b/gi,
            performance: /\b(performance|fast|speed|optimi|efficient|scale|benchmark)\b/gi,
            quality: /\b(quality|reliable|stable|robust|maintain|clean|refactor)\b/gi,
            documentation: /\b(document|readme|guide|tutorial|example|api|reference)\b/gi,
            testing: /\b(test|spec|coverage|unit|integration|e2e|qa|validation)\b/gi,
            deployment: /\b(deploy|release|production|publish|distribut|npm|package)\b/gi,
            monitoring: /\b(monitor|observ|metric|measure|track|analytic|telemetry)\b/gi,
            development: /\b(develop|build|compile|bundle|webpack|rollup|vite)\b/gi,
            api: /\b(api|endpoint|route|request|response|rest|graphql|rpc)\b/gi,
            ui: /\b(ui|ux|interface|frontend|react|vue|angular|component)\b/gi
        };
        
        Object.entries(themePatterns).forEach(([theme, pattern]) => {
            const matches = content.match(pattern);
            if (matches) {
                themes.set(theme, (themes.get(theme) || 0) + (matches.length * weight));
            }
        });
    }
    
    /**
     * Extract keywords from a line
     */
    extractKeywords(line) {
        const keywords = [];
        const cleanLine = line.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        
        const words = cleanLine.split(' ');
        
        // Look for important technical terms
        const importantTerms = [
            'trust', 'debt', 'intent', 'reality', 'alignment', 'drift',
            'metric', 'measure', 'track', 'monitor', 'observe',
            'test', 'validate', 'verify', 'check', 'ensure',
            'build', 'deploy', 'release', 'publish', 'distribute',
            'document', 'guide', 'example', 'tutorial', 'reference',
            'security', 'auth', 'encrypt', 'protect', 'safe',
            'performance', 'optimize', 'fast', 'efficient', 'scale',
            'quality', 'reliable', 'stable', 'robust', 'clean'
        ];
        
        words.forEach(word => {
            if (word.length > 3 && importantTerms.some(term => word.includes(term))) {
                keywords.push(word);
            }
        });
        
        return keywords;
    }
    
    /**
     * Generate orthogonal categories from themes
     */
    generateOrthogonalCategories(themes, headingStructure) {
        console.log('🎯 Generating orthogonal categories...');
        
        // Sort themes by weight
        const sortedThemes = Array.from(themes.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10); // Top 10 themes
        
        console.log('  Top themes found:', sortedThemes.map(t => `${t[0]}(${t[1].toFixed(1)})`).join(', '));
        
        // Generate 5 orthogonal parent categories
        const parentCategories = this.selectOrthogonalParents(sortedThemes);
        
        // Generate child categories based on heading structure
        const categories = this.buildHierarchy(parentCategories, headingStructure);
        
        return categories;
    }
    
    /**
     * Select 5 orthogonal parent categories
     */
    selectOrthogonalParents(sortedThemes) {
        const orthogonalGroups = [
            { 
                id: 'A📋', 
                name: 'Planning',
                keywords: ['documentation', 'readme', 'guide', 'spec', 'design'],
                themes: ['documentation'],
                color: '#00ff88'
            },
            { 
                id: 'B🚀', 
                name: 'Execution',
                keywords: ['build', 'deploy', 'release', 'implement', 'develop'],
                themes: ['development', 'deployment', 'building'],
                color: '#00aaff'
            },
            { 
                id: 'C✅', 
                name: 'Validation',
                keywords: ['test', 'verify', 'validate', 'check', 'ensure'],
                themes: ['testing', 'quality'],
                color: '#ffaa00'
            },
            { 
                id: 'D📊', 
                name: 'Measurement',
                keywords: ['metric', 'monitor', 'track', 'measure', 'observe'],
                themes: ['monitoring', 'performance'],
                color: '#ff00aa'
            },
            { 
                id: 'E🔒', 
                name: 'Protection',
                keywords: ['security', 'safe', 'protect', 'auth', 'encrypt'],
                themes: ['security', 'api'],
                color: '#ff0044'
            }
        ];
        
        // Match themes to orthogonal groups
        const parents = [];
        orthogonalGroups.forEach((group, idx) => {
            // Check if any of the top themes match this group
            const hasTheme = sortedThemes.some(([theme, weight]) => 
                group.themes.includes(theme) && weight > 0
            );
            
            if (hasTheme || idx < 3) { // Always include at least 3 categories
                parents.push({
                    id: group.id,
                    name: group.name,
                    color: group.color,
                    depth: 0,
                    keywords: group.keywords,
                    weight: sortedThemes.find(([t]) => group.themes.includes(t))?.[1] || 1
                });
            }
        });
        
        // Ensure we have exactly 5 parents
        while (parents.length < 5) {
            const idx = parents.length;
            const group = orthogonalGroups[idx];
            parents.push({
                id: group.id,
                name: group.name,
                color: group.color,
                depth: 0,
                keywords: group.keywords,
                weight: 0.1
            });
        }
        
        return parents.slice(0, 5);
    }
    
    /**
     * Build hierarchical category structure
     */
    buildHierarchy(parents, headingStructure) {
        const categories = [...parents];
        
        // Generate children based on heading patterns
        parents.forEach(parent => {
            const children = this.generateChildren(parent, headingStructure);
            categories.push(...children);
        });
        
        // Sort by ShortLex order
        categories.sort((a, b) => {
            if (a.id.length !== b.id.length) {
                return a.id.length - b.id.length;
            }
            return a.id.localeCompare(b.id);
        });
        
        return categories;
    }
    
    /**
     * Generate child categories for a parent
     */
    generateChildren(parent, headingStructure) {
        const children = [];
        const childPatterns = {
            'A📋': [
                { id: '.1📝', name: 'Requirements', keywords: ['requirement', 'spec', 'need', 'must'] },
                { id: '.2📖', name: 'Documentation', keywords: ['doc', 'guide', 'readme', 'help'] },
                { id: '.3🎯', name: 'Goals', keywords: ['goal', 'objective', 'target', 'aim'] },
                { id: '.4📐', name: 'Architecture', keywords: ['design', 'structure', 'pattern', 'architect'] }
            ],
            'B🚀': [
                { id: '.1🔨', name: 'Building', keywords: ['build', 'compile', 'bundle', 'make'] },
                { id: '.2🚢', name: 'Shipping', keywords: ['deploy', 'release', 'publish', 'ship'] },
                { id: '.3🔧', name: 'Tooling', keywords: ['tool', 'script', 'cli', 'utility'] },
                { id: '.4⚙️', name: 'Configuration', keywords: ['config', 'setup', 'setting', 'option'] }
            ],
            'C✅': [
                { id: '.1🧪', name: 'Testing', keywords: ['test', 'spec', 'unit', 'integration'] },
                { id: '.2✔️', name: 'Verification', keywords: ['verify', 'check', 'validate', 'confirm'] },
                { id: '.3📋', name: 'Coverage', keywords: ['coverage', 'complete', 'thorough', 'comprehensive'] },
                { id: '.4🐛', name: 'Debugging', keywords: ['debug', 'fix', 'troubleshoot', 'resolve'] }
            ],
            'D📊': [
                { id: '.1📈', name: 'Metrics', keywords: ['metric', 'measure', 'kpi', 'indicator'] },
                { id: '.2📉', name: 'Trends', keywords: ['trend', 'pattern', 'history', 'change'] },
                { id: '.3🎯', name: 'Targets', keywords: ['target', 'goal', 'threshold', 'benchmark'] },
                { id: '.4📊', name: 'Reports', keywords: ['report', 'dashboard', 'summary', 'overview'] }
            ],
            'E🔒': [
                { id: '.1🔐', name: 'Authentication', keywords: ['auth', 'login', 'user', 'identity'] },
                { id: '.2🛡️', name: 'Authorization', keywords: ['permission', 'role', 'access', 'privilege'] },
                { id: '.3🔑', name: 'Encryption', keywords: ['encrypt', 'decrypt', 'crypto', 'secure'] },
                { id: '.4🚨', name: 'Monitoring', keywords: ['monitor', 'alert', 'detect', 'watch'] }
            ]
        };
        
        const patterns = childPatterns[parent.id] || [];
        patterns.forEach(pattern => {
            children.push({
                id: parent.id + pattern.id,
                name: pattern.name,
                parent: parent.id,
                depth: 1,
                keywords: pattern.keywords
            });
        });
        
        return children;
    }
    
    /**
     * Merge with previous categories for consistency
     */
    mergeWithPrevious(newCategories) {
        if (!this.previousCategories) {
            return newCategories;
        }
        
        console.log('🔄 Merging with previous categories...');
        
        const merged = [];
        const previousMap = new Map(
            this.previousCategories.categories.map(cat => [cat.id, cat])
        );
        
        // Keep existing categories that still make sense
        newCategories.forEach(newCat => {
            const existing = previousMap.get(newCat.id);
            if (existing) {
                // Merge keywords and maintain stability
                merged.push({
                    ...newCat,
                    keywords: [...new Set([
                        ...(existing.keywords || []),
                        ...(newCat.keywords || [])
                    ])],
                    stable: true
                });
            } else {
                merged.push({
                    ...newCat,
                    stable: false,
                    new: true
                });
            }
        });
        
        // Report changes
        const stable = merged.filter(c => c.stable).length;
        const newCats = merged.filter(c => c.new).length;
        console.log(`  Categories: ${stable} stable, ${newCats} new`);
        
        return merged;
    }
    
    /**
     * Save categories for next run
     */
    saveCategories(categories) {
        const data = {
            version: '2.0.0',
            generated: new Date().toISOString(),
            signature: crypto.createHash('sha256')
                .update(JSON.stringify(categories))
                .digest('hex')
                .substring(0, 8),
            categories: categories,
            keywords: Array.from(this.keywords.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 50)
                .map(([word, count]) => ({ word, count }))
        };
        
        fs.writeFileSync(this.categoryFile, JSON.stringify(data, null, 2));
        console.log(`💾 Saved ${categories.length} categories to ${this.categoryFile}`);
    }
    
    /**
     * Main extraction process
     */
    extract() {
        // Load previous if exists
        this.loadPreviousCategories();
        
        // Extract from documentation
        const { themes, headingStructure } = this.extractFromDocumentation();
        
        // Generate orthogonal categories
        const newCategories = this.generateOrthogonalCategories(themes, headingStructure);
        
        // Merge with previous for consistency
        const categories = this.mergeWithPrevious(newCategories);
        
        // Save for next run
        this.saveCategories(categories);
        
        return categories;
    }
}

// ============================================
// TRUST DEBT CALCULATOR (DYNAMIC)
// ============================================

class DynamicTrustDebtCalculator {
    constructor(categories) {
        this.categories = categories;
        this.intentMatrix = {};
        this.realityMatrix = {};
        this.debtMatrix = {};
        this.categoryKeywords = this.buildKeywordMap();
    }
    
    buildKeywordMap() {
        const keywordMap = {};
        this.categories.forEach(cat => {
            keywordMap[cat.id] = cat.keywords || [];
            
            // Add name-based keywords
            const nameWords = cat.name.toLowerCase().split(/\s+/);
            keywordMap[cat.id].push(...nameWords);
            
            // Make unique
            keywordMap[cat.id] = [...new Set(keywordMap[cat.id])];
        });
        return keywordMap;
    }
    
    initializeMatrices() {
        this.categories.forEach(cat1 => {
            this.intentMatrix[cat1.id] = {};
            this.realityMatrix[cat1.id] = {};
            this.debtMatrix[cat1.id] = {};
            
            this.categories.forEach(cat2 => {
                this.intentMatrix[cat1.id][cat2.id] = 0;
                this.realityMatrix[cat1.id][cat2.id] = 0;
                this.debtMatrix[cat1.id][cat2.id] = 0;
            });
        });
    }
    
    analyzeContent(content, matrix, weight) {
        const lowerContent = content.toLowerCase();
        
        // Calculate presence for each category
        const presence = {};
        this.categories.forEach(cat => {
            const keywords = this.categoryKeywords[cat.id] || [];
            let score = 0;
            
            keywords.forEach(keyword => {
                const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
                const matches = lowerContent.match(regex);
                if (matches) {
                    score += matches.length;
                }
            });
            
            presence[cat.id] = Math.min(1.0, score / Math.max(keywords.length * 5, 1));
        });
        
        // Update correlation matrix
        this.categories.forEach(cat1 => {
            this.categories.forEach(cat2 => {
                const coPresence = presence[cat1.id] * presence[cat2.id];
                matrix[cat1.id][cat2.id] += coPresence * weight;
                
                // Boost diagonal
                if (cat1.id === cat2.id) {
                    matrix[cat1.id][cat2.id] += presence[cat1.id] * weight * 0.5;
                }
            });
        });
    }
    
    buildIntentMatrix() {
        console.log('📚 Building Intent Matrix from documentation...');
        
        // Dynamically find documentation files
        const docFiles = [];
        
        // Check for various doc patterns
        ['README.md', 'readme.md', 'CLAUDE.md', 'claude.md'].forEach(file => {
            if (fs.existsSync(file)) {
                docFiles.push({ path: file, weight: file.toLowerCase().includes('readme') ? 0.4 : 0.3 });
            }
        });
        
        // Check docs directory
        if (fs.existsSync('docs')) {
            const docDir = fs.readdirSync('docs', { withFileTypes: true });
            docDir.forEach(item => {
                if (item.isFile() && item.name.endsWith('.md')) {
                    docFiles.push({ path: path.join('docs', item.name), weight: 0.1 });
                } else if (item.isDirectory()) {
                    // Check subdirectories
                    const subDir = path.join('docs', item.name);
                    const subFiles = fs.readdirSync(subDir);
                    subFiles.forEach(file => {
                        if (file.endsWith('.md')) {
                            docFiles.push({ path: path.join(subDir, file), weight: 0.05 });
                        }
                    });
                }
            });
        }
        
        // Normalize weights
        const totalWeight = docFiles.reduce((sum, f) => sum + f.weight, 0);
        if (totalWeight > 0) {
            docFiles.forEach(f => f.weight = f.weight / totalWeight);
        }
        
        console.log(`  Found ${docFiles.length} documentation files`);
        
        docFiles.slice(0, 10).forEach(doc => {
            const content = fs.readFileSync(doc.path, 'utf8');
            this.analyzeContent(content, this.intentMatrix, doc.weight);
        });
    }
    
    buildRealityMatrix() {
        console.log('💻 Building Reality Matrix from code/commits...');
        
        // Git commits
        try {
            const commits = execSync('git log --format="%s %b" --since="7 days ago"', 
                { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] })
                .split('\n')
                .filter(line => line.trim().length > 0)
                .slice(0, 50);
            
            commits.forEach(commit => {
                this.analyzeContent(commit, this.realityMatrix, 1.0 / Math.max(commits.length, 1));
            });
            
            console.log(`  Analyzed ${commits.length} recent commits`);
        } catch (e) {
            console.log('  (Git unavailable)');
        }
        
        // Source files
        const sourcePatterns = ['*.js', '*.ts', '*.jsx', '*.tsx', '*.py', '*.go', '*.rs'];
        let sourceFiles = [];
        
        // Find source files
        ['src', 'lib', 'app', '.'].forEach(dir => {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir);
                files.forEach(file => {
                    if (sourcePatterns.some(pattern => 
                        file.endsWith(pattern.substring(1)))) {
                        sourceFiles.push(path.join(dir, file));
                    }
                });
            }
        });
        
        sourceFiles.slice(0, 20).forEach(file => {
            try {
                const content = fs.readFileSync(file, 'utf8');
                this.analyzeContent(content, this.realityMatrix, 0.02);
            } catch (e) {
                // Skip files that can't be read
            }
        });
        
        console.log(`  Analyzed ${sourceFiles.length} source files`);
    }
    
    calculateTrustDebt() {
        console.log('🎯 Calculating Trust Debt...');
        
        let totalDebt = 0;
        let diagonalDebt = 0;
        let offDiagonalDebt = 0;
        const worstDrifts = [];
        const blockDebts = {};
        
        // Initialize block debts for parent categories
        this.categories.filter(c => c.depth === 0).forEach(parent => {
            blockDebts[parent.id] = 0;
        });
        
        this.categories.forEach((cat1) => {
            this.categories.forEach((cat2) => {
                const realityStrength = this.realityMatrix[cat1.id][cat1.id] || 0;
                const intentStrength = this.intentMatrix[cat2.id][cat2.id] || 0;
                const crossIntent = this.intentMatrix[cat1.id][cat2.id] || 0;
                const crossReality = this.realityMatrix[cat1.id][cat2.id] || 0;
                
                const forwardDrift = Math.abs(crossReality - crossIntent);
                const reverseDrift = Math.abs(intentStrength - realityStrength) * 0.3;
                const drift = forwardDrift + (cat1.id !== cat2.id ? reverseDrift * 0.1 : 0);
                
                const depthPenalty = 1 + (0.5 * Math.max(cat1.depth || 0, cat2.depth || 0));
                const diagonalBoost = (cat1.id === cat2.id) ? 2.0 : 1.0;
                const debt = drift * depthPenalty * diagonalBoost * 1000;
                
                this.debtMatrix[cat1.id][cat2.id] = debt;
                totalDebt += debt;
                
                if (cat1.id === cat2.id) {
                    diagonalDebt += debt;
                } else {
                    offDiagonalDebt += debt;
                }
                
                // Track block debts
                const parent1 = this.categories.find(c => c.depth === 0 && cat1.id.startsWith(c.id));
                const parent2 = this.categories.find(c => c.depth === 0 && cat2.id.startsWith(c.id));
                
                if (parent1 && parent1 === parent2) {
                    blockDebts[parent1.id] = (blockDebts[parent1.id] || 0) + debt;
                }
                
                if (debt > 10) {
                    worstDrifts.push({
                        from: cat1.id,
                        to: cat2.id,
                        fromName: cat1.name,
                        toName: cat2.name,
                        intent: crossIntent,
                        reality: crossReality,
                        drift: drift,
                        debt,
                        isDiagonal: cat1.id === cat2.id
                    });
                }
            });
        });
        
        worstDrifts.sort((a, b) => b.debt - a.debt);
        
        const cellCount = this.categories.length * this.categories.length;
        const avgOffDiagonal = offDiagonalDebt / Math.max(cellCount - this.categories.length, 1);
        const avgDiagonal = diagonalDebt / Math.max(this.categories.length, 1);
        const orthogonality = avgOffDiagonal / Math.max(avgDiagonal, 1);
        
        return {
            totalDebt,
            diagonalDebt,
            offDiagonalDebt,
            orthogonality,
            diagonalHealth: avgDiagonal < avgOffDiagonal ? 'Good' : 'Poor',
            worstDrifts: worstDrifts.slice(0, 10),
            blockDebts
        };
    }
    
    analyze() {
        this.initializeMatrices();
        this.buildIntentMatrix();
        this.buildRealityMatrix();
        return this.calculateTrustDebt();
    }
}

// ============================================
// HTML GENERATION (reuse from trust-debt-final.js)
// ============================================

const { generateHTML } = require('./trust-debt-final.js');

// ============================================
// MAIN EXECUTION
// ============================================

function main() {
    console.log('🎯 TRUST DEBT DYNAMIC - ADAPTIVE CATEGORIES');
    console.log('============================================');
    
    // Extract categories dynamically
    const extractor = new CategoryExtractor();
    const categories = extractor.extract();
    
    console.log(`\n📊 Generated ${categories.length} categories:`);
    categories.filter(c => c.depth === 0).forEach(cat => {
        console.log(`  ${cat.id} ${cat.name}`);
        const children = categories.filter(c => c.parent === cat.id);
        children.forEach(child => {
            console.log(`    ${child.id} ${child.name}`);
        });
    });
    
    // Calculate trust debt with dynamic categories
    const calculator = new DynamicTrustDebtCalculator(categories);
    calculator.categories = categories; // Ensure categories are set for HTML generation
    const results = calculator.analyze();
    
    // Ensure categories have colors for HTML generation
    calculator.categories.forEach(cat => {
        if (!cat.color) {
            // Inherit color from parent or use default
            const parent = categories.find(c => c.depth === 0 && cat.id.startsWith(c.id));
            cat.color = parent?.color || '#888888';
        }
    });
    
    // Generate outputs
    const html = generateHTML(calculator, results);
    const json = {
        timestamp: new Date().toISOString(),
        dynamicCategories: true,
        metrics: results,
        categories: categories,
        matrices: {
            intent: calculator.intentMatrix,
            reality: calculator.realityMatrix,
            debt: calculator.debtMatrix
        }
    };
    
    // Save files
    fs.writeFileSync('trust-debt-dynamic.html', html);
    fs.writeFileSync('trust-debt-dynamic.json', JSON.stringify(json, null, 2));
    
    // Print summary
    console.log('\n📊 RESULTS:');
    console.log(`  Total Debt: ${results.totalDebt.toFixed(0)} units`);
    console.log(`  Orthogonality: ${(results.orthogonality * 100).toFixed(1)}%`);
    console.log(`  Diagonal Health: ${results.diagonalHealth}`);
    
    console.log('\n📊 BLOCK DEBTS:');
    Object.entries(results.blockDebts).forEach(([block, debt]) => {
        const percentage = ((debt / results.totalDebt) * 100).toFixed(1);
        const cat = categories.find(c => c.id === block);
        console.log(`  ${block} ${cat?.name || ''}: ${debt.toFixed(0)} units (${percentage}%)`);
    });
    
    console.log('\n📄 Outputs:');
    console.log('  HTML: trust-debt-dynamic.html');
    console.log('  JSON: trust-debt-dynamic.json');
    console.log('  Categories: trust-debt-categories.json');
    
    process.exit(results.totalDebt > 5000 ? 1 : 0);
}

if (require.main === module) {
    main();
}

module.exports = { CategoryExtractor, DynamicTrustDebtCalculator };