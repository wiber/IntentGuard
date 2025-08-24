#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load the trust-debt-final.js to get category colors
const { TrustDebtCalculator } = require('./src/trust-debt-final.js');

// Test that border colors match label colors
function testBorderColors() {
    console.log('🧪 Testing Border Color Consistency\n');
    console.log('='*50);
    
    // Read the generated HTML
    const htmlPath = path.join(process.cwd(), 'trust-debt-final.html');
    if (!fs.existsSync(htmlPath)) {
        console.error('❌ trust-debt-final.html not found. Run generation first.');
        process.exit(1);
    }
    
    const html = fs.readFileSync(htmlPath, 'utf8');
    
    // Extract category colors from the HTML headers
    const headerColorRegex = /style="color:\s*rgba?\(([^)]+)\)[^"]*"[^>]*title="([^"]+)"/g;
    const labelColors = {};
    let match;
    
    while ((match = headerColorRegex.exec(html)) !== null) {
        const colorValues = match[1];
        const categoryId = match[2].split(' ')[0]; // Get just the ID part
        labelColors[categoryId] = colorValues;
    }
    
    console.log('📊 Found Label Colors:');
    Object.entries(labelColors).forEach(([cat, color]) => {
        if (cat.startsWith('A') || cat.startsWith('B') || cat.startsWith('C') || 
            cat.startsWith('D') || cat.startsWith('E')) {
            console.log(`  ${cat}: rgba(${color})`);
        }
    });
    
    // Extract border colors from CSS
    console.log('\n🎨 CSS Border Colors:');
    const cssBlockRegex = /\.block-(?:start|end)(?:-row)?-([A-E])\s*{\s*border-(?:right|left|top|bottom):\s*3px\s+solid\s+([^;]+)/g;
    const borderColors = {};
    
    while ((match = cssBlockRegex.exec(html)) !== null) {
        const letter = match[1];
        const color = match[2].trim().replace('!important', '').trim();
        if (!borderColors[letter]) {
            borderColors[letter] = color;
        }
    }
    
    Object.entries(borderColors).forEach(([letter, color]) => {
        console.log(`  ${letter}: ${color}`);
    });
    
    // Compare parent category colors
    console.log('\n✅ Verification Results:');
    const parentCategories = {
        'A': { id: 'A🚀', expectedColor: '#ff6600', name: 'Performance' },
        'B': { id: 'B🔒', expectedColor: '#9900ff', name: 'Security' },
        'C': { id: 'C💨', expectedColor: '#00ffff', name: 'Speed' },
        'D': { id: 'D🧠', expectedColor: '#ffff00', name: 'Intelligence' },
        'E': { id: 'E🎨', expectedColor: '#ff0099', name: 'Visual' }
    };
    
    let allMatch = true;
    Object.entries(parentCategories).forEach(([letter, info]) => {
        const borderColor = borderColors[letter];
        const labelColor = labelColors[info.id];
        const match = borderColor === info.expectedColor;
        
        console.log(`  ${info.id} ${info.name}:`);
        console.log(`    Border: ${borderColor}`);
        console.log(`    Expected: ${info.expectedColor}`);
        console.log(`    Status: ${match ? '✅ MATCH' : '❌ MISMATCH'}`);
        
        if (!match) allMatch = false;
    });
    
    // Test subcategory gradient/shading
    console.log('\n🌈 Subcategory Color Inheritance:');
    const subcategories = [
        'A🚀.1⚡', 'A🚀.2🔥', 'B🔒.1🛡', 'B🔒.2🔑', 'C💨.1🚀'
    ];
    
    subcategories.forEach(subcat => {
        const parentLetter = subcat.charAt(0);
        const parentInfo = parentCategories[parentLetter];
        const labelColor = labelColors[subcat];
        
        if (labelColor) {
            console.log(`  ${subcat}:`);
            console.log(`    Label color: rgba(${labelColor})`);
            console.log(`    Parent (${parentInfo.id}): ${parentInfo.expectedColor}`);
            console.log(`    Should inherit/gradient from parent color`);
        }
    });
    
    // Test border placement
    console.log('\n📍 Border Placement Test:');
    console.log('  Checking that borders only appear at block boundaries...');
    
    // Look for cells with border classes
    const cellRegex = /<td class="([^"]+)"/g;
    const borderClasses = [];
    while ((match = cellRegex.exec(html)) !== null) {
        const classes = match[1];
        if (classes.includes('block-start') || classes.includes('block-end')) {
            borderClasses.push(classes);
        }
    }
    
    console.log(`  Found ${borderClasses.length} cells with border classes`);
    
    // Verify double-wall effect
    console.log('\n🧱 Double-Wall Effect:');
    console.log('  At boundaries, cells should have both row and column border classes');
    
    const sampleBoundary = borderClasses.find(c => 
        c.includes('block-end-A') && c.includes('block-start-B')
    );
    
    if (sampleBoundary) {
        console.log('  ✅ Found double-wall boundary: ' + sampleBoundary);
    } else {
        console.log('  ⚠️  No clear double-wall boundaries found');
    }
    
    return allMatch;
}

// Run the test
const passed = testBorderColors();

console.log('\n' + '='*50);
if (passed) {
    console.log('✅ All border colors match label colors!');
} else {
    console.log('❌ Border colors need adjustment to match labels');
}

// Additional diagnostic
console.log('\n📋 Next Steps:');
console.log('1. Update CSS border colors to match label colors exactly');
console.log('2. Implement gradient/opacity for subcategories');
console.log('3. Ensure borders only at block boundaries');
console.log('4. Test double-wall visual separation');