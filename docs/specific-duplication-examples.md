# Specific Code Duplication Examples

## HTML Generation Pattern (Found in 39 files)

### Exact Duplicates
The following code block appears with 90%+ similarity across multiple files:

**Files**: `trust-debt-html-generator.js`, `trust-debt-enhanced-html.js`, `trust-debt-comprehensive-html.js`, and 36 others.

```javascript
function generateHTML(calculator, analysis) {
    const totalDebt = analysis.totalDebt || 0;
    const orthogonality = analysis.orthogonality || 0;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trust Debt Analysis Report</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0a0e1a 0%, #1a1a2e 100%);
            color: #ffffff;
            margin: 0;
            padding: 20px;
        }
        /* ... 200+ lines of identical CSS ... */
    </style>
</head>
<body>
    <!-- ... identical HTML structure ... -->
</body>
</html>`;
}
```

### Variations Found
Minor differences between files:
- Some add extra CSS classes
- Some modify color schemes slightly
- Some add/remove specific sections
- **Core structure: 95% identical**

## Calculator Class Pattern (Found in 7 classes)

### Common Structure
```javascript
class [VariationName]Calculator {
    constructor() {
        this.projectRoot = process.cwd();
        this.settingsPath = path.join(this.projectRoot, 'trust-debt-settings.json');
        // ... identical initialization
    }
    
    calculate(data = {}) {
        // ... 80% identical calculation logic
        const baseDebt = this.calculateBaseDebt(categories, matrix, commits, documents);
        const timeDecay = this.calculateTimeDecay();
        const specAge = this.calculateSpecAge();
        // ... identical pattern continues
    }
    
    loadMatrix() {
        // 100% identical across all classes
        const matrixPath = path.join(this.projectRoot, 'trust-debt-matrix.json');
        if (fs.existsSync(matrixPath)) {
            return JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
        }
        return null;
    }
}
```

## File System Operations Pattern (Found in 67 files)

### Identical Imports Block
```javascript
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
```

### Identical Settings Loading
```javascript
const settingsPath = path.join(process.cwd(), 'trust-debt-settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
```

### Identical Matrix File Handling
```javascript
const matrixFile = path.join(process.cwd(), 'trust-debt-matrix.json');
let matrix = null;
if (fs.existsSync(matrixFile)) {
    matrix = JSON.parse(fs.readFileSync(matrixFile, 'utf8'));
}
```

## Specific Duplicates by File Size

### Large Files with Heavy Duplication

1. **trust-debt-final.js (2,420 lines)**
   - Contains: Full calculator + HTML generator + utilities
   - Duplicates found in: 15+ other files
   - Unique content: ~30%

2. **trust-debt-html-generator.js (1,455 lines)**  
   - Contains: HTML generation + CSS + JavaScript
   - Duplicated in: 38+ files
   - Unique content: ~10%

3. **trust-debt-week-final.js (1,206 lines)**
   - Contains: Weekly reporting + HTML generation
   - Duplicated in: 6+ week-related files
   - Unique content: ~20%

## Most Problematic Duplication Areas

### 1. CSS Styling (500+ lines duplicated 39 times)
**Impact**: ~19,500 lines of CSS across files
**Solution**: Extract to single CSS file or template

### 2. Matrix Processing Logic (200+ lines duplicated 12 times)
**Impact**: ~2,400 lines of identical matrix code
**Solution**: Single MatrixManager class

### 3. Category Management (300+ lines duplicated 8 times)
**Impact**: ~2,400 lines of category handling
**Solution**: Single CategoryManager class

## Immediate High-Impact Fixes

### Fix #1: Consolidate HTML Generation
```javascript
// Instead of 39 separate generateHTML functions:
// Create single HtmlReportGenerator class

class HtmlReportGenerator {
    static generate(calculator, analysis, options = {}) {
        const template = this.getTemplate(options.template || 'default');
        return this.renderTemplate(template, { calculator, analysis, options });
    }
    
    static getTemplate(name) {
        // Load from templates directory
    }
    
    static renderTemplate(template, data) {
        // Single rendering logic
    }
}
```

### Fix #2: Unify Calculator Classes
```javascript
// Instead of 7 different calculator classes:
// Create single TrustDebtCalculator with strategy pattern

class TrustDebtCalculator {
    constructor(strategy = 'unified') {
        this.strategy = CalculatorStrategies[strategy];
    }
    
    calculate(data) {
        return this.strategy.calculate(data);
    }
}

const CalculatorStrategies = {
    unified: new UnifiedStrategy(),
    twoLayer: new TwoLayerStrategy(),
    composite: new CompositeStrategy()
    // etc.
};
```

### Fix #3: Extract Common File Operations
```javascript
// Instead of duplicating file operations in 67 files:
// Create FileSystemUtils

class FileSystemUtils {
    static loadSettings() {
        const settingsPath = path.join(process.cwd(), 'trust-debt-settings.json');
        return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
    
    static loadMatrix() {
        const matrixPath = path.join(process.cwd(), 'trust-debt-matrix.json');
        if (fs.existsSync(matrixPath)) {
            return JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
        }
        return null;
    }
    
    // ... other common operations
}
```

## Impact of Fixing These Duplications

### Before:
- **68 files** with overlapping functionality
- **~35,000 total lines** with 60-80% duplication
- **Maintenance nightmare**: Bug fixes need to be applied to multiple files
- **Testing complexity**: Need to test same logic in multiple places

### After:
- **~15 focused files** with clear responsibilities  
- **~3,500 total lines** with minimal duplication
- **Single source of truth**: Bug fixes in one place
- **Easy testing**: Test each piece of functionality once

### Estimated Development Time Savings
- **Bug fixes**: 90% faster (fix once vs. fix in 10+ files)
- **New features**: 70% faster (clear architecture)
- **Testing**: 85% less code to test
- **Onboarding**: 80% faster for new developers