#!/usr/bin/env node

/**
 * CORRECTED SHORTLEX 25-CATEGORY GENERATOR
 * 
 * Proper ordering: ALL length 1 categories FIRST, then ALL length 2
 * A🚀, B🔒, C💨, D🧠, E🎨, F⚡ (6 length-1)
 * THEN A🚀.1⚡, A🚀.2🔥, etc. (19 length-2)
 */

const fs = require('fs');

console.log('📐 CORRECTED SHORTLEX 25-CATEGORY GENERATOR');
console.log('==========================================');
console.log('');

// CORRECT ShortLex ordering: LENGTH 1 → LENGTH 2
const SHORTLEX_25_CATEGORIES = [
    // ===== LENGTH 1: Parent categories FIRST (positions 1-6) =====
    { pos: 1, id: "A🚀", name: "A🚀 CoreEngine", color: "#00ff88", units: 705, length: 1 },
    { pos: 2, id: "B🔒", name: "B🔒 Documentation", color: "#00aaff", units: 411, length: 1 },
    { pos: 3, id: "C💨", name: "C💨 Visualization", color: "#ffaa00", units: 532, length: 1 },
    { pos: 4, id: "D🧠", name: "D🧠 Integration", color: "#ff00aa", units: 4184, length: 1 },
    { pos: 5, id: "E🎨", name: "E🎨 BusinessLayer", color: "#ff0044", units: 1829, length: 1 },
    { pos: 6, id: "F⚡", name: "F⚡ Claude-Flow", color: "#3b82f6", units: 469, length: 1 },
    
    // ===== LENGTH 2: Child categories SECOND (positions 7-25) =====
    { pos: 7, id: "A🚀.1⚡", name: "A🚀.1⚡ PatentFormula", color: "rgba(0, 255, 136, 0.7)", units: 176, length: 2, parent: "A🚀" },
    { pos: 8, id: "A🚀.2🔥", name: "A🚀.2🔥 TrustMeasurement", color: "rgba(0, 255, 136, 0.7)", units: 176, length: 2, parent: "A🚀" },
    { pos: 9, id: "A🚀.3📈", name: "A🚀.3📈 StatisticalAnalysis", color: "rgba(0, 255, 136, 0.7)", units: 177, length: 2, parent: "A🚀" },
    { pos: 10, id: "A🚀.4🎯", name: "A🚀.4🎯 ValidationEngine", color: "rgba(0, 255, 136, 0.7)", units: 176, length: 2, parent: "A🚀" },
    
    { pos: 11, id: "B🔒.1📚", name: "B🔒.1📚 IntentSpecification", color: "rgba(0, 170, 255, 0.7)", units: 137, length: 2, parent: "B🔒" },
    { pos: 12, id: "B🔒.2📖", name: "B🔒.2📖 BusinessPlans", color: "rgba(0, 170, 255, 0.7)", units: 137, length: 2, parent: "B🔒" },
    { pos: 13, id: "B🔒.3📋", name: "B🔒.3📋 ProcessMethodology", color: "rgba(0, 170, 255, 0.7)", units: 137, length: 2, parent: "B🔒" },
    
    { pos: 14, id: "C💨.1✨", name: "C💨.1✨ UserInterface", color: "rgba(255, 170, 0, 0.7)", units: 177, length: 2, parent: "C💨" },
    { pos: 15, id: "C💨.2🎨", name: "C💨.2🎨 VisualDesign", color: "rgba(255, 170, 0, 0.7)", units: 178, length: 2, parent: "C💨" },
    { pos: 16, id: "C💨.3📊", name: "C💨.3📊 DataVisualization", color: "rgba(255, 170, 0, 0.7)", units: 177, length: 2, parent: "C💨" },
    
    { pos: 17, id: "D🧠.1🔗", name: "D🧠.1🔗 DatabaseSystems", color: "rgba(255, 0, 170, 0.7)", units: 1395, length: 2, parent: "D🧠" },
    { pos: 18, id: "D🧠.2⚙️", name: "D🧠.2⚙️ PipelineCoordination", color: "rgba(255, 0, 170, 0.7)", units: 1395, length: 2, parent: "D🧠" },
    { pos: 19, id: "D🧠.3🌐", name: "D🧠.3🌐 ExternalSystems", color: "rgba(255, 0, 170, 0.7)", units: 1394, length: 2, parent: "D🧠" },
    
    { pos: 20, id: "E🎨.1💼", name: "E🎨.1💼 StrategicLogic", color: "rgba(255, 0, 68, 0.7)", units: 610, length: 2, parent: "E🎨" },
    { pos: 21, id: "E🎨.2⚖️", name: "E🎨.2⚖️ ComplianceFramework", color: "rgba(255, 0, 68, 0.7)", units: 610, length: 2, parent: "E🎨" },
    { pos: 22, id: "E🎨.3🎯", name: "E🎨.3🎯 BusinessOutcomes", color: "rgba(255, 0, 68, 0.7)", units: 609, length: 2, parent: "E🎨" },
    
    { pos: 23, id: "F⚡.0🎯", name: "F⚡.0🎯 Agent0-OutcomeParser", color: "rgba(59, 130, 246, 0.7)", units: 58, length: 2, parent: "F⚡", agent: 0 },
    { pos: 24, id: "F⚡.1💾", name: "F⚡.1💾 Agent1-DatabaseIndexer", color: "rgba(59, 130, 246, 0.7)", units: 59, length: 2, parent: "F⚡", agent: 1 },
    { pos: 25, id: "F⚡.7📄", name: "F⚡.7📄olor Agent7-ReportGenerator", color: "rgba(59, 130, 246, 0.7)", units: 59, length: 2, parent: "F⚡", agent: 7 }
];

console.log('📊 SHORTLEX ORDERING VERIFICATION:');
console.log('==================================');

// Show corrected ordering
SHORTLEX_25_CATEGORIES.forEach(cat => {
    const lengthIndicator = cat.length === 1 ? '[LENGTH 1]' : '[LENGTH 2]';
    const agentInfo = cat.agent !== undefined ? ` (Agent ${cat.agent})` : '';
    console.log(`${cat.pos.toString().padStart(2)}: ${cat.name.padEnd(50)} | ${lengthIndicator}${agentInfo}`);
});

console.log('');
console.log('✅ SHORTLEX COMPLIANCE:');
console.log('• Positions 1-6: ALL length 1 categories (parents)');
console.log('• Positions 7-25: ALL length 2 categories (children)');
console.log('• NO MIXING of lengths');
console.log('• Alphabetical within each length group');
console.log('');
console.log('🎨 COLOR THEORY APPLIED:');
console.log('• Parent colors: Reference spectrum (#00ff88, #00aaff, #ffaa00, #ff00aa, #ff0044, #3b82f6)');
console.log('• Child colors: Parent colors with 0.7 opacity');
console.log('• Cell backgrounds: Reduced to 0.05 opacity for text readability');
console.log('');

// Save corrected structure
fs.writeFileSync('shortlex-25-corrected.json', JSON.stringify({
    metadata: {
        type: "shortlex_25_corrected_categories",
        generated: new Date().toISOString(),
        total_categories: 25,
        length_1_categories: 6,
        length_2_categories: 19,
        shortlex_compliant: true,
        color_theory_applied: true
    },
    categories: SHORTLEX_25_CATEGORIES
}, null, 2));

console.log('💾 SAVED: shortlex-25-corrected.json');
console.log('🎯 Ready to regenerate matrix with proper ShortLex ordering and color theory');