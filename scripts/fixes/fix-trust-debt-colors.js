#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Single source of truth for colors
const CATEGORY_COLORS = {
    'A': '#ff6600',  // Orange - Performance
    'B': '#9900ff',  // Purple - Security  
    'C': '#00ffff',  // Cyan - Speed
    'D': '#ffff00',  // Yellow - Intelligence
    'E': '#ff0099'   // Pink - Visual/UserExperience
};

// Color mappings to fix
const COLOR_FIXES = {
    // Old colors -> New colors
    '#00ff88': '#ff6600',  // Old A (green) -> New A (orange)
    '#00aaff': '#9900ff',  // Old B (blue) -> New B (purple)
    '#ffaa00': '#00ffff',  // Old C (orange) -> New C (cyan)
    '#ff00aa': '#ffff00',  // Old D (magenta) -> New D (yellow)
    '#ff0044': '#ff0099'   // Old E (red) -> New E (pink)
};

function fixHTMLColors(htmlPath) {
    console.log('🔧 Fixing Trust Debt Report Colors\n');
    console.log('='.repeat(50));
    
    if (!fs.existsSync(htmlPath)) {
        console.error(`❌ File not found: ${htmlPath}`);
        process.exit(1);
    }
    
    let html = fs.readFileSync(htmlPath, 'utf8');
    const originalLength = html.length;
    
    console.log(`📄 Loaded ${htmlPath} (${originalLength} bytes)\n`);
    
    // Fix border colors in CSS
    console.log('🎨 Fixing CSS border colors...');
    let cssFixCount = 0;
    
    // Fix each category's border colors
    Object.entries(CATEGORY_COLORS).forEach(([letter, newColor]) => {
        // Fix all border definitions for this category
        const patterns = [
            // Vertical borders
            new RegExp(`(\\.block-end-${letter}\\s*{[^}]*border-right:\\s*3px\\s+solid\\s+)([^;!]+)`, 'g'),
            new RegExp(`(\\.block-start-${letter}\\s*{[^}]*border-left:\\s*3px\\s+solid\\s+)([^;!]+)`, 'g'),
            // Horizontal borders
            new RegExp(`(\\.block-end-row-${letter}\\s*{[^}]*border-bottom:\\s*3px\\s+solid\\s+)([^;!]+)`, 'g'),
            new RegExp(`(\\.block-start-row-${letter}\\s*{[^}]*border-top:\\s*3px\\s+solid\\s+)([^;!]+)`, 'g')
        ];
        
        patterns.forEach(pattern => {
            html = html.replace(pattern, (match, prefix, oldColor) => {
                const color = oldColor.trim().replace(/\s*!important\s*/, '');
                if (color !== newColor) {
                    cssFixCount++;
                    console.log(`  ${letter}: ${color} → ${newColor}`);
                    return prefix + newColor;
                }
                return match;
            });
        });
    });
    
    console.log(`  Fixed ${cssFixCount} CSS border colors\n`);
    
    // Fix stat box border colors
    console.log('🎯 Fixing stat box borders...');
    let statFixCount = 0;
    
    // Fix stat:nth-child border colors
    const statPatterns = [
        { pattern: /\.stat:nth-child\(1\)\s*{\s*border-color:\s*([^;]+);/, color: CATEGORY_COLORS.A },
        { pattern: /\.stat:nth-child\(2\)\s*{\s*border-color:\s*([^;]+);/, color: CATEGORY_COLORS.B },
        { pattern: /\.stat:nth-child\(3\)\s*{\s*border-color:\s*([^;]+);/, color: CATEGORY_COLORS.C },
        { pattern: /\.stat:nth-child\(4\)\s*{\s*border-color:\s*([^;]+);/, color: CATEGORY_COLORS.D },
        { pattern: /\.stat:nth-child\(5\)\s*{\s*border-color:\s*([^;]+);/, color: CATEGORY_COLORS.E }
    ];
    
    statPatterns.forEach((stat, i) => {
        html = html.replace(stat.pattern, (match, oldColor) => {
            if (oldColor.trim() !== stat.color) {
                statFixCount++;
                const letter = String.fromCharCode(65 + i); // A, B, C, D, E
                console.log(`  Stat ${i+1} (${letter}): ${oldColor.trim()} → ${stat.color}`);
                return match.replace(oldColor, stat.color);
            }
            return match;
        });
    });
    
    console.log(`  Fixed ${statFixCount} stat border colors\n`);
    
    // Fix any remaining old colors in the HTML
    console.log('🔄 Fixing remaining color references...');
    let remainingFixCount = 0;
    
    Object.entries(COLOR_FIXES).forEach(([oldColor, newColor]) => {
        const regex = new RegExp(oldColor.replace('#', '#'), 'gi');
        const matches = html.match(regex);
        if (matches) {
            remainingFixCount += matches.length;
            console.log(`  Replacing ${matches.length} instances of ${oldColor} with ${newColor}`);
            html = html.replace(regex, newColor);
        }
    });
    
    console.log(`  Fixed ${remainingFixCount} remaining color references\n`);
    
    // Save the fixed HTML
    const backupPath = htmlPath.replace('.html', '.backup.html');
    console.log(`💾 Creating backup at ${backupPath}`);
    fs.writeFileSync(backupPath, fs.readFileSync(htmlPath, 'utf8'));
    
    console.log(`💾 Saving fixed HTML to ${htmlPath}`);
    fs.writeFileSync(htmlPath, html);
    
    const newLength = html.length;
    console.log(`  File size: ${originalLength} → ${newLength} bytes\n`);
    
    console.log('='.repeat(50));
    console.log('✅ Color fix complete!');
    console.log('\nRun validation to verify:');
    console.log('  node validate-trust-debt-report.js');
}

// Run the fix
const htmlPath = process.argv[2] || 'trust-debt-final.html';
fixHTMLColors(htmlPath);