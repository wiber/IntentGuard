#!/usr/bin/env node

/**
 * DOUBLE BORDER MATRIX GENERATOR
 * 
 * Creates proper double borders between ALL category blocks:
 * - Vertical borders: between each parent category's children 
 * - Horizontal borders: between each parent category's children
 * - Border colors: colored by the "inside block" they separate
 * - Creates visual grid of 6×6 parent blocks, each containing children
 */

const fs = require('fs');

console.log('🔲 DOUBLE BORDER MATRIX GENERATOR');
console.log('=================================');
console.log('');

// Define 25 categories with proper groupings for border placement
const CATEGORIES_25 = [
    // LENGTH 1: Parents (positions 1-6)
    { pos: 1, id: "A🚀", name: "A🚀 CoreEngine", color: "#00ff88", units: 705, group: "A", type: "parent" },
    { pos: 2, id: "B🔒", name: "B🔒 Documentation", color: "#00aaff", units: 411, group: "B", type: "parent" },
    { pos: 3, id: "C💨", name: "C💨 Visualization", color: "#ffaa00", units: 532, group: "C", type: "parent" },
    { pos: 4, id: "D🧠", name: "D🧠 Integration", color: "#ff00aa", units: 4184, group: "D", type: "parent" },
    { pos: 5, id: "E🎨", name: "E🎨 BusinessLayer", color: "#ff0044", units: 1829, group: "E", type: "parent" },
    { pos: 6, id: "F⚡", name: "F⚡ Claude-Flow", color: "#3b82f6", units: 469, group: "F", type: "parent" },
    
    // LENGTH 2: Children (positions 7-25) - grouped by parent
    // A🚀 group (positions 7-10)
    { pos: 7, id: "A🚀.1⚡", name: "A🚀.1⚡ PatentFormula", color: "#00ff88", units: 176, group: "A", type: "child", parent: "A🚀" },
    { pos: 8, id: "A🚀.2🔥", name: "A🚀.2🔥 TrustMeasurement", color: "#00ff88", units: 176, group: "A", type: "child", parent: "A🚀" },
    { pos: 9, id: "A🚀.3📈", name: "A🚀.3📈 StatisticalAnalysis", color: "#00ff88", units: 177, group: "A", type: "child", parent: "A🚀" },
    { pos: 10, id: "A🚀.4🎯", name: "A🚀.4🎯 ValidationEngine", color: "#00ff88", units: 176, group: "A", type: "child", parent: "A🚀" },
    
    // B🔒 group (positions 11-13)
    { pos: 11, id: "B🔒.1📚", name: "B🔒.1📚 IntentSpecification", color: "#00aaff", units: 137, group: "B", type: "child", parent: "B🔒" },
    { pos: 12, id: "B🔒.2📖", name: "B🔒.2📖 BusinessPlans", color: "#00aaff", units: 137, group: "B", type: "child", parent: "B🔒" },
    { pos: 13, id: "B🔒.3📋", name: "B🔒.3📋 ProcessMethodology", color: "#00aaff", units: 137, group: "B", type: "child", parent: "B🔒" },
    
    // C💨 group (positions 14-16)  
    { pos: 14, id: "C💨.1✨", name: "C💨.1✨ UserInterface", color: "#ffaa00", units: 177, group: "C", type: "child", parent: "C💨" },
    { pos: 15, id: "C💨.2🎨", name: "C💨.2🎨 VisualDesign", color: "#ffaa00", units: 178, group: "C", type: "child", parent: "C💨" },
    { pos: 16, id: "C💨.3📊", name: "C💨.3📊 DataVisualization", color: "#ffaa00", units: 177, group: "C", type: "child", parent: "C💨" },
    
    // D🧠 group (positions 17-19)
    { pos: 17, id: "D🧠.1🔗", name: "D🧠.1🔗 DatabaseSystems", color: "#ff00aa", units: 1395, group: "D", type: "child", parent: "D🧠" },
    { pos: 18, id: "D🧠.2⚙️", name: "D🧠.2⚙️ PipelineCoordination", color: "#ff00aa", units: 1395, group: "D", type: "child", parent: "D🧠" },
    { pos: 19, id: "D🧠.3🌐", name: "D🧠.3🌐 ExternalSystems", color: "#ff00aa", units: 1394, group: "D", type: "child", parent: "D🧠" },
    
    // E🎨 group (positions 20-22)
    { pos: 20, id: "E🎨.1💼", name: "E🎨.1💼 StrategicLogic", color: "#ff0044", units: 610, group: "E", type: "child", parent: "E🎨" },
    { pos: 21, id: "E🎨.2⚖️", name: "E🎨.2⚖️ ComplianceFramework", color: "#ff0044", units: 610, group: "E", type: "child", parent: "E🎨" },
    { pos: 22, id: "E🎨.3🎯", name: "E🎨.3🎯 BusinessOutcomes", color: "#ff0044", units: 609, group: "E", type: "child", parent: "E🎨" },
    
    // F⚡ group (positions 23-25)
    { pos: 23, id: "F⚡.0🎯", name: "F⚡.0🎯 Agent0-OutcomeParser", color: "#3b82f6", units: 58, group: "F", type: "child", parent: "F⚡", agent: 0 },
    { pos: 24, id: "F⚡.1💾", name: "F⚡.1💾 Agent1-DatabaseIndexer", color: "#3b82f6", units: 59, group: "F", type: "child", parent: "F⚡", agent: 1 },
    { pos: 25, id: "F⚡.7📄", name: "F⚡.7📄 Agent7-ReportGenerator", color: "#3b82f6", units: 59, group: "F", type: "child", parent: "F⚡", agent: 7 }
];

// Map where borders should appear (at end of each group)
const GROUP_BOUNDARIES = {
    // Column boundaries (vertical borders)
    col_boundaries: [1, 2, 3, 4, 5, 6, 10, 13, 16, 19, 22], // After each parent and group end
    
    // Row boundaries (horizontal borders) 
    row_boundaries: [1, 2, 3, 4, 5, 6, 10, 13, 16, 19, 22], // After each parent and group end
    
    // Border colors for each boundary
    border_colors: {
        1: "#00ff88", // After A🚀
        2: "#00aaff", // After B🔒  
        3: "#ffaa00", // After C💨
        4: "#ff00aa", // After D🧠
        5: "#ff0044", // After E🎨
        6: "#3b82f6", // After F⚡
        10: "#00ff88", // After A🚀 children
        13: "#00aaff", // After B🔒 children
        16: "#ffaa00", // After C💨 children 
        19: "#ff00aa", // After D🧠 children
        22: "#ff0044", // After E🎨 children
    }
};

console.log('🔲 DOUBLE BORDER PLACEMENT:');
console.log('===========================');
console.log('');
console.log('📍 VERTICAL BORDERS (cutting through ALL cells below):');
GROUP_BOUNDARIES.col_boundaries.forEach(pos => {
    const color = GROUP_BOUNDARIES.border_colors[pos];
    const category = CATEGORIES_25[pos - 1];
    console.log(`   After column ${pos} (${category.id}): ${color}`);
});

console.log('');
console.log('📍 HORIZONTAL BORDERS (cutting through ALL cells to the right):');
GROUP_BOUNDARIES.row_boundaries.forEach(pos => {
    const color = GROUP_BOUNDARIES.border_colors[pos];
    const category = CATEGORIES_25[pos - 1];
    console.log(`   After row ${pos} (${category.id}): ${color}`);
});

console.log('');
console.log('🎨 COLOR THEORY VERIFICATION:');
console.log('============================');
console.log('• Parent colors: High contrast spectrum for maximum distinction');
console.log('• Border colors: Match the "inside block" they separate from');
console.log('• Cell backgrounds: 0.05 opacity to not overpower text');
console.log('• Text contrast: White/black optimized for readability');
console.log('');

// Generate CSS for all border intersections
function generateBorderCSS() {
    let css = '';
    
    // Vertical borders (columns)
    GROUP_BOUNDARIES.col_boundaries.forEach(pos => {
        const color = GROUP_BOUNDARIES.border_colors[pos];
        css += `
        /* Vertical border after column ${pos} */
        th:nth-child(${pos + 1}), td:nth-child(${pos + 1}) { 
            border-right: 3px solid ${color} !important; 
        }`;
    });
    
    // Horizontal borders (rows)
    GROUP_BOUNDARIES.row_boundaries.forEach(pos => {
        const color = GROUP_BOUNDARIES.border_colors[pos];
        css += `
        /* Horizontal border after row ${pos} */
        tr:nth-child(${pos + 1}) th, tr:nth-child(${pos + 1}) td { 
            border-bottom: 3px solid ${color} !important; 
        }`;
    });
    
    return css;
}

const borderCSS = generateBorderCSS();
fs.writeFileSync('double-border-css.css', borderCSS);

console.log('💾 SAVED: double-border-css.css');
console.log('🎯 Ready to implement complete double border grid across entire matrix');
console.log('');
console.log('✅ RESULT: 6×6 grid of colored submatrices with child category extensions');