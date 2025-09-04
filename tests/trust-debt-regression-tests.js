/**
 * Trust Debt Regression Test Suite
 * Agent 2: Process Health Legitimacy Guardian - Additive Improvements
 * 
 * Automated tests for critical historical failure patterns to prevent regression
 */

const fs = require('fs');
const path = require('path');

class TrustDebtRegressionTests {
    constructor() {
        this.testResults = [];
        this.categoriesPath = path.join(__dirname, '../trust-debt-categories.json');
        this.finalHtmlPath = path.join(__dirname, '../trust-debt-final.html');
        this.finalJsonPath = path.join(__dirname, '../trust-debt-final.json');
    }

    /**
     * HISTORICAL FAILURE PATTERN 1: Syntax Noise Regression Prevention
     * Ensures no programming syntax appears in category names or keywords
     */
    async testSyntaxNoiseRegression() {
        console.log('🔍 Testing: Syntax Noise Regression Prevention...');
        
        try {
            const categories = JSON.parse(fs.readFileSync(this.categoriesPath, 'utf8'));
            const syntaxNoiseTerms = [
                'div', 'const', 'var', 'this', 'class', 'function', 'return', 'true', 'false',
                'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
                'int', 'string', 'boolean', 'array', 'object', 'null', 'undefined'
            ];
            
            let noiseFound = [];
            
            categories.categories.forEach(category => {
                // Check category names
                const categoryName = category.name.toLowerCase();
                syntaxNoiseTerms.forEach(term => {
                    if (categoryName.includes(term)) {
                        noiseFound.push(`Category name "${category.name}" contains syntax term "${term}"`);
                    }
                });
                
                // Check keywords
                if (category.keywords) {
                    category.keywords.forEach(keyword => {
                        if (syntaxNoiseTerms.includes(keyword.toLowerCase())) {
                            noiseFound.push(`Category "${category.name}" has syntax keyword "${keyword}"`);
                        }
                    });
                }
            });
            
            const result = {
                test: 'Syntax Noise Regression Prevention',
                passed: noiseFound.length === 0,
                details: noiseFound.length > 0 ? `Found ${noiseFound.length} syntax noise issues` : 'No syntax noise detected',
                issues: noiseFound
            };
            
            this.testResults.push(result);
            return result;
            
        } catch (error) {
            const result = {
                test: 'Syntax Noise Regression Prevention',
                passed: false,
                details: `Test failed: ${error.message}`,
                issues: [error.message]
            };
            this.testResults.push(result);
            return result;
        }
    }

    /**
     * HISTORICAL FAILURE PATTERN 2: Subcategory Zero Population Prevention
     * Ensures all subcategories have non-zero presence data
     */
    async testSubcategoryPopulation() {
        console.log('🔍 Testing: Subcategory Zero Population Prevention...');
        
        try {
            if (!fs.existsSync(this.finalJsonPath)) {
                throw new Error('trust-debt-final.json not found - run analysis first');
            }
            
            const finalData = JSON.parse(fs.readFileSync(this.finalJsonPath, 'utf8'));
            const zeroPopulationIssues = [];
            
            // Check block debts for zero values
            if (finalData.blockDebts) {
                Object.entries(finalData.blockDebts).forEach(([category, data]) => {
                    if (data.units === 0 && category.includes('.')) { // Only check subcategories
                        zeroPopulationIssues.push(`Subcategory "${category}" has 0 units`);
                    }
                });
            }
            
            const result = {
                test: 'Subcategory Zero Population Prevention',
                passed: zeroPopulationIssues.length === 0,
                details: zeroPopulationIssues.length > 0 ? 
                    `Found ${zeroPopulationIssues.length} zero-population subcategories` : 
                    'All subcategories properly populated',
                issues: zeroPopulationIssues
            };
            
            this.testResults.push(result);
            return result;
            
        } catch (error) {
            const result = {
                test: 'Subcategory Zero Population Prevention',
                passed: false,
                details: `Test failed: ${error.message}`,
                issues: [error.message]
            };
            this.testResults.push(result);
            return result;
        }
    }

    /**
     * HISTORICAL FAILURE PATTERN 3: Process Health Minimum Threshold
     * Ensures Process Health maintains minimum viable levels
     */
    async testProcessHealthThreshold() {
        console.log('🔍 Testing: Process Health Minimum Threshold...');
        
        try {
            if (!fs.existsSync(this.finalJsonPath)) {
                throw new Error('trust-debt-final.json not found - run analysis first');
            }
            
            const finalData = JSON.parse(fs.readFileSync(this.finalJsonPath, 'utf8'));
            const healthIssues = [];
            
            if (finalData.processHealth) {
                const overallScore = finalData.processHealth.overallScore;
                const legitimacy = finalData.processHealth.legitimacy;
                
                // Check minimum threshold (50% emergency minimum, 60% target)
                if (overallScore < 50) {
                    healthIssues.push(`Process Health critically low: ${overallScore}% (minimum: 50%)`);
                } else if (overallScore < 60) {
                    healthIssues.push(`Process Health below target: ${overallScore}% (target: 60%)`);
                }
                
                // Check legitimacy status
                if (legitimacy && !legitimacy.isLegitimate) {
                    healthIssues.push(`Analysis legitimacy compromised: ${legitimacy.confidence}% confidence`);
                }
            } else {
                healthIssues.push('Process Health data missing from analysis results');
            }
            
            const result = {
                test: 'Process Health Minimum Threshold',
                passed: healthIssues.length === 0,
                details: healthIssues.length > 0 ? 
                    `Process Health issues detected` : 
                    'Process Health within acceptable range',
                issues: healthIssues
            };
            
            this.testResults.push(result);
            return result;
            
        } catch (error) {
            const result = {
                test: 'Process Health Minimum Threshold',
                passed: false,
                details: `Test failed: ${error.message}`,
                issues: [error.message]
            };
            this.testResults.push(result);
            return result;
        }
    }

    /**
     * HISTORICAL FAILURE PATTERN 4: HTML Report Section Completeness
     * Ensures all required HTML sections are present and populated
     */
    async testHtmlSectionCompleteness() {
        console.log('🔍 Testing: HTML Report Section Completeness...');
        
        try {
            if (!fs.existsSync(this.finalHtmlPath)) {
                throw new Error('trust-debt-final.html not found - run analysis first');
            }
            
            const htmlContent = fs.readFileSync(this.finalHtmlPath, 'utf8');
            const requiredSections = [
                { name: 'Process Health Report', marker: '🏥 Process Health Report' },
                { name: 'Sequential Process Results', marker: '📊 Sequential Process Results' },
                { name: 'Trust Debt Presence Matrix', marker: '🎯 Trust Debt Presence Matrix' },
                { name: 'Intent vs Reality Analysis', marker: '🔍 Intent vs Reality Analysis' },
                { name: 'Category Validation Report', marker: '📋 Category Validation Report' }
            ];
            
            const missingSections = [];
            
            requiredSections.forEach(section => {
                if (!htmlContent.includes(section.marker)) {
                    missingSections.push(`Missing required section: ${section.name}`);
                }
            });
            
            const result = {
                test: 'HTML Report Section Completeness',
                passed: missingSections.length === 0,
                details: missingSections.length > 0 ? 
                    `${missingSections.length} required sections missing` : 
                    'All required HTML sections present',
                issues: missingSections
            };
            
            this.testResults.push(result);
            return result;
            
        } catch (error) {
            const result = {
                test: 'HTML Report Section Completeness',
                passed: false,
                details: `Test failed: ${error.message}`,
                issues: [error.message]
            };
            this.testResults.push(result);
            return result;
        }
    }

    /**
     * Execute complete regression test suite
     */
    async runCompleteTestSuite() {
        console.log('🚀 Starting Trust Debt Regression Test Suite...\n');
        
        const tests = [
            () => this.testSyntaxNoiseRegression(),
            () => this.testSubcategoryPopulation(),
            () => this.testProcessHealthThreshold(),
            () => this.testHtmlSectionCompleteness()
        ];
        
        for (const test of tests) {
            const result = await test();
            console.log(`${result.passed ? '✅' : '❌'} ${result.test}: ${result.details}`);
            if (!result.passed && result.issues) {
                result.issues.forEach(issue => console.log(`   - ${issue}`));
            }
            console.log('');
        }
        
        const passedTests = this.testResults.filter(r => r.passed).length;
        const totalTests = this.testResults.length;
        
        console.log(`📊 Regression Test Results: ${passedTests}/${totalTests} tests passed`);
        
        if (passedTests === totalTests) {
            console.log('🎉 All regression tests passed - no historical failure patterns detected!');
        } else {
            console.log('⚠️  Some regression tests failed - system may have regressed to previous failure states');
        }
        
        return {
            passed: passedTests,
            total: totalTests,
            success: passedTests === totalTests,
            results: this.testResults
        };
    }
}

// Export for use by other modules
module.exports = TrustDebtRegressionTests;

// Run tests if called directly
if (require.main === module) {
    const testRunner = new TrustDebtRegressionTests();
    testRunner.runCompleteTestSuite().then(results => {
        process.exit(results.success ? 0 : 1);
    });
}