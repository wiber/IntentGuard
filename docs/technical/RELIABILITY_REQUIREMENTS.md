# Reliability Requirements for Trust Debt Report Generation

## What Happened: A Post-Mortem

### The Color Mismatch Issue

1. **Initial Problem**: The double-bordered submatrices had colors that didn't match the category label colors
   - Labels showed: A=#ff6600 (orange), B=#9900ff (purple), etc.
   - Borders showed: A=#00ff88 (green), B=#00aaff (blue), etc.

2. **First Fix Attempt**: Updated the colors in `src/trust-debt-final.js`
   - Changed all border color definitions to match label colors
   - BUT: The HTML file wasn't regenerating

3. **Silent Failure**: The script was failing silently due to:
   - Missing/extra braces in the JavaScript file
   - Module export issues
   - No error reporting when generation failed

4. **Cascading Problems**:
   - HTML file had cached old colors
   - JavaScript file had syntax errors
   - No validation that changes were applied
   - No tests to catch mismatches

## Reliability Requirements

### 1. Build System Requirements

```javascript
// REQUIREMENT: Script must fail loudly on errors
try {
    generateReport();
} catch (error) {
    console.error('❌ REPORT GENERATION FAILED:', error);
    process.exit(1);
}
```

### 2. Color Consistency System

```javascript
// REQUIREMENT: Single source of truth for colors
const CATEGORY_COLORS = {
    'A': '#ff6600',  // Orange - Performance
    'B': '#9900ff',  // Purple - Security  
    'C': '#00ffff',  // Cyan - Speed
    'D': '#ffff00',  // Yellow - Intelligence
    'E': '#ff0099'   // Pink - Visual
};

// REQUIREMENT: All color references must use this source
function getCategoryColor(categoryId) {
    const letter = categoryId.charAt(0);
    return CATEGORY_COLORS[letter];
}
```

### 3. Validation Requirements

```javascript
// REQUIREMENT: Validate colors match before/after generation
function validateColorConsistency(html) {
    const tests = [];
    
    // Test 1: Border colors match label colors
    tests.push(validateBorderColors(html));
    
    // Test 2: Subcategories inherit parent colors
    tests.push(validateSubcategoryInheritance(html));
    
    // Test 3: Opacity gradients are correct
    tests.push(validateOpacityGradients(html));
    
    if (tests.some(t => !t.passed)) {
        throw new Error('Color validation failed');
    }
}
```

### 4. Testing Requirements

```bash
# REQUIREMENT: Pre-commit hook must run tests
npm test

# Tests must include:
- Color consistency test
- Border placement test  
- Matrix generation test
- Keyword matching test
```

### 5. File Generation Requirements

```javascript
// REQUIREMENT: Atomic file writes
const tempFile = 'trust-debt-final.html.tmp';
fs.writeFileSync(tempFile, html);
validateHTML(tempFile);
fs.renameSync(tempFile, 'trust-debt-final.html');

// REQUIREMENT: Generation timestamp
const generated = new Date().toISOString();
console.log(`✅ Report generated at ${generated}`);
```

### 6. Error Handling Requirements

```javascript
// REQUIREMENT: Every function must handle errors
function buildIntentMatrix() {
    try {
        // ... matrix building logic
    } catch (error) {
        console.error('Failed to build Intent matrix:', error);
        console.error('Stack:', error.stack);
        throw new Error(`Intent matrix failed: ${error.message}`);
    }
}
```

### 7. Visual Consistency Requirements

```css
/* REQUIREMENT: CSS variables for maintainability */
:root {
    --color-a: #ff6600;
    --color-b: #9900ff;
    --color-c: #00ffff;
    --color-d: #ffff00;
    --color-e: #ff0099;
}

.block-end-A { 
    border-color: var(--color-a);
}
```

### 8. Documentation Requirements

```javascript
// REQUIREMENT: Every color/border decision must be documented
/**
 * Border Color Logic:
 * - Parent categories (A,B,C,D,E) define base colors
 * - Subcategories inherit parent color with opacity
 * - Borders appear only at block boundaries
 * - Double-wall effect: both row and column borders at intersections
 */
```

## Implementation Checklist

- [ ] Create `config/colors.js` with single source of truth
- [ ] Add `validateReport()` function that runs after generation
- [ ] Create `test/color-consistency.test.js` 
- [ ] Add error handling to all generation functions
- [ ] Implement atomic file writes
- [ ] Add generation timestamp to HTML
- [ ] Create CSS variables for colors
- [ ] Document all visual algorithms

## Why This Matters

1. **Trust**: If the visualization is wrong, the Trust Debt metrics lose credibility
2. **Debugging**: Silent failures waste hours of debugging time
3. **Maintenance**: Hardcoded colors in multiple places guarantee future bugs
4. **Reproducibility**: Must be able to regenerate identical reports
5. **Validation**: Must catch errors before users see them

## The Core Principle

**"Every visual element must be traceable to its data source, and every data source must be validated."**

Colors aren't just aesthetic - they encode category relationships. When colors are wrong, the entire semantic structure of the Trust Debt matrix is compromised.