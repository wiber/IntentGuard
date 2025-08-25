#!/usr/bin/env node

const fs = require('fs');

function fixExactBorderColors(htmlPath, useWeightVariations = false) {
    console.log('🎨 Fixing Borders to Exactly Match Text Colors\n');
    console.log('='.repeat(50));
    console.log(`⚙️  Weight-based variations: ${useWeightVariations ? 'ENABLED' : 'DISABLED'}\n`);
    
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    // Define exact colors for each category
    const CATEGORY_COLORS = {
        'A': { hex: '#ff6600', rgb: '255, 102, 0', name: 'Performance' },
        'B': { hex: '#9900ff', rgb: '153, 0, 255', name: 'Security' },
        'C': { hex: '#00ffff', rgb: '0, 255, 255', name: 'Speed' },
        'D': { hex: '#ffff00', rgb: '255, 255, 0', name: 'Intelligence' },
        'E': { hex: '#ff0099', rgb: '255, 0, 153', name: 'Visual/UserExperience' }
    };
    
    // Step 1: Remove all opacity-based cell styling
    console.log('🔧 Removing opacity-based cell styling...');
    
    // Remove opacity from debt level styles completely
    const debtStyles = `        .debt-none { 
            background: rgba(240, 240, 240, 0.3);
            color: #666;
        }
        .debt-low { 
            background: rgba(240, 240, 240, 0.2);
            color: #444;
        }
        .debt-medium { 
            background: rgba(240, 240, 240, 0.1);
            color: #222;
        }
        .debt-high {
            background: transparent;
            color: #000;
        }
        .debt-critical {
            background: rgba(255, 240, 240, 0.3);
            color: #000;
            font-weight: bold;
        }`;
    
    // Replace all debt style definitions
    html = html.replace(/\.debt-none\s*{[^}]+}/g, `.debt-none { 
            background: rgba(240, 240, 240, 0.3);
            color: #666;
        }`);
    html = html.replace(/\.debt-low\s*{[^}]+}/g, `.debt-low { 
            background: rgba(240, 240, 240, 0.2);
            color: #444;
        }`);
    html = html.replace(/\.debt-medium\s*{[^}]+}/g, `.debt-medium { 
            background: rgba(240, 240, 240, 0.1);
            color: #222;
        }`);
    
    // Step 2: Update ALL border definitions to use full opacity colors
    console.log('🎨 Setting borders to exact category colors...\n');
    
    Object.entries(CATEGORY_COLORS).forEach(([letter, config]) => {
        console.log(`  Category ${letter} (${config.name}): ${config.hex}`);
        
        // Update all four border directions with exact color
        const borderUpdates = [
            // Vertical borders (column boundaries)
            {
                pattern: new RegExp(`\\.block-end-${letter}\\s*{[^}]*}`, 'g'),
                replacement: `.block-end-${letter} { 
            border-right: 3px solid ${config.hex} !important;
        }`
            },
            {
                pattern: new RegExp(`\\.block-start-${letter}\\s*{[^}]*}`, 'g'),
                replacement: `.block-start-${letter} { 
            border-left: 3px solid ${config.hex} !important;
        }`
            },
            // Horizontal borders (row boundaries)
            {
                pattern: new RegExp(`\\.block-end-row-${letter}\\s*{[^}]*}`, 'g'),
                replacement: `.block-end-row-${letter} {
            border-bottom: 3px solid ${config.hex} !important;
        }`
            },
            {
                pattern: new RegExp(`\\.block-start-row-${letter}\\s*{[^}]*}`, 'g'),
                replacement: `.block-start-row-${letter} { 
            border-top: 3px solid ${config.hex} !important;
        }`
            }
        ];
        
        borderUpdates.forEach(update => {
            html = html.replace(update.pattern, update.replacement);
        });
    });
    
    // Step 3: Update header text colors to full opacity if weight variations disabled
    if (!useWeightVariations) {
        console.log('\n📝 Updating header text colors to full opacity...');
        
        // Update all header colors to use full opacity
        Object.entries(CATEGORY_COLORS).forEach(([letter, config]) => {
            // Parent categories - already at full opacity
            const parentPattern = new RegExp(
                `style="color: rgba\\(${config.rgb}, 1\\)`,
                'g'
            );
            
            // Subcategories level 1 - change from 0.8 to 1.0
            const level1Pattern = new RegExp(
                `style="color: rgba\\(${config.rgb}, 0\\.8\\)`,
                'g'
            );
            html = html.replace(level1Pattern, `style="color: rgba(${config.rgb}, 1)`);
            
            // Subcategories level 2 - change from 0.6 to 1.0
            const level2Pattern = new RegExp(
                `style="color: rgba\\(${config.rgb}, 0\\.6\\)`,
                'g'
            );
            html = html.replace(level2Pattern, `style="color: rgba(${config.rgb}, 1)`);
        });
        
        // Remove opacity from depth styles
        html = html.replace(
            /\.depth-1\s*{[^}]+}/g,
            `.depth-1 { padding-left: 8px; font-size: 10px; }`
        );
        html = html.replace(
            /\.depth-2\s*{[^}]+}/g,
            `.depth-2 { padding-left: 16px; font-size: 9px; }`
        );
    }
    
    // Step 4: Add CSS to ensure borders are never affected by cell opacity
    console.log('\n🛡️ Adding CSS to protect borders from opacity effects...');
    
    const borderProtectionCSS = `
        /* BORDER COLOR SETTINGS */
        /* useWeightVariations: ${useWeightVariations} */
        
        /* Ensure borders always use full opacity colors */
        td[class*="block-start"],
        td[class*="block-end"] {
            position: relative;
        }
        
        /* Force all borders to exact colors */
        ${Object.entries(CATEGORY_COLORS).map(([letter, config]) => `
        .block-end-${letter} { border-right-color: ${config.hex} !important; }
        .block-start-${letter} { border-left-color: ${config.hex} !important; }
        .block-end-row-${letter} { border-bottom-color: ${config.hex} !important; }
        .block-start-row-${letter} { border-top-color: ${config.hex} !important; }`).join('')}
        
        /* Ensure border width is consistent */
        [class*="block-start"],
        [class*="block-end"] {
            border-width: 3px !important;
            border-style: solid !important;
        }`;
    
    // Insert the protection CSS right after the existing border definitions
    const styleEndIndex = html.indexOf('</style>');
    html = html.slice(0, styleEndIndex) + borderProtectionCSS + '\n    ' + html.slice(styleEndIndex);
    
    // Step 5: Verify and report
    console.log('\n📊 Summary of changes:');
    console.log('  ✓ Removed opacity variations from cell styles');
    console.log('  ✓ Set all borders to exact category colors');
    if (!useWeightVariations) {
        console.log('  ✓ Disabled weight-based opacity on headers');
        console.log('  ✓ All text and borders now use full opacity colors');
    }
    console.log('  ✓ Added CSS protection against opacity inheritance');
    
    // Save the updated HTML
    const backupPath = htmlPath.replace('.html', '.backup-exact-colors.html');
    console.log(`\n💾 Creating backup at ${backupPath}`);
    fs.writeFileSync(backupPath, fs.readFileSync(htmlPath, 'utf8'));
    
    console.log(`💾 Saving updated HTML to ${htmlPath}`);
    fs.writeFileSync(htmlPath, html);
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Border colors fixed to exactly match text colors!');
    console.log('\nTo re-enable weight variations, run:');
    console.log('  node fix-exact-border-colors.js trust-debt-final.html true');
}

// Run the fix
const htmlPath = process.argv[2] || 'trust-debt-final.html';
const useWeightVariations = process.argv[3] === 'true';
fixExactBorderColors(htmlPath, useWeightVariations);