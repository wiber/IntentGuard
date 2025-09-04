/**
 * Process Health Validation Script
 * Agent 2: Process Health Legitimacy Guardian - Additive Improvements
 * 
 * Automated validation of Process Health components with improved accuracy
 */

const fs = require('fs');
const path = require('path');

class ProcessHealthValidator {
    constructor() {
        this.categoriesPath = path.join(__dirname, '../trust-debt-categories.json');
        this.finalJsonPath = path.join(__dirname, '../trust-debt-final.json');
        this.finalHtmlPath = path.join(__dirname, '../trust-debt-final.html');
        this.validationResults = {};
    }

    /**
     * Validate semantic categories for proper conceptual structure
     */
    validateSemanticCategories() {
        console.log('🔍 Validating Semantic Categories...');
        
        try {
            const categories = JSON.parse(fs.readFileSync(this.categoriesPath, 'utf8'));
            
            // Refined syntax noise detection - avoid false positives
            const syntaxNoiseTerms = [
                // Core programming constructs
                'const', 'var', 'let', 'function', 'class', 'return', 'true', 'false',
                // HTML/DOM elements  
                'div', 'span', 'input', 'button', 'form', 'table', 'tr', 'td',
                // CSS properties
                'width', 'height', 'color', 'margin', 'padding', 'border',
                // Single characters/numbers
                'a', 'b', 'c', 'x', 'y', 'z', '1', '2', '3'
            ];
            
            const expectedSemanticCategories = [
                'Measurement', 'Implementation', 'Documentation', 'Visualization', 'Technical'
            ];
            
            let issues = [];
            let hasSemanticStructure = true;
            
            // Check for expected semantic categories
            const categoryNames = categories.categories.map(c => c.name);
            expectedSemanticCategories.forEach(expected => {
                if (!categoryNames.includes(expected)) {
                    issues.push(`Missing expected semantic category: ${expected}`);
                    hasSemanticStructure = false;
                }
            });
            
            // Check for actual syntax noise (stricter detection)
            categories.categories.forEach(category => {
                if (category.keywords) {
                    category.keywords.forEach(keyword => {
                        if (syntaxNoiseTerms.includes(keyword.toLowerCase().trim())) {
                            issues.push(`Syntax noise keyword "${keyword}" found in category "${category.name}"`);
                        }
                    });
                }
            });
            
            const validation = {
                passed: hasSemanticStructure && issues.length === 0,
                score: hasSemanticStructure ? (issues.length === 0 ? 100 : 75) : 0,
                issues: issues,
                details: `${categoryNames.length} categories found, ${issues.length} issues detected`
            };
            
            this.validationResults.semanticCategories = validation;
            return validation;
            
        } catch (error) {
            const validation = {
                passed: false,
                score: 0,
                issues: [error.message],
                details: `Validation failed: ${error.message}`
            };
            this.validationResults.semanticCategories = validation;
            return validation;
        }
    }

    /**
     * Validate Process Health metrics and legitimacy
     */
    validateProcessHealthMetrics() {
        console.log('🔍 Validating Process Health Metrics...');
        
        try {
            if (!fs.existsSync(this.finalJsonPath)) {
                throw new Error('Analysis results not found - run trust-debt analysis first');
            }
            
            const finalData = JSON.parse(fs.readFileSync(this.finalJsonPath, 'utf8'));
            let issues = [];
            let score = 0;
            
            if (finalData.processHealth) {
                const health = finalData.processHealth;
                
                // Overall score validation
                if (health.overallScore) {
                    score = health.overallScore;
                    
                    if (score >= 70) {
                        // Excellent health
                    } else if (score >= 60) {
                        issues.push(`Process Health at minimum target: ${score}%`);
                    } else if (score >= 50) {
                        issues.push(`Process Health below target but above emergency: ${score}%`);
                    } else {
                        issues.push(`Process Health critically low: ${score}%`);
                    }
                } else {
                    issues.push('Overall Process Health score missing');
                }
                
                // Component validation
                const components = ['orthogonality', 'uniformity', 'coverage'];
                components.forEach(component => {
                    if (health.metrics && health.metrics[component]) {
                        const componentData = health.metrics[component];
                        if (componentData.grade === 'F') {
                            issues.push(`${component} component at F grade (${componentData.score || 'unknown'}%)`);
                        }
                    }
                });
                
                // Legitimacy validation
                if (health.legitimacy) {
                    if (!health.legitimacy.isLegitimate) {
                        issues.push(`Analysis legitimacy compromised (confidence: ${health.legitimacy.confidence || 'unknown'}%)`);
                    }
                } else {
                    issues.push('Legitimacy assessment missing');
                }
                
            } else {
                issues.push('Process Health data completely missing');
                score = 0;
            }
            
            const validation = {
                passed: score >= 50 && issues.length === 0,
                score: score,
                issues: issues,
                details: `Process Health: ${score}%, ${issues.length} issues found`
            };
            
            this.validationResults.processHealth = validation;
            return validation;
            
        } catch (error) {
            const validation = {
                passed: false,
                score: 0,
                issues: [error.message],
                details: `Validation failed: ${error.message}`
            };
            this.validationResults.processHealth = validation;
            return validation;
        }
    }

    /**
     * Validate matrix population and subcategory presence
     */
    validateMatrixPopulation() {
        console.log('🔍 Validating Matrix Population...');
        
        try {
            const finalData = JSON.parse(fs.readFileSync(this.finalJsonPath, 'utf8'));
            let issues = [];
            let populatedCount = 0;
            let totalCount = 0;
            
            if (finalData.blockDebts) {
                Object.entries(finalData.blockDebts).forEach(([category, data]) => {
                    totalCount++;
                    if (data.units > 0) {
                        populatedCount++;
                    } else if (category.includes('.')) {
                        // Only flag subcategory zeros as potential issues
                        // Some cross-category zeros are legitimate (e.g., Technical→Visualization)
                        if (!category.includes('E⚙️') || !category.includes('D🎨')) {
                            issues.push(`Subcategory "${category}" has 0 units`);
                        }
                    }
                });
            }
            
            const populationRate = totalCount > 0 ? (populatedCount / totalCount) * 100 : 0;
            
            const validation = {
                passed: populationRate >= 80, // Allow some legitimate zeros
                score: populationRate,
                issues: issues,
                details: `${populatedCount}/${totalCount} categories populated (${populationRate.toFixed(1)}%)`
            };
            
            this.validationResults.matrixPopulation = validation;
            return validation;
            
        } catch (error) {
            const validation = {
                passed: false,
                score: 0,
                issues: [error.message],
                details: `Validation failed: ${error.message}`
            };
            this.validationResults.matrixPopulation = validation;
            return validation;
        }
    }

    /**
     * Validate HTML report structure and content
     */
    validateHtmlReport() {
        console.log('🔍 Validating HTML Report Structure...');
        
        try {
            if (!fs.existsSync(this.finalHtmlPath)) {
                throw new Error('HTML report not found - run trust-debt analysis first');
            }
            
            const htmlContent = fs.readFileSync(this.finalHtmlPath, 'utf8');
            let issues = [];
            let sectionsFound = 0;
            
            // Check for essential sections (more flexible matching)
            const essentialSections = [
                { name: 'Process Health', patterns: ['Process Health', '🏥'] },
                { name: 'Trust Debt Matrix', patterns: ['Matrix', 'Trust Debt', '🎯'] },
                { name: 'Analysis Results', patterns: ['Results', 'Analysis', '📊'] }
            ];
            
            essentialSections.forEach(section => {
                const found = section.patterns.some(pattern => 
                    htmlContent.includes(pattern)
                );
                
                if (found) {
                    sectionsFound++;
                } else {
                    issues.push(`Missing or incomplete section: ${section.name}`);
                }
            });
            
            // Check for semantic categories in HTML
            const semanticCategories = ['Measurement', 'Implementation', 'Documentation', 'Visualization', 'Technical'];
            let categoriesFound = 0;
            
            semanticCategories.forEach(category => {
                if (htmlContent.includes(category)) {
                    categoriesFound++;
                }
            });
            
            if (categoriesFound < 3) {
                issues.push(`Only ${categoriesFound}/5 semantic categories found in HTML`);
            }
            
            const completeness = ((sectionsFound / essentialSections.length) + (categoriesFound / semanticCategories.length)) / 2 * 100;
            
            const validation = {
                passed: sectionsFound >= 2 && categoriesFound >= 3,
                score: completeness,
                issues: issues,
                details: `${sectionsFound}/${essentialSections.length} sections, ${categoriesFound}/${semanticCategories.length} categories found`
            };
            
            this.validationResults.htmlReport = validation;
            return validation;
            
        } catch (error) {
            const validation = {
                passed: false,
                score: 0,
                issues: [error.message],
                details: `Validation failed: ${error.message}`
            };
            this.validationResults.htmlReport = validation;
            return validation;
        }
    }

    /**
     * Calculate overall system health score
     */
    calculateOverallHealthScore() {
        const weights = {
            semanticCategories: 0.25,
            processHealth: 0.35,
            matrixPopulation: 0.25,
            htmlReport: 0.15
        };
        
        let weightedScore = 0;
        let totalWeight = 0;
        
        Object.entries(weights).forEach(([component, weight]) => {
            if (this.validationResults[component]) {
                weightedScore += this.validationResults[component].score * weight;
                totalWeight += weight;
            }
        });
        
        return totalWeight > 0 ? weightedScore / totalWeight : 0;
    }

    /**
     * Run complete Process Health validation suite
     */
    async runCompleteValidation() {
        console.log('🚀 Starting Complete Process Health Validation Suite...\n');
        
        const validations = [
            () => this.validateSemanticCategories(),
            () => this.validateProcessHealthMetrics(),
            () => this.validateMatrixPopulation(),
            () => this.validateHtmlReport()
        ];
        
        let passedValidations = 0;
        
        for (const validation of validations) {
            const result = validation();
            const status = result.passed ? '✅' : '⚠️';
            const score = result.score ? ` (${result.score.toFixed(1)}%)` : '';
            
            console.log(`${status} ${Object.keys(this.validationResults).pop()}: ${result.details}${score}`);
            
            if (result.issues && result.issues.length > 0) {
                result.issues.forEach(issue => console.log(`   ⚠️ ${issue}`));
            }
            
            if (result.passed) passedValidations++;
            console.log('');
        }
        
        const overallScore = this.calculateOverallHealthScore();
        
        console.log('═══════════════════════════════════════════════');
        console.log(`📊 Process Health Validation Summary:`);
        console.log(`Overall Health Score: ${overallScore.toFixed(1)}%`);
        console.log(`Validations Passed: ${passedValidations}/${validations.length}`);
        
        let healthStatus = 'CRITICAL';
        if (overallScore >= 70) healthStatus = 'EXCELLENT';
        else if (overallScore >= 60) healthStatus = 'GOOD';
        else if (overallScore >= 50) healthStatus = 'ACCEPTABLE';
        
        console.log(`Health Status: ${healthStatus}`);
        
        if (passedValidations === validations.length) {
            console.log('🎉 All Process Health validations passed!');
        } else {
            console.log(`⚠️ ${validations.length - passedValidations} validation(s) need attention`);
        }
        
        return {
            overallScore,
            healthStatus,
            validationsPassed: passedValidations,
            totalValidations: validations.length,
            results: this.validationResults
        };
    }
}

// Export for use by other modules
module.exports = ProcessHealthValidator;

// Run validation if called directly
if (require.main === module) {
    const validator = new ProcessHealthValidator();
    validator.runCompleteValidation().then(results => {
        process.exit(results.validationsPassed === results.totalValidations ? 0 : 1);
    });
}