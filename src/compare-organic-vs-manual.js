#!/usr/bin/env node

/**
 * AGENT 3 VALIDATION: ORGANIC vs MANUAL CATEGORY COMPARISON
 * =========================================================
 * 
 * Compares Trust Debt results between:
 * - Organic categories (extracted from combined corpus)
 * - Manual categories (pre-defined semantic categories)
 * 
 * This validation ensures we don't lose important insights while
 * eliminating artificial asymmetry from category design artifacts.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function runComparison() {
    console.log('🔬 TRUST DEBT MEASUREMENT COMPARISON');
    console.log('===================================\n');
    
    const results = {};
    
    // Test 1: Organic Categories
    console.log('🧠 Testing ORGANIC Categories (Natural Balance)...');
    if (fs.existsSync('trust-debt-organic-categories.json')) {
        try {
            const organicOutput = execSync('node src/trust-debt-final.js', { 
                encoding: 'utf8',
                timeout: 60000
            });
            
            results.organic = extractMetrics(organicOutput);
            console.log(`✅ Organic: ${results.organic.totalDebt} units Trust Debt`);
            console.log(`   Intent/Reality: ${results.organic.intentRealityRatio}`);
        } catch (e) {
            console.log('❌ Organic test failed:', e.message);
            results.organic = { error: e.message };
        }
    } else {
        console.log('⚠️ No organic categories file found, generating...');
        execSync('node src/trust-debt-organic-integration.js');
        console.log('✅ Organic categories generated, re-running test...');
        return runComparison(); // Retry with organic categories
    }
    
    // Test 2: Manual Categories (backup organic file temporarily)
    console.log('\n📁 Testing MANUAL Categories (Pre-defined Semantic)...');
    if (fs.existsSync('trust-debt-organic-categories.json')) {
        fs.renameSync('trust-debt-organic-categories.json', 'trust-debt-organic-categories.json.backup');
    }
    
    try {
        const manualOutput = execSync('node src/trust-debt-final.js', {
            encoding: 'utf8', 
            timeout: 60000
        });
        
        results.manual = extractMetrics(manualOutput);
        console.log(`✅ Manual: ${results.manual.totalDebt} units Trust Debt`);
        console.log(`   Intent/Reality: ${results.manual.intentRealityRatio}`);
    } catch (e) {
        console.log('❌ Manual test failed:', e.message);
        results.manual = { error: e.message };
    }
    
    // Restore organic categories
    if (fs.existsSync('trust-debt-organic-categories.json.backup')) {
        fs.renameSync('trust-debt-organic-categories.json.backup', 'trust-debt-organic-categories.json');
    }
    
    // Analysis and Comparison
    console.log('\n📊 COMPARATIVE ANALYSIS');
    console.log('=======================');
    
    if (results.organic && results.manual && !results.organic.error && !results.manual.error) {
        const debtReduction = ((results.manual.totalDebt - results.organic.totalDebt) / results.manual.totalDebt * 100).toFixed(1);
        const categoryReduction = results.manual.categories - results.organic.categories;
        
        console.log(`🔥 Trust Debt Reduction: ${results.manual.totalDebt} → ${results.organic.totalDebt} units (${debtReduction}% reduction)`);
        console.log(`📊 Category Simplification: ${results.manual.categories} → ${results.organic.categories} categories (${categoryReduction} fewer)`);
        console.log(`⚖️ Asymmetry Accuracy: Manual ${results.manual.asymmetryRatio}x → Organic ${results.organic.asymmetryRatio}x`);
        
        // Determine which approach is better
        if (results.organic.totalDebt < results.manual.totalDebt * 0.5) {
            console.log('\n✅ RECOMMENDATION: Use ORGANIC categories');
            console.log('   Organic extraction eliminates artificial asymmetry from category design');
            console.log('   Natural categories reveal genuine Intent-Reality drift patterns');
        } else {
            console.log('\n⚠️ RECOMMENDATION: Use MANUAL categories');
            console.log('   Organic extraction may have missed important domain concepts');
            console.log('   Manual categories preserve semantic quality better for this repository');
        }
        
    } else {
        console.log('❌ Comparison incomplete due to execution errors');
    }
    
    return results;
}

function extractMetrics(output) {
    const metrics = {};
    
    // Extract key metrics from output
    const totalDebtMatch = output.match(/Total Debt: (\d+) units/);
    if (totalDebtMatch) metrics.totalDebt = parseInt(totalDebtMatch[1]);
    
    const asymmetryMatch = output.match(/Asymmetry Ratio: ([\d.]+)x/);
    if (asymmetryMatch) metrics.asymmetryRatio = parseFloat(asymmetryMatch[1]);
    
    const intentMatch = output.match(/Intent total: ([\d.]+)/);
    const realityMatch = output.match(/Reality total: ([\d.]+)/);
    if (intentMatch && realityMatch) {
        const intent = parseFloat(intentMatch[1]);
        const reality = parseFloat(realityMatch[1]);
        metrics.intentRealityRatio = (intent / reality).toFixed(3);
    }
    
    const categoriesMatch = output.match(/Categories: (\d+) total/);
    if (categoriesMatch) metrics.categories = parseInt(categoriesMatch[1]);
    
    const processHealthMatch = output.match(/Overall Grade: [A-F] \(([\d.]+)%\)/);
    if (processHealthMatch) metrics.processHealth = parseFloat(processHealthMatch[1]);
    
    return metrics;
}

// Execute comparison
if (require.main === module) {
    runComparison()
        .then(results => {
            console.log('\n✅ Trust Debt measurement comparison completed!');
            
            // Save comparison results
            fs.writeFileSync('trust-debt-comparison-results.json', JSON.stringify(results, null, 2));
            console.log('💾 Results saved to trust-debt-comparison-results.json');
        })
        .catch(error => {
            console.error('💥 Comparison failed:', error);
            process.exit(1);
        });
}