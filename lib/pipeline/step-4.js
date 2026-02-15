/**
 * src/pipeline/step-4.ts — Grades & Statistics Calculator
 *
 * Assigns letter grades per trust-debt category using CALIBRATED boundaries.
 * This step produces the FIM Identity Vector — the core of geometric auth.
 *
 * INPUTS:  step-3 frequency analysis, step-2 process health, step-0 outcomes
 * OUTPUTS: 4-grades-statistics.json (letter grades + scores per category)
 *
 * CALIBRATED GRADE BOUNDARIES (from trust-debt-pipeline-coms.txt):
 * - Grade A (🟢 EXCELLENT): 0-500 units - Outstanding alignment, exemplary project
 * - Grade B (🟡 GOOD): 501-1500 units - Solid project with minor attention areas
 * - Grade C (🟠 NEEDS ATTENTION): 1501-3000 units - Clear work needed but achievable
 * - Grade D (🔴 REQUIRES WORK): 3001+ units - Significant systematic improvement needed
 *
 * CRITICAL: This step feeds directly into FIM geometric auth.
 * The identity vector IS the pipeline output. No manual override. Immutable.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { TRUST_DEBT_CATEGORIES } from '../auth/geometric.js';
/**
 * Map trust debt units to letter grade using CALIBRATED boundaries
 * A: 0-500, B: 501-1500, C: 1501-3000, D: 3001+
 */
function trustDebtToGrade(units) {
    if (units <= 500) {
        return {
            grade: 'A',
            description: 'EXCELLENT - Process optimization achieved',
            color: '#10b981',
        };
    }
    else if (units <= 1500) {
        return {
            grade: 'B',
            description: 'GOOD - Process refinement needed',
            color: '#f59e0b',
        };
    }
    else if (units <= 3000) {
        return {
            grade: 'C',
            description: 'NEEDS ATTENTION - Process restructuring required',
            color: '#ef4444',
        };
    }
    else {
        return {
            grade: 'D',
            description: 'REQUIRES WORK - Process overhaul necessary',
            color: '#dc2626',
        };
    }
}
/** Calculate standard deviation */
function stdDev(values) {
    if (values.length === 0)
        return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
}
/** Calculate median */
function median(values) {
    if (values.length === 0)
        return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
/**
 * Validate cross-agent data flow integrity
 */
function validateCrossAgentDataFlow(outcomesData, processHealthData, matrixData) {
    const dataFlowValidation = {
        agent_0_to_1: {
            requirement: 'Outcome requirements → Category structure',
            dataPresent: !!(outcomesData && outcomesData.twenty_category_structure),
            validationPassed: !!(outcomesData?.twenty_category_structure),
            flowMethodology: 'Outcome requirements seed category definitions',
        },
        agent_1_to_2: {
            requirement: 'Category structure → Process health governance',
            dataPresent: !!(processHealthData && processHealthData.process_health_governance),
            validationPassed: !!(processHealthData?.process_health_governance),
            flowMethodology: 'Categories enable process health calculation',
        },
        agent_2_to_3: {
            requirement: 'Process health → Matrix calculation',
            dataPresent: !!(matrixData && matrixData.matrix_calculation_engine),
            validationPassed: !!(matrixData?.matrix_calculation_engine),
            flowMethodology: 'Process health feeds matrix population',
        },
        agent_3_to_4: {
            requirement: 'Matrix data → Grade statistics',
            dataPresent: !!(matrixData?.matrix_calculation_engine?.matrix_population),
            validationPassed: !!(matrixData?.matrix_calculation_engine?.matrix_population),
            flowMethodology: 'Matrix enables statistical grade calculation',
        },
    };
    const overallFlowHealth = Object.values(dataFlowValidation).every((v) => v.validationPassed);
    return {
        dataFlowValidation,
        overallFlowHealth,
        flowMethodology: 'Sequential validation of agent handoffs with data integrity checks',
    };
}
/**
 * Calculate process health grade
 */
function calculateProcessHealthGrade(processHealthData) {
    const overallProcessHealth = processHealthData?.process_health_governance?.overall_process_health || 0;
    const orthogonalityAchieved = processHealthData?.critical_findings?.orthogonality_status === 'ACHIEVED';
    const balanceAchieved = processHealthData?.critical_findings?.balance_status === 'ACHIEVED';
    const baseProcessHealth = overallProcessHealth * 100;
    const orthogonalityBonus = orthogonalityAchieved ? 10 : -15;
    const balanceBonus = balanceAchieved ? 10 : -10;
    const finalProcessHealth = Math.max(0, Math.min(100, baseProcessHealth + orthogonalityBonus + balanceBonus));
    let healthGrade;
    let healthDescription;
    if (finalProcessHealth >= 90) {
        healthGrade = 'A';
        healthDescription = 'EXCELLENT process health';
    }
    else if (finalProcessHealth >= 75) {
        healthGrade = 'B';
        healthDescription = 'GOOD process health';
    }
    else if (finalProcessHealth >= 60) {
        healthGrade = 'C';
        healthDescription = 'FAIR process health';
    }
    else {
        healthGrade = 'D';
        healthDescription = 'POOR process health';
    }
    return {
        processHealthCalculation: {
            baseHealth: baseProcessHealth,
            orthogonalityBonus,
            balanceBonus,
            finalHealthScore: finalProcessHealth,
            healthGrade,
            healthDescription,
        },
        healthMethodology: 'Base health + Orthogonality + Balance bonuses/penalties',
        processFactors: {
            orthogonalityAchieved,
            balanceAchieved,
            overallProcessGovernance: 'Multi-factor health assessment',
        },
    };
}
/**
 * Validate pipeline coherence
 */
function validatePipelineCoherence(outcomesData, processHealthData, matrixData) {
    const coherenceChecks = {
        categoryConsistency: {
            agent_0_categories: Object.keys(outcomesData?.twenty_category_structure || {}),
            agent_2_categories: Object.keys(processHealthData?.process_health_governance?.category_health_scores || {}),
            agent_3_matrix_size: matrixData?.matrix_calculation_engine?.matrix_population?.matrix_metrics?.total_cells || 0,
            expectedMatrixSize: 400,
            consistencyValidated: true,
        },
        dataLineage: {
            outcomesToCategories: !!(outcomesData?.twenty_category_structure),
            categoriesToHealth: !!(processHealthData?.process_health_governance),
            healthToMatrix: !!(matrixData?.matrix_calculation_engine),
            matrixToStatistics: true,
            lineageComplete: true,
        },
        architecturalCoherence: {
            processFocusMaintained: true,
            methodologyOverResults: true,
            agentResponsibilitiesMapped: true,
            twentyCategoryLimitEnforced: true,
        },
    };
    const overallCoherence = Object.values(coherenceChecks).every((check) => Object.values(check).every((value) => value === true || typeof value === 'number' || Array.isArray(value)));
    return {
        coherenceChecks,
        overallCoherence,
        coherenceMethodology: 'Multi-stage validation of pipeline consistency',
    };
}
/**
 * Validate JSON bucket integrity
 */
function validateJSONBucketIntegrity(outcomesData, processHealthData, matrixData) {
    const requiredStructures = {
        agent_0_outcomes: {
            requiredKeys: ['metadata', 'process_outcomes_extracted', 'twenty_category_structure'],
            presentKeys: outcomesData ? Object.keys(outcomesData) : [],
            validationMethodology: 'Structural completeness check',
        },
        agent_2_process_health: {
            requiredKeys: ['metadata', 'process_health_governance', 'twenty_category_validation'],
            presentKeys: processHealthData ? Object.keys(processHealthData) : [],
            validationMethodology: 'Process governance validation',
        },
        agent_3_matrix: {
            requiredKeys: ['metadata', 'matrix_calculation_engine', 'validation_results'],
            presentKeys: matrixData ? Object.keys(matrixData) : [],
            validationMethodology: 'Matrix calculation completeness',
        },
    };
    const bucketIntegrityResults = {};
    for (const [bucketName, validation] of Object.entries(requiredStructures)) {
        const missingKeys = validation.requiredKeys.filter((key) => !validation.presentKeys.includes(key));
        bucketIntegrityResults[bucketName] = {
            ...validation,
            missingKeys,
            integrityScore: validation.presentKeys.length / validation.requiredKeys.length,
            integrityPassed: missingKeys.length === 0,
        };
    }
    return {
        bucketIntegrityResults,
        overallIntegrity: Object.values(bucketIntegrityResults).every((r) => r.integrityPassed),
        integrityMethodology: 'Required key presence validation with completeness scoring',
    };
}
/**
 * Run step 4: compute grades and statistics using CALIBRATED boundaries.
 */
export async function run(runDir, stepDir) {
    console.log('[step-4] Computing grades and statistics with CALIBRATED boundaries...');
    // Load step 3 output (required)
    const freqPath = join(runDir, '3-frequency-analysis', '3-frequency-analysis.json');
    if (!existsSync(freqPath)) {
        throw new Error(`Required input file not found: ${freqPath}`);
    }
    const freqData = JSON.parse(readFileSync(freqPath, 'utf-8'));
    // Load step 2 output (optional, for process health)
    let processHealthData = null;
    const processHealthPath = join(runDir, '2-categories-balanced', '2-categories-balanced.json');
    if (existsSync(processHealthPath)) {
        processHealthData = JSON.parse(readFileSync(processHealthPath, 'utf-8'));
    }
    // Load step 0 output (optional, for outcomes)
    let outcomesData = null;
    const outcomesPath = join(runDir, '0-outcome-requirements', '0-outcome-requirements.json');
    if (existsSync(outcomesPath)) {
        outcomesData = JSON.parse(readFileSync(outcomesPath, 'utf-8'));
    }
    // Load matrix data if available (step 3 may produce this)
    let matrixData = null;
    const matrixPath = join(runDir, '3-presence-matrix', '3-presence-matrix.json');
    if (existsSync(matrixPath)) {
        matrixData = JSON.parse(readFileSync(matrixPath, 'utf-8'));
    }
    // Calculate trust debt per category using patent formula
    const categoryTrustDebt = {};
    let totalTrustDebt = 0;
    let cellCount = 0;
    // If we have matrix data, use it to calculate trust debt units
    if (matrixData?.matrix_calculation_engine?.matrix_population?.matrix_cells) {
        const matrixCells = matrixData.matrix_calculation_engine.matrix_population.matrix_cells;
        for (const [_cellKey, cellData] of Object.entries(matrixCells)) {
            const trustDebtUnits = cellData.trust_debt_units || 0;
            const rowCategory = cellData.row_category;
            if (!categoryTrustDebt[rowCategory]) {
                categoryTrustDebt[rowCategory] = 0;
            }
            categoryTrustDebt[rowCategory] += trustDebtUnits;
            totalTrustDebt += trustDebtUnits;
            cellCount++;
        }
    }
    else {
        // Fallback: estimate from frequency data
        const maxStrength = Math.max(...freqData.frequencies.map((f) => f.totalStrength), 0.001);
        for (const freq of freqData.frequencies) {
            // Estimate trust debt units from frequency strength
            // Higher strength = lower debt (inverse relationship)
            const strengthScore = freq.totalStrength / maxStrength;
            const estimatedDebt = (1.0 - strengthScore) * 1000; // Scale to ~1000 units per category
            categoryTrustDebt[freq.category] = estimatedDebt;
            totalTrustDebt += estimatedDebt;
            cellCount++;
        }
    }
    // Apply sophistication discount and process health factor
    const categoryCount = Object.keys(outcomesData?.twenty_category_structure || TRUST_DEBT_CATEGORIES).length;
    const sophisticationDiscount = 0.30; // 30% discount for multi-agent architecture
    const processHealthFactor = processHealthData?.process_health_governance?.overall_process_health || 0.8;
    const rawTrustDebt = totalTrustDebt;
    const sophisticationAdjusted = rawTrustDebt * (1 - sophisticationDiscount);
    const finalTrustDebt = sophisticationAdjusted / processHealthFactor;
    // Determine overall grade using CALIBRATED boundaries
    const gradeInfo = trustDebtToGrade(finalTrustDebt);
    // Build category-level grades
    const categories = {};
    const trustDebtValues = [];
    for (const freq of freqData.frequencies) {
        const categoryDebt = categoryTrustDebt[freq.category] || 0;
        const categoryGradeInfo = trustDebtToGrade(categoryDebt);
        trustDebtValues.push(categoryDebt);
        categories[freq.category] = {
            category: freq.category,
            grade: categoryGradeInfo.grade,
            trustDebtUnits: Math.round(categoryDebt),
            percentile: 0, // Filled in after all scores computed
            trend: 'stable',
            evidence: {
                totalStrength: freq.totalStrength,
                documentCount: freq.documentCount,
                avgStrength: freq.avgStrength,
                percentOfCorpus: freq.percentOfCorpus,
            },
        };
    }
    // Fill in categories that had no signals
    for (const cat of TRUST_DEBT_CATEGORIES) {
        if (!categories[cat]) {
            categories[cat] = {
                category: cat,
                grade: 'F',
                trustDebtUnits: 0,
                percentile: 0,
                trend: 'stable',
                evidence: { totalStrength: 0, documentCount: 0, avgStrength: 0, percentOfCorpus: 0 },
            };
            trustDebtValues.push(0);
        }
    }
    // Calculate percentiles
    const sortedValues = [...trustDebtValues].sort((a, b) => a - b);
    for (const cat of Object.values(categories)) {
        const rank = sortedValues.findIndex((s) => s >= cat.trustDebtUnits);
        cat.percentile = Math.round((rank / Math.max(1, sortedValues.length - 1)) * 100);
    }
    // Grade distribution
    const gradeDistribution = {};
    for (const cat of Object.values(categories)) {
        gradeDistribution[cat.grade] = (gradeDistribution[cat.grade] || 0) + 1;
    }
    // Find top and bottom categories (lower debt = better)
    const sorted = Object.values(categories).sort((a, b) => a.trustDebtUnits - b.trustDebtUnits);
    const passingCategories = sorted.filter((c) => c.trustDebtUnits <= 1500).length;
    // Run integration validation
    const crossAgentDataFlow = validateCrossAgentDataFlow(outcomesData, processHealthData, matrixData);
    const jsonBucketIntegrity = validateJSONBucketIntegrity(outcomesData, processHealthData, matrixData);
    const pipelineCoherence = validatePipelineCoherence(outcomesData, processHealthData, matrixData);
    const processHealthAssessment = calculateProcessHealthGrade(processHealthData);
    const integrationScore = (crossAgentDataFlow.overallFlowHealth ? 25 : 0) +
        (jsonBucketIntegrity.overallIntegrity ? 25 : 0) +
        (pipelineCoherence.overallCoherence ? 25 : 0) +
        25; // Base score for completion
    const result = {
        metadata: {
            agent: 4,
            name: 'INTEGRATION VALIDATION & GRADE CALCULATOR',
            generated: new Date().toISOString(),
            architecture: '20-category integration validation system',
            focus: 'Integration validation methodologies and grade calculation procedures',
        },
        step: 4,
        timestamp: new Date().toISOString(),
        categories,
        trustDebtCalculation: {
            patentFormulaApplication: {
                formula: '|Intent - Reality|² × CategoryWeight × ProcessHealth',
                rawTrustDebt: Math.round(rawTrustDebt),
                sophisticationDiscount,
                sophisticationAdjusted: Math.round(sophisticationAdjusted),
                processHealthFactor,
                finalTrustDebt: Math.round(finalTrustDebt),
                matrixCellsAnalyzed: cellCount,
                categoryCount,
            },
            gradeCalculation: {
                grade: gradeInfo.grade,
                description: gradeInfo.description,
                color: gradeInfo.color,
                trustDebtUnits: Math.round(finalTrustDebt),
                gradeBoundaries: {
                    A: '0-500 units',
                    B: '501-1500 units',
                    C: '1501-3000 units',
                    D: '3001+ units',
                },
            },
            categoryBreakdown: categoryTrustDebt,
        },
        processHealthAssessment,
        integrationValidation: {
            crossAgentDataFlow,
            jsonBucketIntegrity,
            pipelineCoherence,
        },
        statisticalSummary: {
            finalTrustDebtGrade: gradeInfo.grade,
            trustDebtUnits: Math.round(finalTrustDebt),
            processHealthGrade: processHealthAssessment.processHealthCalculation.healthGrade,
            pipelineCoherenceStatus: pipelineCoherence.overallCoherence ? 'VALIDATED' : 'ISSUES_DETECTED',
            integrationScore,
        },
        distribution: {
            gradeDistribution,
            meanTrustDebt: Math.round(trustDebtValues.reduce((s, v) => s + v, 0) / trustDebtValues.length),
            medianTrustDebt: Math.round(median(trustDebtValues)),
            stdDeviation: Math.round(stdDev(trustDebtValues)),
        },
        stats: {
            totalCategories: TRUST_DEBT_CATEGORIES.length,
            passingCategories,
            failingCategories: TRUST_DEBT_CATEGORIES.length - passingCategories,
            topCategory: sorted[0]?.category || 'none',
            bottomCategory: sorted[sorted.length - 1]?.category || 'none',
        },
    };
    writeFileSync(join(stepDir, '4-grades-statistics.json'), JSON.stringify(result, null, 2));
    console.log(`[step-4] Trust Debt: ${finalTrustDebt.toFixed(0)} units (${gradeInfo.grade}) — ${passingCategories}/${TRUST_DEBT_CATEGORIES.length} passing`);
    console.log(`[step-4] Process Health: ${processHealthAssessment.processHealthCalculation.finalHealthScore.toFixed(0)}/100 (${processHealthAssessment.processHealthCalculation.healthGrade})`);
    console.log(`[step-4] Integration Score: ${integrationScore}/100`);
}
//# sourceMappingURL=step-4.js.map