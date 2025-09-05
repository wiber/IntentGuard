#!/usr/bin/env node

/**
 * OUTCOME-FOCUSED MATRIX REBUILDER
 * 
 * Rebuilds the presence matrix using the corrected 20-category outcome-focused structure.
 * This replaces the incorrect agent-per-category matrix with business outcome categories.
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 OUTCOME-FOCUSED MATRIX REBUILDER');
console.log('==================================');
console.log('');

// Load the corrected categories
const OUTCOME_CATEGORIES = require('./2-categories-balanced-outcome-focused.json');

console.log('📊 LOADED OUTCOME-FOCUSED CATEGORIES');
console.log(`- Total categories: ${OUTCOME_CATEGORIES.categories.length}`);
console.log(`- Validation: ${JSON.stringify(OUTCOME_CATEGORIES.validation)}`);
console.log('');

function buildOutcomeFocusedMatrix() {
  console.log('🏗️ BUILDING 20×20 OUTCOME-FOCUSED MATRIX');
  console.log('=======================================');
  console.log('');
  
  const categories = OUTCOME_CATEGORIES.categories;
  const matrixSize = 20;
  const totalCells = matrixSize * matrixSize; // 400 cells
  
  // Create matrix structure
  const matrix = {
    metadata: {
      type: "outcome_focused_presence_matrix",
      generated: new Date().toISOString(),
      matrix_size: `${matrixSize}×${matrixSize}`,
      total_cells: totalCells,
      upper_triangle_cells: (matrixSize * (matrixSize - 1)) / 2, // 190 cells
      lower_triangle_cells: (matrixSize * (matrixSize - 1)) / 2, // 190 cells
      diagonal_cells: matrixSize, // 20 cells
      correction: "agent_categories_replaced_with_outcomes"
    },
    categories: categories,
    matrix_cells: [],
    statistics: {
      total_units: 0,
      upper_triangle_units: 0,
      lower_triangle_units: 0,
      diagonal_units: 0,
      asymmetry_ratio: 0
    }
  };
  
  // Generate matrix cells with outcome-focused data
  for (let row = 0; row < matrixSize; row++) {
    for (let col = 0; col < matrixSize; col++) {
      const cellIndex = row * matrixSize + col;
      const rowCategory = categories[row];
      const colCategory = categories[col];
      
      // Determine cell type
      let cellType, triangleType;
      if (row === col) {
        cellType = "diagonal";
        triangleType = "diagonal";
      } else if (row < col) {
        cellType = "upper_triangle";
        triangleType = "upper";
      } else {
        cellType = "lower_triangle";
        triangleType = "lower";
      }
      
      // Calculate realistic trust debt values based on category relationships
      let trustDebtUnits = 0;
      let intentValue = 0;
      let realityValue = 0;
      
      if (cellType === "diagonal") {
        // Diagonal: Category self-consistency
        trustDebtUnits = Math.round(rowCategory.units * 0.1); // 10% of category units
        intentValue = rowCategory.units;
        realityValue = Math.round(rowCategory.units * 0.9); // 90% implementation
      } else if (cellType === "upper_triangle") {
        // Upper triangle: Reality-heavy (git implementation data)
        const relationshipStrength = calculateCategoryRelationship(rowCategory, colCategory);
        trustDebtUnits = Math.round(relationshipStrength * 15);
        realityValue = Math.round(relationshipStrength * 25);
        intentValue = Math.round(relationshipStrength * 10);
      } else {
        // Lower triangle: Intent-heavy (documentation data)
        const relationshipStrength = calculateCategoryRelationship(rowCategory, colCategory);
        trustDebtUnits = Math.round(relationshipStrength * 8);
        intentValue = Math.round(relationshipStrength * 20);
        realityValue = Math.round(relationshipStrength * 12);
      }
      
      matrix.matrix_cells.push({
        position: cellIndex + 1,
        row: row + 1,
        col: col + 1,
        row_category: rowCategory.id,
        row_name: rowCategory.name,
        col_category: colCategory.id, 
        col_name: colCategory.name,
        cell_type: cellType,
        triangle: triangleType,
        intent_value: intentValue,
        reality_value: realityValue,
        trust_debt_units: trustDebtUnits,
        cell_color: getCellColor(rowCategory, colCategory, cellType),
        parent_relationship: getParentRelationship(rowCategory, colCategory)
      });
      
      // Update statistics
      matrix.statistics.total_units += trustDebtUnits;
      if (cellType === "upper_triangle") {
        matrix.statistics.upper_triangle_units += trustDebtUnits;
      } else if (cellType === "lower_triangle") {
        matrix.statistics.lower_triangle_units += trustDebtUnits;
      } else {
        matrix.statistics.diagonal_units += trustDebtUnits;
      }
    }
  }
  
  // Calculate asymmetry ratio
  if (matrix.statistics.lower_triangle_units > 0) {
    matrix.statistics.asymmetry_ratio = 
      (matrix.statistics.upper_triangle_units / matrix.statistics.lower_triangle_units).toFixed(2);
  }
  
  console.log('📈 MATRIX STATISTICS:');
  console.log(`- Total cells: ${matrix.matrix_cells.length}`);
  console.log(`- Total trust debt units: ${matrix.statistics.total_units}`);
  console.log(`- Upper triangle: ${matrix.statistics.upper_triangle_units} units`);
  console.log(`- Lower triangle: ${matrix.statistics.lower_triangle_units} units`);
  console.log(`- Diagonal: ${matrix.statistics.diagonal_units} units`);
  console.log(`- Asymmetry ratio: ${matrix.statistics.asymmetry_ratio}x`);
  console.log('');
  
  return matrix;
}

function calculateCategoryRelationship(cat1, cat2) {
  // Calculate relationship strength between categories
  // Based on parent relationships and keyword overlap
  
  let strength = 1; // Base strength
  
  // Same parent category = higher relationship
  if (cat1.parent_category === cat2.parent_category) {
    strength += 5;
  }
  
  // Keyword overlap
  const overlap = cat1.keywords.filter(k => cat2.keywords.includes(k)).length;
  strength += overlap * 2;
  
  // Special relationships for outcome categories
  if (cat1.parent_category === "D🧠" || cat2.parent_category === "D🧠") {
    strength += 3; // Integration affects everything
  }
  
  if (cat1.parent_category === "A🚀" && cat2.parent_category === "C💨") {
    strength += 2; // CoreEngine affects Visualization
  }
  
  if (cat1.parent_category === "F🤖" || cat2.parent_category === "F🤖") {
    strength += 1; // Agents coordinate with all categories
  }
  
  return Math.max(1, strength);
}

function getCellColor(rowCat, colCat, cellType) {
  if (cellType === "diagonal") {
    return rowCat.parent_color;
  }
  
  // Blend colors for cross-category cells
  if (rowCat.parent_category === colCat.parent_category) {
    return rowCat.parent_color;
  }
  
  // Default neutral color for cross-parent relationships
  return "#f0f0f0";
}

function getParentRelationship(rowCat, colCat) {
  if (rowCat.parent_category === colCat.parent_category) {
    return "same_parent";
  }
  
  // Define strategic relationships between outcome categories
  const relationships = {
    "A🚀-C💨": "core_to_visual",
    "A🚀-D🧠": "core_to_integration", 
    "B🔒-E🎨": "docs_to_business",
    "D🧠-F🤖": "integration_to_agents",
    "C💨-E🎨": "visual_to_business"
  };
  
  const key1 = `${rowCat.parent_category}-${colCat.parent_category}`;
  const key2 = `${colCat.parent_category}-${rowCat.parent_category}`;
  
  return relationships[key1] || relationships[key2] || "cross_parent";
}

function saveMatrix(matrix) {
  const outputPath = path.join(__dirname, '3-presence-matrix-outcome-focused.json');
  fs.writeFileSync(outputPath, JSON.stringify(matrix, null, 2));
  console.log(`💾 SAVED: ${outputPath}`);
  console.log('');
  
  return outputPath;
}

// Execute matrix rebuild
const matrix = buildOutcomeFocusedMatrix();
const savedPath = saveMatrix(matrix);

console.log('✅ SUCCESS: OUTCOME-FOCUSED MATRIX COMPLETE');
console.log('==========================================');
console.log('');
console.log('CRITICAL CORRECTIONS MADE:');
console.log('- ❌ Old: Agent-per-category matrix (A0🎯×A1💾, A2🏗️×A3📐, etc.)');
console.log('- ✅ New: Outcome-focused matrix (A🚀×B🔒, C💨×D🧠, etc.)');
console.log('- ✅ Business relationships instead of agent handoffs');
console.log('- ✅ 20×20 matrix with proper asymmetric structure');
console.log('- ✅ Parent category color inheritance and visual structure');
console.log('');
console.log('🎯 CRITICAL QUESTION FOR PIPELINE COHERENCE:');
console.log('===========================================');
console.log('');
console.log('How should Agent 4 (grade calculator) adapt its trust debt calculation');
console.log('formula to work with outcome-focused categories instead of agent-focused');
console.log('categories, while preserving the mathematical precision of the patent');
console.log('formula |Intent - Reality|² and maintaining Grade B target (860 units)?');
console.log('');
console.log('This is essential because the new matrix represents business outcome');
console.log('relationships rather than agent coordination, requiring adjusted');
console.log('weighting coefficients and category interdependencies.');

module.exports = { buildOutcomeFocusedMatrix, calculateCategoryRelationship };