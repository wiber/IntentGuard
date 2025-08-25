#!/usr/bin/env node

const fs = require('fs');

function fixBorderOpacityOnly(htmlPath) {
    console.log('🎨 Making Borders Full Opacity (No Weight Variations)\n');
    console.log('='.repeat(50));
    
    let html = fs.readFileSync(htmlPath, 'utf8');
    const originalLength = html.length;
    
    // ONLY change the header text colors to full opacity
    console.log('📝 Setting all header text to full opacity...\n');
    
    const colorMap = {
        '255, 102, 0': 'A (Performance)',
        '153, 0, 255': 'B (Security)',
        '0, 255, 255': 'C (Speed)',
        '255, 255, 0': 'D (Intelligence)',
        '255, 0, 153': 'E (Visual/UserExperience)'
    };
    
    let changeCount = 0;
    
    // Change all rgba colors to full opacity
    Object.entries(colorMap).forEach(([rgb, category]) => {
        // Change 0.8 opacity to 1.0
        const pattern08 = new RegExp(`rgba\\(${rgb}, 0\\.8\\)`, 'g');
        const matches08 = html.match(pattern08);
        if (matches08) {
            changeCount += matches08.length;
            console.log(`  ${category}: Found ${matches08.length} instances at 0.8 opacity → 1.0`);
            html = html.replace(pattern08, `rgba(${rgb}, 1)`);
        }
        
        // Change 0.6 opacity to 1.0
        const pattern06 = new RegExp(`rgba\\(${rgb}, 0\\.6\\)`, 'g');
        const matches06 = html.match(pattern06);
        if (matches06) {
            changeCount += matches06.length;
            console.log(`  ${category}: Found ${matches06.length} instances at 0.6 opacity → 1.0`);
            html = html.replace(pattern06, `rgba(${rgb}, 1)`);
        }
        
        // Change 0.9 opacity to 1.0
        const pattern09 = new RegExp(`rgba\\(${rgb}, 0\\.9\\)`, 'g');
        const matches09 = html.match(pattern09);
        if (matches09) {
            changeCount += matches09.length;
            console.log(`  ${category}: Found ${matches09.length} instances at 0.9 opacity → 1.0`);
            html = html.replace(pattern09, `rgba(${rgb}, 1)`);
        }
    });
    
    console.log(`\n📊 Total changes: ${changeCount} opacity values set to 1.0`);
    
    // Save the updated HTML
    const backupPath = htmlPath.replace('.html', '.backup-opacity-only.html');
    console.log(`\n💾 Creating backup at ${backupPath}`);
    fs.writeFileSync(backupPath, fs.readFileSync(htmlPath, 'utf8'));
    
    console.log(`💾 Saving updated HTML to ${htmlPath}`);
    fs.writeFileSync(htmlPath, html);
    
    const newLength = html.length;
    console.log(`  File size: ${originalLength} → ${newLength} bytes`);
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ All text and borders now at full opacity!');
    console.log('\nNote: Only opacity values were changed. No other styles modified.');
}

// Run the fix
const htmlPath = process.argv[2] || 'trust-debt-final.html';
fixBorderOpacityOnly(htmlPath);