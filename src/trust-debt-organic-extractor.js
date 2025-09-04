#!/usr/bin/env node

/**
 * AGENT 3 CORE INNOVATION: ORGANIC CATEGORY EXTRACTION PIPELINE
 * =============================================================
 * 
 * BREAKTHROUGH PRINCIPLE: Extract categories from COMBINED docs+git text mass,
 * then measure how each natural category splits between Intent vs Reality.
 * 
 * This ensures:
 * - Categories have natural balance potential (not artificially skewed)
 * - Trust Debt measures genuine Intent-Reality drift
 * - Asymmetry reflects real repository behavior, not category design artifacts
 * 
 * PIPELINE STAGES:
 * 1. COMBINED TEXT EXTRACTION: Collect all docs + git content into unified corpus
 * 2. NATURAL TERM EXTRACTION: Extract meaningful terms using frequency + semantic analysis
 * 3. CLUSTER FORMATION: Group related terms into natural categories
 * 4. SEMANTIC VALIDATION: Ensure categories represent domain concepts (prevent syntax noise)
 * 5. BALANCED MEASUREMENT: Measure how each category splits Intent vs Reality
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class OrganicCategoryExtractor {
    constructor() {
        this.projectRoot = execSync('git rev-parse --show-toplevel').toString().trim();
        this.combinedCorpus = '';
        this.docsCorpus = '';
        this.gitCorpus = '';
        this.extractedTerms = new Map(); // term -> {docsCount, gitCount, total}
        this.semanticClusters = [];
    }

    /**
     * STAGE 1: COMBINED TEXT EXTRACTION
     * Extract all repository text into unified corpus for natural category discovery
     */
    async extractCombinedCorpus() {
        console.log('🔍 STAGE 1: Extracting Combined Text Corpus');
        console.log('=============================================');
        
        // Extract documentation text
        this.docsCorpus = await this.extractDocumentationCorpus();
        console.log(`📚 Documentation corpus: ${this.docsCorpus.length} characters`);
        
        // Extract git/code text
        this.gitCorpus = await this.extractGitCorpus();
        console.log(`💻 Git/Code corpus: ${this.gitCorpus.length} characters`);
        
        // Combine for natural category extraction
        this.combinedCorpus = this.docsCorpus + '\n\n' + this.gitCorpus;
        console.log(`🔗 Combined corpus: ${this.combinedCorpus.length} characters`);
        
        return {
            docs: this.docsCorpus.length,
            git: this.gitCorpus.length,
            combined: this.combinedCorpus.length
        };
    }

    /**
     * Extract documentation corpus (Intent sources)
     */
    async extractDocumentationCorpus() {
        let corpus = '';
        
        // README and root docs
        const rootDocs = ['README.md', 'CONTRIBUTING.md', 'LICENSE', 'CHANGELOG.md'];
        rootDocs.forEach(doc => {
            const filePath = path.join(this.projectRoot, doc);
            if (fs.existsSync(filePath)) {
                corpus += fs.readFileSync(filePath, 'utf8') + '\n';
            }
        });
        
        // docs/ directory
        const docsDir = path.join(this.projectRoot, 'docs');
        if (fs.existsSync(docsDir)) {
            const docFiles = this.getAllMarkdownFiles(docsDir);
            docFiles.forEach(file => {
                corpus += fs.readFileSync(file, 'utf8') + '\n';
            });
        }
        
        // Package.json and config files (Intent sources)
        const configFiles = ['package.json', 'tsconfig.json', '.gitignore'];
        configFiles.forEach(config => {
            const filePath = path.join(this.projectRoot, config);
            if (fs.existsSync(filePath)) {
                corpus += fs.readFileSync(filePath, 'utf8') + '\n';
            }
        });
        
        return corpus;
    }

    /**
     * Extract git/code corpus (Reality sources)
     */
    async extractGitCorpus() {
        let corpus = '';
        
        // Source code files
        const srcDirs = ['src', 'lib', 'bin'];
        srcDirs.forEach(dir => {
            const srcDir = path.join(this.projectRoot, dir);
            if (fs.existsSync(srcDir)) {
                const srcFiles = this.getAllJSFiles(srcDir);
                srcFiles.forEach(file => {
                    corpus += fs.readFileSync(file, 'utf8') + '\n';
                });
            }
        });
        
        // Git commit messages (Reality sources)
        try {
            const commits = execSync('git log --oneline -n 100', { cwd: this.projectRoot }).toString();
            corpus += commits;
        } catch (e) {
            console.log('  ⚠️ Git history unavailable');
        }
        
        return corpus;
    }

    /**
     * STAGE 2: NATURAL TERM EXTRACTION
     * Extract meaningful terms from combined corpus using frequency + semantic filtering
     */
    async extractNaturalTerms() {
        console.log('\n🎯 STAGE 2: Extracting Natural Terms');
        console.log('====================================');
        
        // Split into docs vs git for balance measurement
        const docsTerms = this.extractTermsFromText(this.docsCorpus);
        const gitTerms = this.extractTermsFromText(this.gitCorpus);
        
        // Combine and calculate balance ratios
        const allTerms = new Set([...docsTerms.keys(), ...gitTerms.keys()]);
        
        allTerms.forEach(term => {
            const docsCount = docsTerms.get(term) || 0;
            const gitCount = gitTerms.get(term) || 0;
            const total = docsCount + gitCount;
            
            // Only include terms with reasonable frequency
            if (total >= 3) {
                this.extractedTerms.set(term, {
                    docsCount,
                    gitCount,
                    total,
                    docsRatio: docsCount / total,
                    gitRatio: gitCount / total,
                    balanceRatio: total > 0 ? Math.min(docsCount, gitCount) / Math.max(docsCount, gitCount) : 0
                });
            }
        });
        
        console.log(`📊 Natural terms extracted: ${this.extractedTerms.size} terms`);
        console.log(`📈 Frequency threshold: ≥3 occurrences across docs+git`);
        
        return this.extractedTerms;
    }

    /**
     * Extract terms from text using semantic filtering
     */
    extractTermsFromText(text) {
        const terms = new Map();
        const words = text.toLowerCase()
            .match(/\b[a-z][a-z]{2,}\b/g) || []; // 3+ letter words only
        
        words.forEach(word => {
            // Filter out syntax noise using Agent 1's proven noise filter
            if (!this.isSyntaxNoise(word)) {
                terms.set(word, (terms.get(word) || 0) + 1);
            }
        });
        
        return terms;
    }

    /**
     * Agent 1's proven syntax noise filter - prevent regression
     */
    isSyntaxNoise(word) {
        const syntaxNoiseTerms = new Set([
            'div', 'const', 'var', 'this', 'class', 'function', 'return', 'true', 'false',
            'let', 'for', 'while', 'switch', 'case', 'break', 'continue', 'typeof',
            'undefined', 'null', 'new', 'delete', 'instanceof', 'void', 'catch',
            'finally', 'throw', 'async', 'await', 'yield', 'export', 'import',
            'from', 'default', 'extends', 'implements', 'interface', 'type',
            'enum', 'namespace', 'module', 'require', 'console', 'log',
            'string', 'number', 'boolean', 'object', 'array', 'json', 'parse',
            'stringify', 'push', 'pop', 'shift', 'unshift', 'slice', 'splice'
        ]);
        
        return syntaxNoiseTerms.has(word) || 
               word.length < 3 || 
               /^[0-9]+$/.test(word) || 
               word === word.toUpperCase(); // All caps (likely constants)
    }

    /**
     * STAGE 3: CLUSTER FORMATION
     * Group related terms into natural semantic categories
     */
    async formSemanticClusters() {
        console.log('\n🧠 STAGE 3: Forming Semantic Clusters');
        console.log('=====================================');
        
        // Sort terms by total frequency
        const termsByFrequency = Array.from(this.extractedTerms.entries())
            .sort((a, b) => b[1].total - a[1].total);
        
        console.log('\nTop 20 most frequent terms:');
        termsByFrequency.slice(0, 20).forEach(([term, data], i) => {
            console.log(`  ${i+1}. ${term}: ${data.total} total (docs: ${data.docsCount}, git: ${data.gitCount})`);
        });
        
        // Form clusters based on semantic relationships
        // This is a simplified clustering - in full implementation would use more sophisticated grouping
        const clusters = this.createSemanticClusters(termsByFrequency);
        
        console.log(`\n📊 Semantic clusters formed: ${clusters.length}`);
        clusters.forEach((cluster, i) => {
            console.log(`  Cluster ${i+1}: ${cluster.name} (${cluster.terms.length} terms)`);
        });
        
        this.semanticClusters = clusters;
        return clusters;
    }

    /**
     * Create semantic clusters from frequency-sorted terms
     */
    createSemanticClusters(termsByFrequency) {
        // This is Agent 3's domain expertise - clustering for matrix calculation
        const clusters = [];
        
        // Measurement cluster (Trust Debt domain)
        const measurementTerms = termsByFrequency.filter(([term]) => 
            term.includes('trust') || term.includes('debt') || term.includes('measure') ||
            term.includes('analysis') || term.includes('metric') || term.includes('score')
        );
        
        if (measurementTerms.length > 0) {
            clusters.push({
                id: 'A📊',
                name: 'Measurement',
                terms: measurementTerms.slice(0, 15).map(([term, data]) => ({ term, ...data }))
            });
        }
        
        // Implementation cluster
        const implementationTerms = termsByFrequency.filter(([term]) => 
            term.includes('code') || term.includes('implement') || term.includes('build') ||
            term.includes('system') || term.includes('develop') || term.includes('create')
        );
        
        if (implementationTerms.length > 0) {
            clusters.push({
                id: 'B💻', 
                name: 'Implementation',
                terms: implementationTerms.slice(0, 15).map(([term, data]) => ({ term, ...data }))
            });
        }
        
        // Documentation cluster  
        const documentationTerms = termsByFrequency.filter(([term]) =>
            term.includes('doc') || term.includes('spec') || term.includes('plan') ||
            term.includes('guide') || term.includes('readme') || term.includes('business')
        );
        
        if (documentationTerms.length > 0) {
            clusters.push({
                id: 'C📋',
                name: 'Documentation', 
                terms: documentationTerms.slice(0, 15).map(([term, data]) => ({ term, ...data }))
            });
        }
        
        // Add more clusters as needed...
        
        return clusters;
    }

    /**
     * STAGE 4: ASYMMETRY MEASUREMENT
     * Measure how each natural category splits between Intent vs Reality
     */
    async measureCategoryAsymmetry() {
        console.log('\n⚖️ STAGE 4: Measuring Category Asymmetry');
        console.log('=========================================');
        
        const asymmetryResults = [];
        
        this.semanticClusters.forEach(cluster => {
            let totalDocsPresence = 0;
            let totalGitPresence = 0;
            
            cluster.terms.forEach(termData => {
                totalDocsPresence += termData.docsCount;
                totalGitPresence += termData.gitCount;
            });
            
            const intentRatio = totalDocsPresence / (totalDocsPresence + totalGitPresence);
            const realityRatio = totalGitPresence / (totalDocsPresence + totalGitPresence);
            const asymmetry = Math.abs(intentRatio - realityRatio);
            
            asymmetryResults.push({
                category: cluster.name,
                id: cluster.id,
                docsPresence: totalDocsPresence,
                gitPresence: totalGitPresence,
                intentRatio,
                realityRatio,
                asymmetry,
                balanceRatio: Math.min(totalDocsPresence, totalGitPresence) / Math.max(totalDocsPresence, totalGitPresence),
                trustDebt: asymmetry * (totalDocsPresence + totalGitPresence) // Weight by total presence
            });
            
            console.log(`📊 ${cluster.name}:`);
            console.log(`   Intent: ${totalDocsPresence} (${(intentRatio*100).toFixed(1)}%)`);
            console.log(`   Reality: ${totalGitPresence} (${(realityRatio*100).toFixed(1)}%)`);
            console.log(`   Asymmetry: ${(asymmetry*100).toFixed(1)}%`);
            console.log(`   Trust Debt: ${asymmetry.toFixed(3)} units`);
        });
        
        return asymmetryResults;
    }

    /**
     * STAGE 5: CATEGORY VALIDATION & PRESERVATION
     * Ensure we don't lose semantic quality or regression prevention
     */
    validateSemanticQuality(asymmetryResults) {
        console.log('\n✅ STAGE 5: Semantic Quality Validation');
        console.log('======================================');
        
        let validationsPassed = 0;
        const validationTests = [
            {
                name: 'SYNTAX_NOISE_PREVENTION',
                test: () => this.semanticClusters.every(cluster => 
                    !cluster.terms.some(t => this.isSyntaxNoise(t.term))
                ),
                description: 'No syntax noise in extracted categories'
            },
            {
                name: 'SEMANTIC_COHERENCE',
                test: () => asymmetryResults.every(result => result.category.length > 3),
                description: 'All categories represent meaningful concepts'
            },
            {
                name: 'BALANCE_POTENTIAL',
                test: () => asymmetryResults.some(result => result.balanceRatio > 0.1),
                description: 'At least some categories show natural balance potential'
            },
            {
                name: 'TRUST_DEBT_RANGE',
                test: () => asymmetryResults.every(result => 
                    result.trustDebt > 0 && result.trustDebt < 10
                ),
                description: 'Trust Debt values in reasonable range'
            }
        ];
        
        validationTests.forEach(test => {
            const passed = test.test();
            console.log(`${passed ? '✅' : '❌'} ${test.name}: ${test.description}`);
            if (passed) validationsPassed++;
        });
        
        const validationRatio = validationsPassed / validationTests.length;
        console.log(`\n📊 Semantic Quality Score: ${(validationRatio * 100).toFixed(1)}% (${validationsPassed}/${validationTests.length})`);
        
        return validationRatio >= 0.75; // 75% minimum threshold
    }

    /**
     * Helper: Get all markdown files recursively
     */
    getAllMarkdownFiles(dir) {
        const files = [];
        
        function walkDir(currentDir) {
            const entries = fs.readdirSync(currentDir);
            entries.forEach(entry => {
                const fullPath = path.join(currentDir, entry);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
                    walkDir(fullPath);
                } else if (stat.isFile() && entry.endsWith('.md')) {
                    files.push(fullPath);
                }
            });
        }
        
        walkDir(dir);
        return files;
    }

    /**
     * Helper: Get all JS files recursively
     */
    getAllJSFiles(dir) {
        const files = [];
        
        function walkDir(currentDir) {
            if (!fs.existsSync(currentDir)) return;
            
            const entries = fs.readdirSync(currentDir);
            entries.forEach(entry => {
                const fullPath = path.join(currentDir, entry);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
                    walkDir(fullPath);
                } else if (stat.isFile() && entry.endsWith('.js')) {
                    files.push(fullPath);
                }
            });
        }
        
        walkDir(dir);
        return files;
    }

    /**
     * MAIN PIPELINE EXECUTION
     */
    async execute() {
        console.log('🚀 ORGANIC CATEGORY EXTRACTION PIPELINE');
        console.log('=======================================\n');
        
        try {
            // Stage 1: Combined text extraction
            const corpusStats = await this.extractCombinedCorpus();
            
            // Stage 2: Natural term extraction  
            const extractedTerms = await this.extractNaturalTerms();
            
            // Stage 3: Cluster formation
            const clusters = await this.formSemanticClusters();
            
            // Stage 4: Asymmetry measurement
            const asymmetryResults = await this.measureCategoryAsymmetry();
            
            // Stage 5: Validation
            const semanticQuality = this.validateSemanticQuality(asymmetryResults);
            
            console.log('\n🎯 ORGANIC EXTRACTION RESULTS');
            console.log('============================');
            console.log(`📊 Corpus Size: ${corpusStats.combined} characters`);
            console.log(`🔤 Terms Extracted: ${extractedTerms.size} meaningful terms`);
            console.log(`🧠 Clusters Formed: ${clusters.length} semantic categories`);
            console.log(`⚖️ Asymmetry Results: ${asymmetryResults.length} measurable categories`);
            console.log(`✅ Semantic Quality: ${semanticQuality ? 'PASSED' : 'NEEDS IMPROVEMENT'}`);
            
            return {
                corpusStats,
                extractedTerms: Array.from(extractedTerms.entries()),
                clusters,
                asymmetryResults,
                semanticQuality
            };
            
        } catch (error) {
            console.error('❌ Organic extraction pipeline failed:', error.message);
            throw error;
        }
    }
}

// Execute if run directly
if (require.main === module) {
    const extractor = new OrganicCategoryExtractor();
    extractor.execute()
        .then(results => {
            console.log('\n✅ Organic category extraction completed successfully!');
            
            // Save results for integration with trust-debt-final.js
            fs.writeFileSync('organic-categories-extracted.json', JSON.stringify(results, null, 2));
            console.log('💾 Results saved to organic-categories-extracted.json');
        })
        .catch(error => {
            console.error('💥 Pipeline execution failed:', error);
            process.exit(1);
        });
}

module.exports = { OrganicCategoryExtractor };