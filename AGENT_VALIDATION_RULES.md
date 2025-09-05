# Agent Validation Rules - Anti-Regression Framework

## MANDATORY VALIDATION CHECKS

### AGENT 2: Category Generator - ShortLex Validation
```javascript
// HARDCODED CHECK - MUST PASS
function validateShortLexOrdering(categories) {
  // Rule 1: Length-first sorting  
  for (let i = 0; i < categories.length - 1; i++) {
    const current = categories[i].id;
    const next = categories[i + 1].id;
    
    if (current.length > next.length) {
      throw new Error(`SHORTLEX VIOLATION: ${current} (length ${current.length}) cannot come before ${next} (length ${next.length})`);
    }
    
    if (current.length === next.length && current > next) {
      throw new Error(`ALPHABETICAL VIOLATION: ${current} must come after ${next} within same length`);
    }
  }
  return true;
}

// Example correct ordering:
const VALID_SHORTLEX = [
  "A🚀", "B🔒", "C💨", "D🧠", "E🎨",           // Length 2
  "A🚀.1⚡", "A🚀.2🔥", "A🚀.3📈", "A🚀.4🎯", // Length 6  
  "B🔒.1🛡️", "B🔒.2🔐", "B🔒.3🗂️", "B🔒.4🔓", // Length 8
  "C💨.1🌊", "C💨.2📊", "C💨.3💨", "C💨.4🖥️",  // Length 8
  "D🧠.1🤖", "D🧠.2📊", "D🧠.3🔮", "D🧠.4🎲", // Length 8
  "E🎨.1✨", "E🎨.2🎯", "E🎨.3🎨", "E🎨.4🌈"  // Length 8
];

// ANTI-REGRESSION: This sequence is HARDCODED and cannot be violated
```

### AGENT 3: Matrix Builder - Structure Validation
```javascript
// HARDCODED CHECK - MUST PASS
function validateMatrixStructure(matrix, categories) {
  // Rule 1: Matrix dimensions must equal category count
  if (matrix.length !== categories.length) {
    throw new Error(`MATRIX DIMENSION ERROR: ${matrix.length}x${matrix.length} matrix but ${categories.length} categories`);
  }
  
  // Rule 2: Headers must match ShortLex ordering exactly
  for (let i = 0; i < categories.length; i++) {
    if (matrix.headers[i] !== categories[i].id) {
      throw new Error(`HEADER MISMATCH: Position ${i} has ${matrix.headers[i]} but should be ${categories[i].id}`);
    }
  }
  
  // Rule 3: Must have populated cells (not all zeros)
  const totalValue = matrix.flat().reduce((sum, cell) => sum + Math.abs(cell.value || 0), 0);
  if (totalValue === 0) {
    throw new Error(`EMPTY MATRIX ERROR: All cells are zero - no real Intent vs Reality data`);
  }
  
  return true;
}
```

### AGENT 4: Grade Calculator - Legitimacy Validation
```javascript
// HARDCODED CHECK - MUST PASS  
function validateGradeCalculations(grades, matrix) {
  // Rule 1: Grade must be calculated from matrix data
  const calculatedDebt = matrix.flat().reduce((sum, cell) => sum + (cell.trustDebt || 0), 0);
  const reportedDebt = grades.trustDebtUnits;
  
  const variance = Math.abs(calculatedDebt - reportedDebt) / reportedDebt;
  if (variance > 0.1) {
    throw new Error(`GRADE CALCULATION ERROR: Reported ${reportedDebt} but matrix calculates ${calculatedDebt} (${variance*100}% variance)`);
  }
  
  // Rule 2: Asymmetry ratio must match Upper△/Lower△
  const upperTriangleSum = grades.upperTriangle;
  const lowerTriangleSum = grades.lowerTriangle;
  const asymmetryRatio = upperTriangleSum / lowerTriangleSum;
  
  if (asymmetryRatio < 1.0) {
    throw new Error(`ASYMMETRY ERROR: Ratio ${asymmetryRatio} indicates documentation-heavy (should be reality-heavy)`);
  }
  
  return true;
}
```

### AGENT 7: Report Generator - Visual Coherence Validation
```javascript
// HARDCODED CHECK - MUST PASS
function validateVisualCoherence(htmlContent) {
  // Rule 1: Must include Patent header exactly
  const requiredHeader = "Patent-Pending Orthogonal Alignment Architecture (U.S. App. No. 63/854,530)";
  if (!htmlContent.includes(requiredHeader)) {
    throw new Error(`HEADER ERROR: Missing required Patent header`);
  }
  
  // Rule 2: Matrix must have full category names in headers
  const shortHeaderPattern = /[A-E][🚀🔒💨🧠🎨]</g;
  const headerMatches = htmlContent.match(shortHeaderPattern);
  if (headerMatches && headerMatches.length > 0) {
    throw new Error(`MATRIX HEADER ERROR: Found abbreviated headers ${headerMatches.join(', ')} - must use full category names`);
  }
  
  // Rule 3: Must have double-walled submatrix CSS
  if (!htmlContent.includes('border: 3px solid') || !htmlContent.includes('double')) {
    throw new Error(`VISUAL ERROR: Missing double-walled submatrix boundaries`);
  }
  
  // Rule 4: Must include meta-analysis sections
  const requiredSections = ['Zero Multiplier', 'EU AI Act', 'Business Impact', 'Legitimacy Framework'];
  for (const section of requiredSections) {
    if (!htmlContent.includes(section)) {
      throw new Error(`CONTENT ERROR: Missing required section: ${section}`);
    }
  }
  
  return true;
}
```

## ANTI-REGRESSION PROTOCOL

### Implementation Strategy:
1. **Rule-Based Validation**: Each agent MUST pass hardcoded checks before proceeding
2. **Examples Library**: Provide correct examples agents can reference
3. **Validation Middleware**: Automatic checks between agent handoffs
4. **Regression Testing**: Compare outputs to validated templates

### Rules + Examples Approach:
- **RULES**: Mathematical/structural requirements that cannot be violated
- **EXAMPLES**: Correct implementations agents can reference and adapt
- **VALIDATION**: Automated checking ensuring rules are followed

This ensures agents cannot regress on critical requirements like ShortLex ordering, matrix population, or visual coherence.