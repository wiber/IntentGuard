#!/usr/bin/env node

/**
 * Balanced 20-Category Trust Debt Matrix Generator
 * 
 * Creates optimized 20x20 matrix with balanced mention distribution (~200 mentions per category)
 * Based on trust-debt-pipeline-coms.txt balanced specifications
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class Balanced20CategoryGenerator {
    constructor() {
        this.targetMentionsPerCategory = 200;
        this.acceptableVariance = 50; // 150-250 mentions acceptable
        this.totalCategories = 20;
        this.matrixSize = 400; // 20x20
        
        // Balanced 20-category structure
        this.balancedCategories = this.initializeBalancedCategories();
        this.mentionCounts = new Map();
        this.matrix = new Array(20).fill(null).map(() => new Array(20).fill(0));
    }

    initializeBalancedCategories() {
        return [
            // 4 Parent Categories
            { code: 'A🛡️', name: 'Security & Trust Governance', type: 'parent' },
            { code: 'B⚡', name: 'Performance & Integration', type: 'parent' },
            { code: 'C🎨', name: 'Experience & Interfaces', type: 'parent' },
            { code: 'D💼', name: 'Strategy & Business', type: 'parent' },
            
            // 16 Child Categories (4 per parent)
            { code: 'A🛡️.1📊', name: 'Trust Debt Analysis', parent: 'A🛡️' },
            { code: 'A🛡️.2🔒', name: 'Security & Compliance', parent: 'A🛡️' },
            { code: 'A🛡️.3⚖️', name: 'Legal & Patent Framework', parent: 'A🛡️' },
            { code: 'A🛡️.4💾', name: 'Data Integrity & Validation', parent: 'A🛡️' },
            
            { code: 'B⚡.1🚀', name: 'Runtime & Algorithm Performance', parent: 'B⚡' },
            { code: 'B⚡.2💾', name: 'Database & Storage Optimization', parent: 'B⚡' },
            { code: 'B⚡.3🔧', name: 'Development & CI/CD Integration', parent: 'B⚡' },
            { code: 'B⚡.4📊', name: 'Resource Management & Monitoring', parent: 'B⚡' },
            
            { code: 'C🎨.1🖥️', name: 'Visual Design & Matrix Display', parent: 'C🎨' },
            { code: 'C🎨.2💻', name: 'CLI & API User Experience', parent: 'C🎨' },
            { code: 'C🎨.3📚', name: 'Documentation & User Guidance', parent: 'C🎨' },
            { code: 'C🎨.4📱', name: 'Cross-Platform & Accessibility', parent: 'C🎨' },
            
            { code: 'D💼.1📈', name: 'Market Analysis & Positioning', parent: 'D💼' },
            { code: 'D💼.2🎯', name: 'Product Strategy & Roadmap', parent: 'D💼' },
            { code: 'D💼.3💰', name: 'Revenue & Monetization', parent: 'D💼' },
            { code: 'D💼.4🏆', name: 'Competitive Advantage & Patents', parent: 'D💼' }
        ];
    }

    async analyzeMentionDistribution() {
        console.log('📊 Analyzing mention distribution for balanced categories...');
        
        const mentionAnalysis = new Map();
        
        for (const category of this.balancedCategories) {
            const keywords = this.getCategoryKeywords(category);
            let totalMentions = 0;
            let docMentions = 0;
            let codeMentions = 0;
            
            for (const keyword of keywords) {
                // Count mentions in documentation
                try {
                    const docCount = execSync(`grep -r "${keyword}" docs/ --include="*.md" | wc -l`).toString().trim();
                    const docMentionCount = parseInt(docCount) || 0;
                    docMentions += docMentionCount;
                    
                    // Count mentions in code
                    const codeCount = execSync(`grep -r "${keyword}" . --include="*.js" --include="*.sql" | grep -v node_modules | wc -l`).toString().trim();
                    const codeMentionCount = parseInt(codeCount) || 0;
                    codeMentions += codeMentionCount;
                    
                    totalMentions += docMentionCount + codeMentionCount;
                } catch (error) {
                    // Handle grep errors gracefully
                    console.warn(`Warning: Could not analyze keyword "${keyword}"`);
                }
            }
            
            mentionAnalysis.set(category.code, {
                name: category.name,
                totalMentions,
                docMentions,
                codeMentions,
                targetRange: [150, 250],
                isBalanced: totalMentions >= 150 && totalMentions <= 250,
                variance: Math.abs(totalMentions - this.targetMentionsPerCategory)
            });
        }
        
        return mentionAnalysis;
    }

    getCategoryKeywords(category) {
        // Map each category to its relevant keywords
        const keywordMap = {
            'A🛡️': ['trust', 'debt', 'security', 'governance'],
            'A🛡️.1📊': ['trust', 'debt', 'analysis', 'matrix'],
            'A🛡️.2🔒': ['security', 'vulnerability', 'compliance'],
            'A🛡️.3⚖️': ['legal', 'patent', 'compliance', 'framework'],
            'A🛡️.4💾': ['data', 'integrity', 'validation', 'database'],
            
            'B⚡': ['performance', 'optimization', 'speed'],
            'B⚡.1🚀': ['runtime', 'algorithm', 'performance', 'speed'],
            'B⚡.2💾': ['database', 'storage', 'optimization', 'sql'],
            'B⚡.3🔧': ['development', 'integration', 'ci', 'cd'],
            'B⚡.4📊': ['resource', 'management', 'monitoring', 'metrics'],
            
            'C🎨': ['experience', 'interface', 'user', 'visual'],
            'C🎨.1🖥️': ['visual', 'design', 'matrix', 'display'],
            'C🎨.2💻': ['cli', 'api', 'interface', 'command'],
            'C🎨.3📚': ['documentation', 'guide', 'tutorial', 'help'],
            'C🎨.4📱': ['platform', 'mobile', 'responsive', 'accessibility'],
            
            'D💼': ['strategy', 'business', 'market'],
            'D💼.1📈': ['market', 'analysis', 'competitive', 'positioning'],
            'D💼.2🎯': ['product', 'strategy', 'roadmap', 'planning'],
            'D💼.3💰': ['revenue', 'monetization', 'pricing', 'business'],
            'D💼.4🏆': ['competitive', 'advantage', 'patent', 'differentiation']
        };
        
        return keywordMap[category.code] || [];
    }

    async generateBalanced20Matrix() {
        console.log('🔧 Generating balanced 20×20 Trust Debt matrix...');
        
        const mentionData = await this.analyzeMentionDistribution();
        
        // Create balanced matrix with actual intent vs reality calculations
        for (let i = 0; i < 20; i++) {
            for (let j = 0; j < 20; j++) {
                const categoryI = this.balancedCategories[i];
                const categoryJ = this.balancedCategories[j];
                
                const intentValue = mentionData.get(categoryI.code)?.docMentions || 0;
                const realityValue = mentionData.get(categoryJ.code)?.codeMentions || 0;
                
                // Apply calibrated formula
                const drift = Math.abs(intentValue - realityValue);
                const sophisticationDiscount = 0.3;
                const categoryWeight = this.getCategoryWeight(i);
                
                this.matrix[i][j] = Math.round(drift * (1 - sophisticationDiscount) * categoryWeight);
            }
        }
        
        // Calculate total Trust Debt
        const totalUnits = this.matrix.flat().reduce((sum, cell) => sum + cell, 0);
        const grade = this.calculateGrade(totalUnits);
        
        console.log(`✅ Matrix generated: 20×20 with ${totalUnits} total units (Grade ${grade})`);
        
        return {
            matrix: this.matrix,
            totalUnits,
            grade,
            mentionDistribution: Array.from(mentionData.entries()),
            matrixSize: '20×20 (400 cells)',
            balanceValidation: this.validateBalance(mentionData)
        };
    }

    getCategoryWeight(categoryIndex) {
        // Parent categories get higher weight
        if (categoryIndex < 4) return 1.0; // Parents: A🛡️, B⚡, C🎨, D💼
        return 0.8; // Children get slightly lower weight
    }

    calculateGrade(totalUnits) {
        if (totalUnits <= 500) return 'A';
        if (totalUnits <= 1500) return 'B';
        if (totalUnits <= 3000) return 'C';
        return 'D';
    }

    validateBalance(mentionData) {
        const validation = {
            balancedCategories: 0,
            imbalancedCategories: 0,
            totalVariance: 0
        };
        
        mentionData.forEach((data, categoryCode) => {
            if (data.isBalanced) {
                validation.balancedCategories++;
            } else {
                validation.imbalancedCategories++;
            }
            validation.totalVariance += data.variance;
        });
        
        validation.balanceScore = validation.balancedCategories / this.totalCategories;
        validation.averageVariance = validation.totalVariance / this.totalCategories;
        
        return validation;
    }

    async generateComprehensiveReport() {
        console.log('📈 Generating comprehensive 20-category Trust Debt report...');
        
        const analysisResults = await this.generateBalanced20Matrix();
        
        const report = {
            metadata: {
                generated_at: new Date().toISOString(),
                methodology: 'balanced_20_category_system',
                matrix_size: '20×20 (400 cells)',
                mention_balance_target: this.targetMentionsPerCategory
            },
            trust_debt_assessment: {
                total_units: analysisResults.totalUnits,
                grade: analysisResults.grade,
                grade_boundaries: this.gradeBoundaries,
                sophistication_discount_applied: this.sophisticationDiscount
            },
            mention_distribution: analysisResults.mentionDistribution,
            matrix_analysis: {
                size: analysisResults.matrixSize,
                balance_validation: analysisResults.balanceValidation,
                improvement_areas: this.identifyImprovementAreas(analysisResults)
            }
        };
        
        // Save detailed analysis
        await fs.promises.writeFile(
            'balanced-20-category-analysis.json', 
            JSON.stringify(report, null, 2)
        );
        
        console.log('✅ Balanced 20-category analysis complete!');
        console.log(`🎯 Grade ${report.trust_debt_assessment.grade} (${report.trust_debt_assessment.total_units} units)`);
        console.log(`📊 Matrix: ${report.matrix_analysis.size}`);
        console.log(`⚖️ Balance: ${Math.round(report.matrix_analysis.balance_validation.balanceScore * 100)}% categories balanced`);
        
        return report;
    }

    identifyImprovementAreas(analysisResults) {
        // Identify categories with highest Trust Debt for targeted improvement
        const improvements = [];
        
        analysisResults.mentionDistribution.forEach(([categoryCode, data]) => {
            if (!data.isBalanced) {
                improvements.push({
                    category: categoryCode,
                    name: data.name,
                    current_mentions: data.totalMentions,
                    target_mentions: this.targetMentionsPerCategory,
                    variance: data.variance,
                    recommendation: data.totalMentions < 150 
                        ? 'Increase documentation and implementation' 
                        : 'Focus and consolidate scattered mentions'
                });
            }
        });
        
        return improvements.sort((a, b) => b.variance - a.variance);
    }
}

// CLI execution
async function main() {
    const analyzer = new Balanced20CategoryGenerator();
    
    try {
        const report = await analyzer.generateComprehensiveReport();
        
        console.log('\n🎯 Balanced Category Validation:');
        report.mention_distribution.forEach(([categoryCode, data]) => {
            const status = data.isBalanced ? '✅' : '⚠️';
            console.log(`${status} ${categoryCode}: ${data.totalMentions} mentions (${data.name})`);
        });
        
        if (report.matrix_analysis.improvement_areas.length > 0) {
            console.log('\n🔧 Categories needing balance adjustment:');
            report.matrix_analysis.improvement_areas.slice(0, 5).forEach(area => {
                console.log(`⚠️ ${area.category}: ${area.current_mentions} mentions (target: ${area.target_mentions})`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Export for integration
module.exports = { Balanced20CategoryGenerator };

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}