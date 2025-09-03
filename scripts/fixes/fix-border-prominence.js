#!/usr/bin/env node

const fs = require('fs');

function fixBorderProminence(htmlPath) {
    console.log('🔧 Fixing Border Prominence\n');
    console.log('='.repeat(50));
    
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    // 1. Remove opacity from cells that affects borders
    console.log('📊 Adjusting cell opacity to preserve border visibility...');
    
    // Update the debt level styles to not fade borders
    const oldStyles = `        .debt-none { 
            color: #333;
            opacity: 0.3;
        }
        .debt-low { 
            color: #777;
            opacity: 0.5;
        }
        .debt-medium { 
            color: #999;
            opacity: 0.7;
        }`;
    
    const newStyles = `        .debt-none { 
            color: rgba(51, 51, 51, 0.4);
            /* No opacity on cell to preserve border visibility */
        }
        .debt-low { 
            color: rgba(119, 119, 119, 0.6);
            /* No opacity on cell to preserve border visibility */
        }
        .debt-medium { 
            color: rgba(153, 153, 153, 0.8);
            /* No opacity on cell to preserve border visibility */
        }`;
    
    html = html.replace(oldStyles, newStyles);
    
    // 2. Add stronger border styles with explicit opacity
    console.log('💪 Strengthening border definitions...');
    
    // Add CSS to ensure borders are always visible
    const borderEnhancement = `
        /* Ensure borders are always prominent */
        td[class*="block-start"],
        td[class*="block-end"] {
            position: relative;
            border-opacity: 1 !important;
        }
        
        /* Make borders more prominent with shadow effect */
        .block-end-A { 
            border-right: 3px solid #ff6600!important;
            box-shadow: inset -1px 0 0 rgba(255, 102, 0, 0.3);
        }
        .block-end-B { 
            border-right: 3px solid #9900ff!important;
            box-shadow: inset -1px 0 0 rgba(153, 0, 255, 0.3);
        }
        .block-end-C { 
            border-right: 3px solid #00ffff!important;
            box-shadow: inset -1px 0 0 rgba(0, 255, 255, 0.3);
        }
        .block-end-D { 
            border-right: 3px solid #ffff00!important;
            box-shadow: inset -1px 0 0 rgba(255, 255, 0, 0.3);
        }
        .block-end-E { 
            border-right: 3px solid #ff0099!important;
            box-shadow: inset -1px 0 0 rgba(255, 0, 153, 0.3);
        }`;
    
    // Replace existing border definitions with enhanced ones
    ['A', 'B', 'C', 'D', 'E'].forEach(letter => {
        const colors = {
            'A': '#ff6600',
            'B': '#9900ff',
            'C': '#00ffff',
            'D': '#ffff00',
            'E': '#ff0099'
        };
        
        // Update all four border types for each category
        const patterns = [
            {
                old: new RegExp(`\\.block-end-${letter} \\{\\s*border-right:[^}]+\\}`, 'g'),
                new: `.block-end-${letter} { 
            border-right: 4px solid ${colors[letter]}!important;
            box-shadow: inset -1px 0 0 rgba(${hexToRgb(colors[letter])}, 0.4);
        }`
            },
            {
                old: new RegExp(`\\.block-start-${letter} \\{\\s*border-left:[^}]+\\}`, 'g'),
                new: `.block-start-${letter} { 
            border-left: 4px solid ${colors[letter]}!important;
            box-shadow: inset 1px 0 0 rgba(${hexToRgb(colors[letter])}, 0.4);
        }`
            },
            {
                old: new RegExp(`\\.block-end-row-${letter} \\{\\s*border-bottom:[^}]+\\}`, 'g'),
                new: `.block-end-row-${letter} {
            border-bottom: 4px solid ${colors[letter]}!important;
            box-shadow: inset 0 -1px 0 rgba(${hexToRgb(colors[letter])}, 0.4);
        }`
            },
            {
                old: new RegExp(`\\.block-start-row-${letter} \\{\\s*border-top:[^}]+\\}`, 'g'),
                new: `.block-start-row-${letter} { 
            border-top: 4px solid ${colors[letter]}!important;
            box-shadow: inset 0 1px 0 rgba(${hexToRgb(colors[letter])}, 0.4);
        }`
            }
        ];
        
        patterns.forEach(pattern => {
            html = html.replace(pattern.old, pattern.new);
        });
    });
    
    // 3. Ensure subcategory headers remain visible
    console.log('🎯 Adjusting subcategory visibility...');
    
    // Update depth styles to be more prominent
    html = html.replace(
        `.depth-1 { padding-left: 8px; font-size: 10px; opacity: 0.9; }`,
        `.depth-1 { padding-left: 8px; font-size: 10px; opacity: 1; font-weight: 500; }`
    );
    
    html = html.replace(
        `.depth-2 { padding-left: 16px; font-size: 9px; opacity: 0.8; }`,
        `.depth-2 { padding-left: 16px; font-size: 9px; opacity: 0.95; }`
    );
    
    // Save the updated HTML
    const backupPath = htmlPath.replace('.html', '.backup-prominence.html');
    console.log(`\n💾 Creating backup at ${backupPath}`);
    fs.writeFileSync(backupPath, fs.readFileSync(htmlPath, 'utf8'));
    
    console.log(`💾 Saving enhanced HTML to ${htmlPath}`);
    fs.writeFileSync(htmlPath, html);
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Border prominence enhanced!');
    console.log('\nChanges made:');
    console.log('  • Removed cell opacity that was fading borders');
    console.log('  • Increased border width from 3px to 4px');
    console.log('  • Added subtle shadow effects for depth');
    console.log('  • Made subcategory labels more prominent');
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
        `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
        '0, 0, 0';
}

// Run the fix
const htmlPath = process.argv[2] || 'trust-debt-final.html';
fixBorderProminence(htmlPath);