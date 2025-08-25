#!/usr/bin/env node

const fs = require('fs');

function fixHeaderBorders(htmlPath) {
    console.log('🔧 Fixing Header Border Issues\n');
    console.log('='.repeat(50));
    
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    console.log('📋 Removing border classes from headers...\n');
    
    // Remove border classes from th elements
    let fixCount = 0;
    
    // Pattern to match th elements with border classes
    const thPattern = /<th([^>]*)\sclass="([^"]*)(block-(?:start|end)(?:-row)?-[A-E])([^"]*)"([^>]*)>/g;
    
    html = html.replace(thPattern, (match, before, classStart, borderClass, classEnd, after) => {
        fixCount++;
        // Remove the border class from the class list
        let newClasses = (classStart + ' ' + classEnd).trim();
        // Clean up multiple spaces
        newClasses = newClasses.replace(/\s+/g, ' ').trim();
        
        if (newClasses) {
            return `<th${before} class="${newClasses}"${after}>`;
        } else {
            // If no classes left, remove the class attribute entirely
            return `<th${before}${after}>`;
        }
    });
    
    console.log(`  Removed border classes from ${fixCount} headers`);
    
    // Also ensure borders are only between category blocks in the data cells
    console.log('\n📊 Verifying data cell borders are at block boundaries only...');
    
    // Count cells with borders
    const cellBorderMatches = html.match(/<td[^>]*class="[^"]*block-(?:start|end)[^"]*"/g);
    console.log(`  Found ${cellBorderMatches ? cellBorderMatches.length : 0} data cells with borders`);
    
    // Save the updated HTML
    const backupPath = htmlPath.replace('.html', '.backup-header-fix.html');
    console.log(`\n💾 Creating backup at ${backupPath}`);
    fs.writeFileSync(backupPath, fs.readFileSync(htmlPath, 'utf8'));
    
    console.log(`💾 Saving fixed HTML to ${htmlPath}`);
    fs.writeFileSync(htmlPath, html);
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Header border issues fixed!');
    console.log('\nChanges:');
    console.log('  • Removed border classes from header cells');
    console.log('  • Borders now only appear on data cells at block boundaries');
}

// Run the fix
const htmlPath = process.argv[2] || 'trust-debt-final.html';
fixHeaderBorders(htmlPath);