#!/usr/bin/env node

const fs = require('fs');

// Expected colors for each category
const CATEGORY_COLORS = {
    'A': '#ff6600',  // Orange
    'B': '#9900ff',  // Purple  
    'C': '#00ffff',  // Cyan
    'D': '#ffff00',  // Yellow
    'E': '#ff0099'   // Pink
};

function inspectBorders(htmlPath) {
    console.log('🔍 Detailed Border Inspection\n');
    console.log('='.repeat(50));
    
    const html = fs.readFileSync(htmlPath, 'utf8');
    
    // Extract all cells with their border classes and titles
    const cellRegex = /<td class="([^"]+)"[^>]*title="([^"]+)"/g;
    const cells = [];
    let match;
    
    while ((match = cellRegex.exec(html)) !== null) {
        const classes = match[1];
        const title = match[2];
        
        // Parse the title to get from/to categories
        const [fromPart, toPart] = title.split('→');
        if (!fromPart || !toPart) continue;
        
        const from = fromPart.trim().split(':')[0].trim();
        const to = toPart.split(':')[0].trim();
        
        // Extract border classes
        const borders = {
            rowStart: classes.match(/block-start-row-([A-E])/),
            rowEnd: classes.match(/block-end-row-([A-E])/),
            colStart: classes.match(/block-start-([A-E])(?!\w)/),
            colEnd: classes.match(/block-end-([A-E])/)
        };
        
        // Determine the expected category letters based on category names
        const categoryMap = {
            'Performance': 'A',
            'Optimization': 'A',
            'Caching': 'A',
            'Scaling': 'A',
            'Efficiency': 'A',
            'Security': 'B',
            'Defense': 'B',
            'Authentication': 'B',
            'Monitoring': 'B',
            'Encryption': 'B',
            'Speed': 'C',
            'LoadTime': 'C',
            'Response': 'C',
            'Latency': 'C',
            'Realtime': 'C',
            'Intelligence': 'D',
            'AI_Models': 'D',
            'Analytics': 'D',
            'Prediction': 'D',
            'Learning': 'D',
            'UserExperience': 'E',
            'Interface': 'E',
            'Design': 'E',
            'Mobile': 'E',
            'Accessibility': 'E',
            // Additional subcategories
            'Speed Tests': 'A',
            'Benchmarks': 'A',
            'Firewall': 'B',
            'Intrusion Detection': 'B'
        };
        
        const fromLetter = categoryMap[from] || from.charAt(0);
        const toLetter = categoryMap[to] || to.charAt(0);
        
        cells.push({
            from,
            to,
            fromLetter,
            toLetter,
            classes,
            borders
        });
    }
    
    console.log(`📊 Analyzing ${cells.length} cells\n`);
    
    // Find cells with mismatched borders
    const issues = [];
    const correct = [];
    
    cells.forEach((cell, i) => {
        const problems = [];
        
        // Check row borders (should match from category)
        if (cell.borders.rowStart && cell.borders.rowStart[1] !== cell.fromLetter) {
            problems.push(`Row start border is ${cell.borders.rowStart[1]} but row is ${cell.fromLetter}`);
        }
        if (cell.borders.rowEnd && cell.borders.rowEnd[1] !== cell.fromLetter) {
            problems.push(`Row end border is ${cell.borders.rowEnd[1]} but row is ${cell.fromLetter}`);
        }
        
        // Check column borders (should match to category)
        if (cell.borders.colStart && cell.borders.colStart[1] !== cell.toLetter) {
            problems.push(`Col start border is ${cell.borders.colStart[1]} but col is ${cell.toLetter}`);
        }
        if (cell.borders.colEnd && cell.borders.colEnd[1] !== cell.toLetter) {
            problems.push(`Col end border is ${cell.borders.colEnd[1]} but col is ${cell.toLetter}`);
        }
        
        if (problems.length > 0) {
            issues.push({
                cell: `${cell.from} → ${cell.to}`,
                problems,
                classes: cell.classes
            });
        } else if (Object.values(cell.borders).some(b => b)) {
            correct.push({
                cell: `${cell.from} → ${cell.to}`,
                borders: cell.borders
            });
        }
    });
    
    // Group issues by type
    const issueTypes = {};
    issues.forEach(issue => {
        issue.problems.forEach(problem => {
            if (!issueTypes[problem]) {
                issueTypes[problem] = [];
            }
            issueTypes[problem].push(issue.cell);
        });
    });
    
    // Report findings
    console.log('❌ INCORRECT BORDERS:\n');
    
    if (issues.length === 0) {
        console.log('  None found! All borders are correct.\n');
    } else {
        // Show first 10 issues in detail
        console.log(`Found ${issues.length} cells with incorrect borders:\n`);
        
        issues.slice(0, 10).forEach(issue => {
            console.log(`  Cell: ${issue.cell}`);
            issue.problems.forEach(p => console.log(`    - ${p}`));
            console.log(`    Classes: ${issue.classes.substring(0, 80)}...`);
            console.log();
        });
        
        if (issues.length > 10) {
            console.log(`  ... and ${issues.length - 10} more\n`);
        }
        
        // Summary by issue type
        console.log('📈 ISSUE SUMMARY:\n');
        Object.entries(issueTypes).forEach(([type, cells]) => {
            console.log(`  "${type}"`);
            console.log(`    Affects ${cells.length} cells`);
            console.log(`    Examples: ${cells.slice(0, 3).join(', ')}`);
            console.log();
        });
    }
    
    // Show some correct examples
    console.log('✅ CORRECT BORDERS (samples):\n');
    correct.slice(0, 5).forEach(item => {
        const borders = [];
        if (item.borders.rowStart) borders.push(`row-start-${item.borders.rowStart[1]}`);
        if (item.borders.rowEnd) borders.push(`row-end-${item.borders.rowEnd[1]}`);
        if (item.borders.colStart) borders.push(`col-start-${item.borders.colStart[1]}`);
        if (item.borders.colEnd) borders.push(`col-end-${item.borders.colEnd[1]}`);
        
        console.log(`  ${item.cell}: ${borders.join(', ')}`);
    });
    
    // Check CSS definitions
    console.log('\n🎨 CSS BORDER DEFINITIONS:\n');
    
    Object.keys(CATEGORY_COLORS).forEach(letter => {
        // Find CSS rules for this category
        const patterns = [
            `.block-end-${letter} {[^}]*border-right:\\s*3px\\s+solid\\s+([^;]+)`,
            `.block-start-${letter} {[^}]*border-left:\\s*3px\\s+solid\\s+([^;]+)`,
            `.block-end-row-${letter} {[^}]*border-bottom:\\s*3px\\s+solid\\s+([^;]+)`,
            `.block-start-row-${letter} {[^}]*border-top:\\s*3px\\s+solid\\s+([^;]+)`
        ];
        
        console.log(`  Category ${letter}:`);
        
        patterns.forEach((pattern, i) => {
            const regex = new RegExp(pattern);
            const match = html.match(regex);
            if (match) {
                const color = match[1].trim().replace('!important', '').trim();
                const type = ['Right', 'Left', 'Bottom', 'Top'][i];
                const expected = CATEGORY_COLORS[letter];
                const status = color === expected ? '✅' : '❌';
                console.log(`    ${type}: ${color} ${status}`);
            }
        });
    });
    
    // Statistics
    console.log('\n📊 STATISTICS:\n');
    const cellsWithBorders = cells.filter(c => Object.values(c.borders).some(b => b)).length;
    console.log(`  Total cells: ${cells.length}`);
    console.log(`  Cells with borders: ${cellsWithBorders}`);
    console.log(`  Correct borders: ${correct.length}`);
    console.log(`  Incorrect borders: ${issues.length}`);
    console.log(`  Accuracy: ${((correct.length / cellsWithBorders) * 100).toFixed(1)}%`);
    
    return issues.length === 0;
}

// Run inspection
const htmlPath = process.argv[2] || 'trust-debt-final.html';
const allCorrect = inspectBorders(htmlPath);

console.log('\n' + '='.repeat(50));
if (allCorrect) {
    console.log('✅ All borders are correct!');
} else {
    console.log('❌ Some borders need fixing');
    console.log('\nTo fix: The border classes need to match the category letters');
}