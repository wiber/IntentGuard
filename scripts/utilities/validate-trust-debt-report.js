#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Single source of truth for colors
const CATEGORY_COLORS = {
    'A': { hex: '#ff6600', rgb: '255, 102, 0', name: 'Performance' },
    'B': { hex: '#9900ff', rgb: '153, 0, 255', name: 'Security' },
    'C': { hex: '#00ffff', rgb: '0, 255, 255', name: 'Speed' },
    'D': { hex: '#ffff00', rgb: '255, 255, 0', name: 'Intelligence' },
    'E': { hex: '#ff0099', rgb: '255, 0, 153', name: 'Visual/UserExperience' }
};

// Validation result structure
class ValidationResult {
    constructor(name) {
        this.name = name;
        this.passed = true;
        this.errors = [];
        this.warnings = [];
        this.details = {};
    }
    
    fail(message, details = {}) {
        this.passed = false;
        this.errors.push(message);
        Object.assign(this.details, details);
    }
    
    warn(message) {
        this.warnings.push(message);
    }
    
    log() {
        const symbol = this.passed ? '✅' : '❌';
        console.log(`\n${symbol} ${this.name}`);
        
        if (this.errors.length > 0) {
            console.log('  Errors:');
            this.errors.forEach(e => console.log(`    - ${e}`));
        }
        
        if (this.warnings.length > 0) {
            console.log('  Warnings:');
            this.warnings.forEach(w => console.log(`    ⚠️  ${w}`));
        }
        
        if (Object.keys(this.details).length > 0) {
            console.log('  Details:', JSON.stringify(this.details, null, 2));
        }
    }
}

// Test 1: Validate border colors match label colors
function validateBorderColors(html) {
    const result = new ValidationResult('Border Color Consistency');
    
    // Extract CSS border definitions
    const cssRegex = /\.block-(?:start|end)(?:-row)?-([A-E])\s*{\s*border-(?:right|left|top|bottom):\s*3px\s+solid\s+([^;!]+)/g;
    const borderColors = {};
    let match;
    
    while ((match = cssRegex.exec(html)) !== null) {
        const letter = match[1];
        const color = match[2].trim().replace(/\s*!important\s*/, '');
        
        if (!borderColors[letter]) {
            borderColors[letter] = color;
        } else if (borderColors[letter] !== color) {
            result.warn(`Inconsistent border colors for ${letter}: ${borderColors[letter]} vs ${color}`);
        }
    }
    
    // Validate each category
    Object.entries(CATEGORY_COLORS).forEach(([letter, config]) => {
        const foundColor = borderColors[letter];
        const expectedColor = config.hex;
        
        if (!foundColor) {
            result.fail(`No border color found for category ${letter}`);
        } else if (foundColor.toLowerCase() !== expectedColor.toLowerCase()) {
            result.fail(`Border color mismatch for ${letter}:`, {
                expected: expectedColor,
                found: foundColor,
                category: `${letter} (${config.name})`
            });
        }
    });
    
    result.details.borderColors = borderColors;
    return result;
}

// Test 2: Validate label colors match expected
function validateLabelColors(html) {
    const result = new ValidationResult('Label Color Consistency');
    
    // Extract header colors
    const headerRegex = /style="color:\s*rgba?\(([^)]+)\)[^"]*"[^>]*title="([A-E][^"\s]+)/g;
    const labelColors = {};
    let match;
    
    while ((match = headerRegex.exec(html)) !== null) {
        const rgb = match[1];
        const categoryId = match[2].split(' ')[0];
        const letter = categoryId.charAt(0);
        
        if (!labelColors[categoryId]) {
            labelColors[categoryId] = rgb;
            
            // Check parent category
            if (categoryId.length === 2) { // Parent category like A🚀
                const expected = CATEGORY_COLORS[letter].rgb;
                if (rgb !== expected + ', 1') {
                    result.fail(`Label color mismatch for ${categoryId}:`, {
                        expected: `rgba(${expected}, 1)`,
                        found: `rgba(${rgb})`
                    });
                }
            }
        }
    }
    
    result.details.labelCount = Object.keys(labelColors).length;
    return result;
}

// Test 3: Validate subcategory opacity inheritance
function validateSubcategoryOpacity(html) {
    const result = new ValidationResult('Subcategory Opacity Inheritance');
    
    const headerRegex = /style="color:\s*rgba?\(([^)]+)\)[^"]*"[^>]*title="([A-E][^"\s]+)/g;
    const categories = {};
    let match;
    
    while ((match = headerRegex.exec(html)) !== null) {
        const rgba = match[1].split(',').map(v => v.trim());
        const categoryId = match[2].split(' ')[0];
        const depth = (categoryId.match(/\./g) || []).length;
        
        categories[categoryId] = {
            rgba: rgba,
            opacity: rgba.length === 4 ? parseFloat(rgba[3]) : 1,
            depth: depth
        };
    }
    
    // Check opacity rules
    Object.entries(categories).forEach(([id, data]) => {
        const expectedOpacity = data.depth === 0 ? 1.0 : 
                               data.depth === 1 ? 0.8 : 
                               data.depth === 2 ? 0.6 : 0.4;
        
        if (Math.abs(data.opacity - expectedOpacity) > 0.01) {
            result.fail(`Opacity mismatch for ${id}:`, {
                depth: data.depth,
                expected: expectedOpacity,
                found: data.opacity
            });
        }
    });
    
    result.details.categoryCount = Object.keys(categories).length;
    return result;
}

// Test 4: Validate border placement (only at block boundaries)
function validateBorderPlacement(html) {
    const result = new ValidationResult('Border Placement at Block Boundaries');
    
    // Extract all cells with their classes
    const cellRegex = /<td class="([^"]+)"[^>]*title="([^"]+)"/g;
    const cells = [];
    let match;
    
    while ((match = cellRegex.exec(html)) !== null) {
        const classes = match[1];
        const title = match[2];
        const [from, to] = title.split('→').map(s => s.split(':')[0].trim());
        
        cells.push({
            classes: classes,
            from: from,
            to: to,
            hasBorder: classes.includes('block-start') || classes.includes('block-end')
        });
    }
    
    // Check that borders only appear at category transitions
    let borderedCells = 0;
    let incorrectBorders = 0;
    
    cells.forEach(cell => {
        if (cell.hasBorder) {
            borderedCells++;
            
            // Check if this is actually a boundary
            const fromLetter = cell.from.charAt(0);
            const toLetter = cell.to.charAt(0);
            
            const hasRowBorder = cell.classes.includes('block-start-row') || 
                                 cell.classes.includes('block-end-row');
            const hasColBorder = cell.classes.includes('block-start-') || 
                                 cell.classes.includes('block-end-');
            
            // Validate the borders make sense
            if (hasRowBorder && !cell.classes.includes(`-row-${fromLetter}`)) {
                result.warn(`Row border doesn't match row category ${fromLetter}: ${cell.classes}`);
                incorrectBorders++;
            }
            
            if (hasColBorder) {
                // Extract column letter from class
                const colMatch = cell.classes.match(/block-(?:start|end)-([A-E])/);
                if (colMatch && colMatch[1] !== toLetter) {
                    result.warn(`Column border doesn't match column category ${toLetter}: ${cell.classes}`);
                    incorrectBorders++;
                }
            }
        }
    });
    
    result.details = {
        totalCells: cells.length,
        borderedCells: borderedCells,
        incorrectBorders: incorrectBorders
    };
    
    if (incorrectBorders > 0) {
        result.fail(`Found ${incorrectBorders} cells with incorrect borders`);
    }
    
    return result;
}

// Test 5: Validate double-wall effect
function validateDoubleWalls(html) {
    const result = new ValidationResult('Double-Wall Effect at Boundaries');
    
    // Look for cells that should have double walls (at major category boundaries)
    const cellRegex = /<td class="([^"]+)"/g;
    let doubleWalls = 0;
    let match;
    
    while ((match = cellRegex.exec(html)) !== null) {
        const classes = match[1];
        
        // Check for double-wall pattern: both row and column borders
        const hasRowBorder = classes.includes('block-start-row') || 
                            classes.includes('block-end-row');
        const hasColBorder = classes.includes('block-start-') && 
                            !classes.includes('block-start-row');
        
        if (hasRowBorder && hasColBorder) {
            doubleWalls++;
            
            // Verify it's at a real boundary
            const rowEndMatch = classes.match(/block-end-row-([A-E])/);
            const colStartMatch = classes.match(/block-start-([A-E])/);
            
            if (rowEndMatch && colStartMatch) {
                // This is a corner between blocks - should have both colors
                result.details[`${rowEndMatch[1]}→${colStartMatch[1]}`] = 'Double wall detected';
            }
        }
    }
    
    result.details.doubleWallCount = doubleWalls;
    
    if (doubleWalls === 0) {
        result.warn('No double-wall boundaries found');
    }
    
    return result;
}

// Test 6: Validate matrix completeness
function validateMatrixCompleteness(html) {
    const result = new ValidationResult('Matrix Completeness');
    
    // Count expected categories
    const headerRegex = /<th[^>]*title="([A-E][^"\s]+)/g;
    const categories = new Set();
    let match;
    
    while ((match = headerRegex.exec(html)) !== null) {
        categories.add(match[1].split(' ')[0]);
    }
    
    const expectedCount = 29; // 5 parent + 20 children + 4 grandchildren
    const foundCount = categories.size;
    
    result.details = {
        expected: expectedCount,
        found: foundCount,
        categories: Array.from(categories).sort()
    };
    
    if (foundCount < expectedCount) {
        result.fail(`Missing categories: expected ${expectedCount}, found ${foundCount}`);
    } else if (foundCount > expectedCount) {
        result.warn(`Extra categories: expected ${expectedCount}, found ${foundCount}`);
    }
    
    return result;
}

// Main validation runner
function validateReport(htmlPath) {
    console.log('🔍 Validating Trust Debt Report\n');
    console.log('=' .repeat(50));
    
    if (!fs.existsSync(htmlPath)) {
        console.error(`❌ File not found: ${htmlPath}`);
        process.exit(1);
    }
    
    const html = fs.readFileSync(htmlPath, 'utf8');
    console.log(`📄 Loaded ${htmlPath} (${html.length} bytes)\n`);
    
    const tests = [
        validateBorderColors,
        validateLabelColors,
        validateSubcategoryOpacity,
        validateBorderPlacement,
        validateDoubleWalls,
        validateMatrixCompleteness
    ];
    
    const results = tests.map(test => {
        const result = test(html);
        result.log();
        return result;
    });
    
    console.log('\n' + '='.repeat(50));
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    
    console.log(`\n📊 Summary: ${passed} passed, ${failed} failed\n`);
    
    if (failed > 0) {
        console.log('❌ Validation FAILED - Report has issues that need fixing');
        
        // Generate fix script
        console.log('\n📝 To fix these issues, run:');
        console.log('   node fix-trust-debt-colors.js');
        
        process.exit(1);
    } else {
        console.log('✅ Validation PASSED - Report is correctly formatted');
        process.exit(0);
    }
}

// Run validation
const htmlPath = process.argv[2] || 'trust-debt-final.html';
validateReport(htmlPath);