// Agent 7 Validation System - Anti-Regression Framework
// CRITICAL: Implementing hardcoded validation checks from AGENT_VALIDATION_RULES.md

function validateShortLexOrdering(categories) {
  console.log('🔍 VALIDATING SHORTLEX ORDERING...');
  
  // Rule 1: Length-first sorting  
  for (let i = 0; i < categories.length - 1; i++) {
    const current = categories[i].name;
    const next = categories[i + 1].name;
    
    if (current.length > next.length) {
      throw new Error(`SHORTLEX VIOLATION: ${current} (length ${current.length}) cannot come before ${next} (length ${next.length})`);
    }
    
    if (current.length === next.length && current > next) {
      throw new Error(`ALPHABETICAL VIOLATION: ${current} must come after ${next} within same length`);
    }
  }
  
  // Verify the exact expected sequence - CORRECTED ShortLex order by actual character length
  const expectedOrder = [
    "D🧠.1🤖 CLI", "D🧠.5🌐 API", "E🎨.5💼 Sales",
    "A🚀 CoreEngine", "B🔒.2🔐 Guides", "C💨.2📊 Charts", "D🧠.3🔮 Config", "D🧠.4🎲 Export", "D🧠.7🚀 Deploy", "E🎨.6📈 Growth",
    "A🚀.2🔥 Metrics", "C💨.1🌊 Reports", "C💨.5🎨 Styling", "C💨.8🌈 Theming", "D🧠 Integration", "D🧠.2📊 Package", "E🎨.1✨ Strategy", "E🎨.8🏆 Success",
    "A🚀.1⚡ Algorithm", "A🚀.3📈 Analysis", "A🚀.5🔍 Scanning", "B🔒.4🔓 Examples", "B🔒.6🎯 API Docs", "B🔒.7🔬 Research", "C💨.4🖥️ Display", "D🧠.6🔗 Pipeline", "E🎨.2🎯 Planning",
    "A🚀.4🎯 Detection", "B🔒 Documentation", "B🔒.5📖 Tutorials", "B🔒.8📋 Standards", "C💨 Visualization", "C💨.3💨 Interface", "C💨.6🎭 Animation", "D🧠.8🛡️ Security", "E🎨 BusinessLayer", "E🎨.3🎨 Marketing",
    "A🚀.6⚙️ Processing", "A🚀.8🧪 Validation", "B🔒.3🗂️ Reference", "E🎨.4🌈 Enterprise", "E🎨.7🎪 Operations",
    "C💨.7🎪 Interactive",
    "A🚀.7🏗️ Architecture",
    "B🔒.1🛡️ Specifications"
  ];
  
  for (let i = 0; i < expectedOrder.length; i++) {
    if (categories[i].name !== expectedOrder[i]) {
      throw new Error(`CATEGORY ORDER ERROR: Position ${i} has "${categories[i].name}" but should be "${expectedOrder[i]}"`);
    }
  }
  
  console.log('✅ SHORTLEX ORDERING VALIDATED - ALL CHECKS PASSED');
  return true;
}

function validateMatrixStructure(matrix, categories) {
  console.log('🔍 VALIDATING MATRIX STRUCTURE...');
  
  // Rule 1: Matrix dimensions must equal category count
  if (matrix.length !== categories.length) {
    throw new Error(`MATRIX DIMENSION ERROR: ${matrix.length}x${matrix.length} matrix but ${categories.length} categories`);
  }
  
  // Rule 2: Headers must match ShortLex ordering exactly
  for (let i = 0; i < categories.length; i++) {
    if (matrix.headers && matrix.headers[i] !== categories[i].name) {
      throw new Error(`HEADER MISMATCH: Position ${i} has ${matrix.headers[i]} but should be ${categories[i].name}`);
    }
  }
  
  // Rule 3: Must have populated cells (not all zeros)
  const totalValue = matrix.flat ? matrix.flat().reduce((sum, cell) => sum + Math.abs(cell.value || 0), 0) : 0;
  if (totalValue === 0) {
    throw new Error(`EMPTY MATRIX ERROR: All cells are zero - no real Intent vs Reality data`);
  }
  
  console.log('✅ MATRIX STRUCTURE VALIDATED');
  return true;
}

function validateVisualCoherence(htmlContent) {
  console.log('🔍 VALIDATING VISUAL COHERENCE...');
  
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
  
  console.log('✅ VISUAL COHERENCE VALIDATED');
  return true;
}

// Export validation functions for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateShortLexOrdering,
    validateMatrixStructure,
    validateVisualCoherence
  };
}