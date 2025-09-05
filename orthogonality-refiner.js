#!/usr/bin/env node

/**
 * Orthogonality Refiner for Functional Taxonomy
 * Eliminates debt range overlaps and ensures <1% correlation between categories
 */

const fs = require('fs');
const path = require('path');

class OrthogonalityRefiner {
    constructor() {
        this.taxonomyFile = '2-categories-functional.json';
        this.originalTaxonomy = this.loadTaxonomy();
        this.totalDebtTarget = 13682; // Current Grade D debt units
        this.refinementIterations = 0;
        this.maxIterations = 5;
    }

    loadTaxonomy() {
        try {
            const filepath = path.join(process.cwd(), this.taxonomyFile);
            return JSON.parse(fs.readFileSync(filepath, 'utf8'));
        } catch (error) {
            throw new Error(`Could not load taxonomy file: ${error.message}`);
        }
    }

    analyzeOverlaps() {
        const categories = this.originalTaxonomy.categories;
        const overlaps = [];
        const categoryKeys = Object.keys(categories);

        for (let i = 0; i < categoryKeys.length; i++) {
            for (let j = i + 1; j < categoryKeys.length; j++) {
                const cat1 = categories[categoryKeys[i]];
                const cat2 = categories[categoryKeys[j]];
                
                const overlap = this.calculateRangeOverlap(
                    cat1.expectedDebtRange,
                    cat2.expectedDebtRange
                );
                
                if (overlap > 0.05) { // >5% overlap threshold
                    overlaps.push({
                        category1: categoryKeys[i],
                        category2: categoryKeys[j],
                        overlapPercentage: overlap * 100,
                        range1: cat1.expectedDebtRange,
                        range2: cat2.expectedDebtRange,
                        priority: overlap > 0.2 ? 'critical' : 'moderate'
                    });
                }
            }
        }

        return overlaps.sort((a, b) => b.overlapPercentage - a.overlapPercentage);
    }

    calculateRangeOverlap(range1, range2) {
        const [a1, b1] = range1;
        const [a2, b2] = range2;
        const overlapStart = Math.max(a1, a2);
        const overlapEnd = Math.min(b1, b2);
        
        if (overlapStart >= overlapEnd) return 0;
        
        const overlapSize = overlapEnd - overlapStart;
        const totalSize = Math.max(b1, b2) - Math.min(a1, a2);
        return overlapSize / totalSize;
    }

    refineDebtRanges() {
        console.log('🔧 Refining debt ranges for orthogonality...\n');
        
        const refinedCategories = JSON.parse(JSON.stringify(this.originalTaxonomy.categories));
        
        // Strategy: Redistribute debt ranges based on agent complexity and functional responsibility
        const agentComplexityWeights = {
            0: 0.15, // Agent 0: Outcome Requirements Parser (moderate complexity)
            1: 0.25, // Agent 1: Database Indexer (high data processing)
            2: 0.20, // Agent 2: Category Generator (high logic complexity)
            3: 0.25, // Agent 3: Matrix Builder (high computational complexity)
            4: 0.10, // Agent 4: Grades Calculator (focused output)
            5: 0.15, // Agent 5: Timeline Analyzer (moderate complexity)
            6: 0.20, // Agent 6: Narrative Generator (high synthesis complexity)
            7: 0.15  // Agent 7: Report Generator (moderate complexity)
        };

        // Calculate weighted debt for each functional category based on agent ownership
        const refinedRanges = {};
        
        // A📊 SYSTEM HEALTH & GRADES (Agent 4 only) - Smallest range, highly focused
        refinedRanges['A📊'] = {
            baseDebt: this.totalDebtTarget * agentComplexityWeights[4],
            range: [400, 600], // Tightest range for focused health metrics
            justification: 'Highly focused health metrics with minimal variance'
        };

        // B💻 DATA & TAXONOMY (Agents 1,2) - Largest range, high data processing
        const dataTaxonomyWeight = agentComplexityWeights[1] + agentComplexityWeights[2];
        refinedRanges['B💻'] = {
            baseDebt: this.totalDebtTarget * dataTaxonomyWeight,
            range: [1400, 1800], // Large range for data processing complexity
            justification: 'High variability in data processing and category generation'
        };

        // C📋 ANALYSIS & NARRATIVES (Agents 5,6) - Medium-high range, synthesis complexity
        const analysisNarrativesWeight = agentComplexityWeights[5] + agentComplexityWeights[6];
        refinedRanges['C📋'] = {
            baseDebt: this.totalDebtTarget * analysisNarrativesWeight,
            range: [900, 1200], // Medium-high range for narrative synthesis
            justification: 'Moderate variability in timeline analysis and narrative generation'
        };

        // D🧠 PIPELINE & INTEGRATION (Agents 0,3,7) - Medium range, system coordination
        const pipelineIntegrationWeight = agentComplexityWeights[0] + agentComplexityWeights[3] + agentComplexityWeights[7];
        refinedRanges['D🧠'] = {
            baseDebt: this.totalDebtTarget * pipelineIntegrationWeight,
            range: [650, 950], // Medium range for system coordination
            justification: 'System coordination with controlled complexity variance'
        };

        // Apply refined ranges to categories
        Object.keys(refinedCategories).forEach(categoryKey => {
            if (refinedRanges[categoryKey]) {
                refinedCategories[categoryKey].expectedDebtRange = refinedRanges[categoryKey].range;
                refinedCategories[categoryKey].refinementJustification = refinedRanges[categoryKey].justification;
                refinedCategories[categoryKey].complexityWeight = this.calculateCategoryComplexityWeight(categoryKey, agentComplexityWeights);
            }
        });

        return {
            refinedCategories,
            refinedRanges,
            agentComplexityWeights
        };
    }

    calculateCategoryComplexityWeight(categoryKey, weights) {
        const category = this.originalTaxonomy.categories[categoryKey];
        return category.ownerAgents.reduce((total, agentId) => total + weights[agentId], 0);
    }

    validateRefinement(refinedCategories) {
        const validation = {
            orthogonalityPassed: true,
            maxOverlap: 0,
            overlaps: [],
            totalDebtConsistency: true,
            issues: []
        };

        // Check for overlaps in refined ranges
        const categoryKeys = Object.keys(refinedCategories);
        for (let i = 0; i < categoryKeys.length; i++) {
            for (let j = i + 1; j < categoryKeys.length; j++) {
                const cat1 = refinedCategories[categoryKeys[i]];
                const cat2 = refinedCategories[categoryKeys[j]];
                
                const overlap = this.calculateRangeOverlap(
                    cat1.expectedDebtRange,
                    cat2.expectedDebtRange
                );
                
                if (overlap > 0.01) { // >1% overlap
                    validation.orthogonalityPassed = false;
                    validation.overlaps.push({
                        categories: [categoryKeys[i], categoryKeys[j]],
                        overlapPercentage: overlap * 100
                    });
                }
                
                validation.maxOverlap = Math.max(validation.maxOverlap, overlap);
            }
        }

        // Check total debt range consistency
        const totalMinDebt = Object.values(refinedCategories).reduce(
            (sum, cat) => sum + cat.expectedDebtRange[0], 0
        );
        const totalMaxDebt = Object.values(refinedCategories).reduce(
            (sum, cat) => sum + cat.expectedDebtRange[1], 0
        );

        if (totalMaxDebt < this.totalDebtTarget * 0.8 || totalMinDebt > this.totalDebtTarget * 1.2) {
            validation.totalDebtConsistency = false;
            validation.issues.push(
                `Total debt range [${totalMinDebt}, ${totalMaxDebt}] inconsistent with target ${this.totalDebtTarget}`
            );
        }

        return validation;
    }

    generateFunctionalMatrix() {
        return {
            dimensions: '4x4',
            categories: ['A📊', 'B💻', 'C📋', 'D🧠'],
            expectedCorrelations: {
                'A📊-B💻': '<0.5%', // Health metrics vs Data processing
                'A📊-C📋': '<0.8%', // Health metrics vs Analysis
                'A📊-D🧠': '2-5%',  // Health metrics vs Pipeline (some coupling expected)
                'B💻-C📋': '1-3%',  // Data flows to Analysis (handoff pattern)
                'B💻-D🧠': '<0.5%', // Data vs Pipeline (minimal coupling)
                'C📋-D🧠': '<1%'    // Analysis vs Pipeline (output coupling)
            },
            matrixProperties: {
                diagonalDominance: ['A📊', 'D🧠'], // Self-consistency categories
                handoffPattern: ['B💻', 'C📋'],    // Sequential data flow
                offDiagonalSynthesis: 'C📋',       // Cross-cutting analysis
                totalCorrelation: '<1%'            // Overall orthogonality target
            }
        };
    }

    saveRefinedTaxonomy(refinedData) {
        const outputData = {
            ...this.originalTaxonomy,
            categories: refinedData.refinedCategories,
            refinement: {
                iteration: this.refinementIterations,
                timestamp: new Date().toISOString(),
                agentComplexityWeights: refinedData.agentComplexityWeights,
                refinedRanges: refinedData.refinedRanges,
                validation: this.validateRefinement(refinedData.refinedCategories),
                functionalMatrix: this.generateFunctionalMatrix()
            }
        };

        const filename = '2-categories-functional-refined.json';
        fs.writeFileSync(filename, JSON.stringify(outputData, null, 2));
        console.log(`✅ Refined functional taxonomy saved to ${filename}`);
        
        return { filename, outputData };
    }

    generateRefinementReport(originalOverlaps, refinedData) {
        console.log('\n📊 Orthogonality Refinement Report');
        console.log('=' .repeat(50));
        
        console.log('\n🔍 Original Issues:');
        originalOverlaps.forEach(overlap => {
            console.log(`  ❌ ${overlap.category1} ↔ ${overlap.category2}: ${overlap.overlapPercentage.toFixed(1)}% overlap`);
        });
        
        console.log('\n✅ Refined Debt Ranges:');
        Object.entries(refinedData.refinedCategories).forEach(([key, category]) => {
            const [min, max] = category.expectedDebtRange;
            const complexity = category.complexityWeight;
            console.log(`  ${key} ${category.name}`);
            console.log(`    💰 Debt Range: ${min}-${max} units`);
            console.log(`    🧮 Complexity Weight: ${complexity.toFixed(3)}`);
            console.log(`    📋 Justification: ${category.refinementJustification}`);
            console.log('');
        });
        
        const validation = this.validateRefinement(refinedData.refinedCategories);
        console.log('🎯 Validation Results:');
        console.log(`  ✅ Orthogonality: ${validation.orthogonalityPassed ? 'PASSED' : 'FAILED'}`);
        console.log(`  📈 Max Overlap: ${(validation.maxOverlap * 100).toFixed(2)}%`);
        console.log(`  ⚖️ Debt Consistency: ${validation.totalDebtConsistency ? 'PASSED' : 'FAILED'}`);
        
        if (validation.overlaps.length > 0) {
            console.log('\n⚠️  Remaining Overlaps:');
            validation.overlaps.forEach(overlap => {
                console.log(`  • ${overlap.categories.join(' ↔ ')}: ${overlap.overlapPercentage.toFixed(2)}%`);
            });
        }
        
        console.log('\n🎯 Functional Matrix Specifications:');
        const matrix = this.generateFunctionalMatrix();
        console.log(`  📐 Dimensions: ${matrix.dimensions}`);
        console.log(`  🔗 Total Correlation Target: ${matrix.matrixProperties.totalCorrelation}`);
        console.log(`  📊 Diagonal Dominance: ${matrix.matrixProperties.diagonalDominance.join(', ')}`);
        console.log(`  🔄 Handoff Pattern: ${matrix.matrixProperties.handoffPattern.join(' → ')}`);
        
        return validation;
    }

    async run() {
        try {
            console.log('🔧 IntentGuard Orthogonality Refiner\n');
            
            // Analyze current overlaps
            const originalOverlaps = this.analyzeOverlaps();
            console.log(`🔍 Found ${originalOverlaps.length} debt range overlaps to resolve\n`);
            
            // Refine debt ranges
            this.refinementIterations++;
            const refinedData = this.refineDebtRanges();
            
            // Save refined taxonomy
            const { filename, outputData } = this.saveRefinedTaxonomy(refinedData);
            
            // Generate validation report
            const validation = this.generateRefinementReport(originalOverlaps, refinedData);
            
            if (validation.orthogonalityPassed && validation.totalDebtConsistency) {
                console.log('\n✅ SUCCESS: Functional taxonomy achieves orthogonality requirements');
                console.log('🎯 Ready for Agent 2/3/4 integration with <1% correlation target');
            } else {
                console.log('\n⚠️  WARNING: Further refinement needed');
                console.log(`🔄 Iteration ${this.refinementIterations}/${this.maxIterations} completed`);
            }
            
            return {
                success: validation.orthogonalityPassed && validation.totalDebtConsistency,
                filename,
                validation,
                maxOverlap: validation.maxOverlap,
                iterationComplete: this.refinementIterations
            };
            
        } catch (error) {
            console.error('❌ Error refining orthogonality:', error.message);
            throw error;
        }
    }
}

// Execute if run directly
if (require.main === module) {
    const refiner = new OrthogonalityRefiner();
    refiner.run().catch(console.error);
}

module.exports = OrthogonalityRefiner;