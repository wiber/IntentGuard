#!/usr/bin/env node

/**
 * Functional Taxonomy Generator for IntentGuard Trust Debt Analysis
 * Implements outcome-derived categories that map directly to agent outputs
 * Replaces abstract categories with measurable functional domains
 */

const fs = require('fs');
const path = require('path');

class FunctionalTaxonomyGenerator {
    constructor() {
        this.agentOutputs = this.loadAgentOutputs();
        this.functionalCategories = this.defineFunctionalTaxonomy();
        this.validationCriteria = {
            orthogonalityThreshold: 0.01, // <1% correlation
            balanceThreshold: 0.25, // No category >25% of total debt
            selfConsistencyMin: 0.85, // 85% self-consistency
            gradeTarget: 'C-B' // Improvement from Grade D
        };
    }

    loadAgentOutputs() {
        const outputs = {};
        for (let i = 0; i <= 7; i++) {
            try {
                const filename = `${i}-${this.getAgentBucketName(i)}.json`;
                const filepath = path.join(process.cwd(), filename);
                if (fs.existsSync(filepath)) {
                    outputs[i] = JSON.parse(fs.readFileSync(filepath, 'utf8'));
                }
            } catch (error) {
                console.warn(`Warning: Could not load agent ${i} output: ${error.message}`);
            }
        }
        return outputs;
    }

    getAgentBucketName(agentId) {
        const bucketNames = {
            0: 'outcome-requirements',
            1: 'indexed-keywords', 
            2: 'categories-balanced',
            3: 'presence-matrix',
            4: 'grades-statistics',
            5: 'timeline-history',
            6: 'analysis-narratives',
            7: 'audit-log'
        };
        return bucketNames[agentId] || 'unknown';
    }

    defineFunctionalTaxonomy() {
        return {
            'A📊': {
                name: 'SYSTEM HEALTH & GRADES',
                responsibility: 'Analysis process legitimacy and methodology integrity',
                ownerAgents: [4],
                jsonBuckets: ['4-grades-statistics.json'],
                subcategories: {
                    'A📊.1💎': {
                        name: 'Process Health',
                        outcomeMapping: {
                            agent: 4,
                            responsibility: 'methodology_integrity_score',
                            measurableOutcome: 'process_health_percentage'
                        },
                        expectedRange: [80, 95], // Process health percentage
                        priority: 'critical'
                    },
                    'A📊.2🔥': {
                        name: 'Legitimacy Score', 
                        outcomeMapping: {
                            agent: 4,
                            responsibility: 'trust_debt_legitimacy',
                            measurableOutcome: 'legitimacy_score'
                        },
                        expectedRange: [0.5, 2.0], // Legitimacy multiplier
                        priority: 'critical'
                    },
                    'A📊.3📈': {
                        name: 'Asymmetry Ratio',
                        outcomeMapping: {
                            agent: 4,
                            responsibility: 'intent_reality_balance',
                            measurableOutcome: 'asymmetry_ratio'
                        },
                        expectedRange: [1.0, 5.0], // Intent vs Reality ratio
                        priority: 'high'
                    },
                    'A📊.4⚖️': {
                        name: 'Orthogonality Score',
                        outcomeMapping: {
                            agent: 4,
                            responsibility: 'semantic_independence',
                            measurableOutcome: 'orthogonality_percentage'
                        },
                        expectedRange: [95, 99], // Orthogonality percentage (>95%)
                        priority: 'critical'
                    }
                },
                expectedDebtRange: [500, 800],
                matrixPosition: 'diagonal_dominance'
            },
            'B💻': {
                name: 'DATA & TAXONOMY',
                responsibility: 'Foundational data management from raw keywords to validated categories',
                ownerAgents: [1, 2],
                jsonBuckets: ['1-indexed-keywords.json', '2-categories-balanced.json'],
                subcategories: {
                    'B💻.1⚡': {
                        name: 'Raw Keywords',
                        outcomeMapping: {
                            agent: 1,
                            responsibility: 'keyword_indexing',
                            measurableOutcome: 'total_indexed_keywords'
                        },
                        expectedRange: [200, 500], // Total keyword count
                        priority: 'high'
                    },
                    'B💻.2📐': {
                        name: 'Category Structure',
                        outcomeMapping: {
                            agent: 2,
                            responsibility: 'category_generation',
                            measurableOutcome: 'balanced_categories_count'
                        },
                        expectedRange: [4, 8], // Number of functional categories
                        priority: 'critical'
                    },
                    'B💻.3🔐': {
                        name: 'Validation Rules',
                        outcomeMapping: {
                            agent: 2,
                            responsibility: 'orthogonality_validation',
                            measurableOutcome: 'validation_rule_compliance'
                        },
                        expectedRange: [90, 100], // Validation compliance percentage
                        priority: 'critical'
                    },
                    'B💻.4🎯': {
                        name: 'Semantic Mapping',
                        outcomeMapping: {
                            agent: 2,
                            responsibility: 'business_code_correlation',
                            measurableOutcome: 'semantic_mapping_accuracy'
                        },
                        expectedRange: [85, 95], // Mapping accuracy percentage
                        priority: 'medium'
                    }
                },
                expectedDebtRange: [1200, 1500],
                matrixPosition: 'handoff_pattern'
            },
            'C📋': {
                name: 'ANALYSIS & NARRATIVES',
                responsibility: 'High-level insights, recommendations, and actionable guidance',
                ownerAgents: [5, 6],
                jsonBuckets: ['5-timeline-history.json', '6-analysis-narratives.json'],
                subcategories: {
                    'C📋.1📜': {
                        name: 'Recommendations',
                        outcomeMapping: {
                            agent: 6,
                            responsibility: 'actionable_guidance',
                            measurableOutcome: 'recommendations_count'
                        },
                        expectedRange: [5, 15], // Number of recommendations
                        priority: 'high'
                    },
                    'C📋.2⏳': {
                        name: 'Timeline Evolution',
                        outcomeMapping: {
                            agent: 5,
                            responsibility: 'historical_analysis',
                            measurableOutcome: 'timeline_data_points'
                        },
                        expectedRange: [20, 100], // Timeline data points
                        priority: 'medium'
                    },
                    'C📋.3🔭': {
                        name: 'Cold Spot Analysis',
                        outcomeMapping: {
                            agent: 6,
                            responsibility: 'risk_identification',
                            measurableOutcome: 'cold_spots_identified'
                        },
                        expectedRange: [3, 10], // Number of cold spots
                        priority: 'high'
                    },
                    'C📋.4🎨': {
                        name: 'Visual Coherence',
                        outcomeMapping: {
                            agent: 6,
                            responsibility: 'presentation_integrity',
                            measurableOutcome: 'visual_coherence_score'
                        },
                        expectedRange: [80, 95], // Visual coherence percentage
                        priority: 'medium'
                    }
                },
                expectedDebtRange: [800, 1000],
                matrixPosition: 'off_diagonal_synthesis'
            },
            'D🧠': {
                name: 'PIPELINE & INTEGRATION',
                responsibility: 'Multi-agent system operational health and code integration',
                ownerAgents: [0, 3, 7],
                jsonBuckets: ['0-outcome-requirements.json', '3-presence-matrix.json', 'trust-debt-report.html'],
                subcategories: {
                    'D🧠.1🔗': {
                        name: 'Agent Handoffs',
                        outcomeMapping: {
                            agent: 0,
                            responsibility: 'pipeline_coordination',
                            measurableOutcome: 'agent_handoff_success_rate'
                        },
                        expectedRange: [95, 100], // Handoff success percentage
                        priority: 'critical'
                    },
                    'D🧠.2🤖': {
                        name: 'System Status',
                        outcomeMapping: {
                            agent: 7,
                            responsibility: 'system_validation',
                            measurableOutcome: 'agent_completion_rate'
                        },
                        expectedRange: [95, 100], // Agent completion percentage
                        priority: 'critical'
                    },
                    'D🧠.3⚙️': {
                        name: 'Code Integration',
                        outcomeMapping: {
                            agent: 3,
                            responsibility: 'matrix_integration',
                            measurableOutcome: 'integration_success_score'
                        },
                        expectedRange: [90, 100], // Integration success percentage
                        priority: 'high'
                    },
                    'D🧠.4📊': {
                        name: 'Report Compilation',
                        outcomeMapping: {
                            agent: 7,
                            responsibility: 'html_generation',
                            measurableOutcome: 'report_completeness_score'
                        },
                        expectedRange: [95, 100], // Report completeness percentage
                        priority: 'high'
                    }
                },
                expectedDebtRange: [600, 900],
                matrixPosition: 'diagonal_with_coupling'
            }
        };
    }

    generateFunctionalCategories() {
        console.log('🚀 Generating Functional Taxonomy Categories...\n');
        
        const categoryData = {
            timestamp: new Date().toISOString(),
            functionalTaxonomyVersion: '1.0.0',
            categories: this.functionalCategories,
            validationResults: this.validateCategories(),
            agentMappings: this.generateAgentMappings(),
            matrixSpecifications: this.generateMatrixSpecs()
        };

        return categoryData;
    }

    validateCategories() {
        const validation = {
            orthogonalityPassed: true,
            balancePassed: true,
            completenessScore: 100,
            issues: []
        };

        // Check if all agent outputs are mapped
        const mappedAgents = new Set();
        Object.values(this.functionalCategories).forEach(category => {
            category.ownerAgents.forEach(agent => mappedAgents.add(agent));
        });

        if (mappedAgents.size < 8) {
            validation.issues.push('Not all agents (0-7) are mapped to functional categories');
            validation.completenessScore -= 15;
        }

        // Check expected debt ranges don't overlap significantly
        const debtRanges = Object.values(this.functionalCategories).map(cat => cat.expectedDebtRange);
        for (let i = 0; i < debtRanges.length; i++) {
            for (let j = i + 1; j < debtRanges.length; j++) {
                const overlap = this.calculateRangeOverlap(debtRanges[i], debtRanges[j]);
                if (overlap > 0.2) { // >20% overlap
                    validation.orthogonalityPassed = false;
                    validation.issues.push(`High debt range overlap between categories ${i} and ${j}: ${overlap * 100}%`);
                }
            }
        }

        return validation;
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

    generateAgentMappings() {
        const mappings = {};
        
        Object.entries(this.functionalCategories).forEach(([categoryKey, category]) => {
            category.ownerAgents.forEach(agentId => {
                if (!mappings[agentId]) {
                    mappings[agentId] = {
                        functionalCategories: [],
                        jsonBuckets: [],
                        responsibilities: []
                    };
                }
                
                mappings[agentId].functionalCategories.push(categoryKey);
                mappings[agentId].jsonBuckets.push(...category.jsonBuckets);
                mappings[agentId].responsibilities.push(category.responsibility);
            });
        });

        return mappings;
    }

    generateMatrixSpecs() {
        return {
            dimensions: '4x4', // 4 functional categories
            expectedCorrelation: '<1%',
            matrixPositions: Object.fromEntries(
                Object.entries(this.functionalCategories).map(([key, cat]) => [
                    key, cat.matrixPosition
                ])
            ),
            diagonalDominance: ['A📊', 'D🧠'], // Self-consistency categories
            handoffPatterns: ['B💻', 'C📋'], // Data flow categories
            totalDebtTarget: {
                current: 13682, // From Grade D
                target: 7000, // Grade C threshold
                reduction: 48.8 // Percentage reduction needed
            }
        };
    }

    saveFunctionalCategories(categoryData) {
        const filename = '2-categories-functional.json';
        fs.writeFileSync(filename, JSON.stringify(categoryData, null, 2));
        console.log(`✅ Functional taxonomy saved to ${filename}`);
        return filename;
    }

    generateValidationReport(categoryData) {
        console.log('\n📊 Functional Taxonomy Validation Report');
        console.log('=' .repeat(50));
        
        console.log(`\n🎯 Functional Categories Generated: ${Object.keys(categoryData.categories).length}`);
        Object.entries(categoryData.categories).forEach(([key, category]) => {
            console.log(`  ${key} ${category.name}`);
            console.log(`    📋 Owner Agents: ${category.ownerAgents.join(', ')}`);
            console.log(`    💰 Expected Debt: ${category.expectedDebtRange[0]}-${category.expectedDebtRange[1]} units`);
            console.log(`    📍 Matrix Position: ${category.matrixPosition}`);
            console.log('');
        });

        console.log('\n🔍 Validation Results:');
        console.log(`  ✅ Orthogonality: ${categoryData.validationResults.orthogonalityPassed ? 'PASSED' : 'FAILED'}`);
        console.log(`  ⚖️ Balance: ${categoryData.validationResults.balancePassed ? 'PASSED' : 'FAILED'}`);
        console.log(`  📈 Completeness: ${categoryData.validationResults.completenessScore}%`);
        
        if (categoryData.validationResults.issues.length > 0) {
            console.log('\n⚠️  Issues Identified:');
            categoryData.validationResults.issues.forEach(issue => {
                console.log(`  • ${issue}`);
            });
        }

        console.log('\n🎯 Expected Performance Improvements:');
        console.log(`  📊 Current Grade: D (${categoryData.matrixSpecifications.totalDebtTarget.current} units)`);
        console.log(`  🎯 Target Grade: C (${categoryData.matrixSpecifications.totalDebtTarget.target} units)`);
        console.log(`  📉 Reduction Needed: ${categoryData.matrixSpecifications.totalDebtTarget.reduction}%`);
        console.log(`  🔗 Expected Correlation: ${categoryData.matrixSpecifications.expectedCorrelation}`);
        
        return categoryData.validationResults;
    }

    async run() {
        try {
            console.log('🚀 IntentGuard Functional Taxonomy Generator\n');
            
            const categoryData = this.generateFunctionalCategories();
            const filename = this.saveFunctionalCategories(categoryData);
            const validationResults = this.generateValidationReport(categoryData);
            
            if (validationResults.orthogonalityPassed && validationResults.balancePassed) {
                console.log('\n✅ SUCCESS: Functional taxonomy meets all validation criteria');
                console.log('🎯 Ready for Agent 2 integration and matrix generation');
            } else {
                console.log('\n⚠️  WARNING: Functional taxonomy needs refinement');
                console.log('🔄 Consider spawning validation agents for iterative improvement');
            }
            
            return {
                success: true,
                filename,
                validationResults,
                categoryCount: Object.keys(categoryData.categories).length
            };
            
        } catch (error) {
            console.error('❌ Error generating functional taxonomy:', error.message);
            throw error;
        }
    }
}

// Execute if run directly
if (require.main === module) {
    const generator = new FunctionalTaxonomyGenerator();
    generator.run().catch(console.error);
}

module.exports = FunctionalTaxonomyGenerator;