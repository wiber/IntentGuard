#!/usr/bin/env node

/**
 * Trust Debt Heatmap Composite Calculator
 * 
 * CRITICAL INSIGHT: Trust Debt must be calculated as a true composite of the heatmap
 * capturing both:
 * 1. AMPLITUDE: How big the gaps are (diagonal weakness)
 * 2. PRESENCE: Where the cold spots appear (above/below diagonal patterns)
 * 
 * Formula Enhancement:
 * TrustDebt = Σ(DiagonalWeakness + OffDiagonalMisalignment)
 * 
 * Where:
 * - DiagonalWeakness = (1 - selfAlignment)² × amplitude × time × weight
 * - OffDiagonalMisalignment = Σ(above + below diagonal anomalies) × positional weight
 */

const fs = require('fs');
const path = require('path');

class HeatmapCompositeTrustDebtCalculator {
  constructor() {
    this.projectRoot = process.cwd();
    this.matrixPath = path.join(this.projectRoot, 'trust-debt-reality-intent-matrix.json');
    this.settingsPath = path.join(this.projectRoot, 'trust-debt-settings.json');
  }

  /**
   * Calculate Trust Debt as true heatmap composite
   */
  calculateCompositeTrustDebt() {
    console.log('\n🌡️ HEATMAP COMPOSITE TRUST DEBT CALCULATOR');
    console.log('=' .repeat(55));
    
    const matrix = this.loadMatrix();
    if (!matrix) {
      throw new Error('Matrix data not available');
    }

    const settings = this.loadSettings();
    const timeFactor = this.calculateTimeFactor();
    const specAge = this.calculateSpecAge();
    
    // Calculate both diagonal and off-diagonal contributions
    const diagonalDebt = this.calculateDiagonalDebt(matrix, timeFactor, specAge);
    const offDiagonalDebt = this.calculateOffDiagonalDebt(matrix, timeFactor, specAge);
    
    const totalTrustDebt = diagonalDebt.total + offDiagonalDebt.total;
    
    console.log('\n📊 COMPOSITE TRUST DEBT BREAKDOWN:');
    console.log(`  Diagonal Weakness:     ${diagonalDebt.total.toFixed(0)} units (${(diagonalDebt.total/totalTrustDebt*100).toFixed(1)}%)`);
    console.log(`  Off-Diagonal Patterns: ${offDiagonalDebt.total.toFixed(0)} units (${(offDiagonalDebt.total/totalTrustDebt*100).toFixed(1)}%)`);
    console.log(`  ─────────────────────────────────────────────────────`);
    console.log(`  TOTAL TRUST DEBT:      ${totalTrustDebt.toFixed(0)} units`);
    
    return {
      score: Math.round(totalTrustDebt),
      diagonal: diagonalDebt,
      offDiagonal: offDiagonalDebt,
      timeFactor,
      specAge,
      breakdown: {
        amplitudeFactors: diagonalDebt.components,
        presenceFactors: offDiagonalDebt.components
      }
    };
  }

  /**
   * Calculate diagonal weakness (amplitude factors)
   * This captures how weak the diagonal is - the traditional calculation
   */
  calculateDiagonalDebt(matrix, timeFactor, specAge) {
    console.log('\n🔹 CALCULATING DIAGONAL WEAKNESS (Amplitude)');
    
    const components = [];
    let total = 0;
    
    if (matrix.nodes) {
      matrix.nodes.forEach(node => {
        const selfAlignment = matrix.matrix?.[node.path]?.[node.path]?.similarity || 0;
        const gap = 1 - selfAlignment;
        const categoryWeight = this.getCategoryWeight(node.path);
        
        // Enhanced formula: Gap² × Amplitude × Time × SpecAge × Weight × Scale
        const amplitudeFactor = this.calculateAmplitudeFactor(selfAlignment);
        const scaleFactor = 1000;
        
        const contribution = Math.pow(gap, 2) * amplitudeFactor * timeFactor * specAge * categoryWeight * scaleFactor;
        
        components.push({
          category: node.path,
          name: node.name,
          selfAlignment: selfAlignment,
          gap: gap,
          amplitudeFactor: amplitudeFactor,
          categoryWeight: categoryWeight,
          contribution: contribution
        });
        
        total += contribution;
        
        console.log(`    ${node.name}: ${(gap * 100).toFixed(1)}% gap × ${amplitudeFactor.toFixed(2)} amplitude = ${contribution.toFixed(0)} units`);
      });
    }
    
    return { total, components };
  }

  /**
   * Calculate off-diagonal misalignment (presence factors)
   * This captures WHERE the cold spots appear - above/below diagonal patterns
   */
  calculateOffDiagonalDebt(matrix, timeFactor, specAge) {
    console.log('\n🔸 CALCULATING OFF-DIAGONAL MISALIGNMENT (Presence)');
    
    const components = [];
    let total = 0;
    
    if (matrix.nodes && matrix.matrix) {
      // Analyze each cell in the matrix for off-diagonal patterns
      matrix.nodes.forEach((rowNode, i) => {
        matrix.nodes.forEach((colNode, j) => {
          if (i !== j) { // Only off-diagonal cells
            const cellData = matrix.matrix[rowNode.path]?.[colNode.path];
            if (cellData) {
              const misalignment = this.calculateMisalignmentFactor(cellData, i < j);
              
              if (misalignment > 0.01) { // Only significant misalignments
                const positionalWeight = this.getPositionalWeight(i, j, matrix.nodes.length);
                const contribution = misalignment * timeFactor * specAge * positionalWeight * 500; // 0.5x scale vs diagonal
                
                components.push({
                  from: rowNode.name,
                  to: colNode.name,
                  position: i < j ? 'above' : 'below',
                  misalignment: misalignment,
                  positionalWeight: positionalWeight,
                  contribution: contribution
                });
                
                total += contribution;
                
                console.log(`    ${rowNode.name} → ${colNode.name} (${i < j ? 'above' : 'below'}): ${(misalignment * 100).toFixed(1)}% misalign = ${contribution.toFixed(0)} units`);
              }
            }
          }
        });
      });
    }
    
    return { total, components };
  }

  /**
   * Calculate amplitude factor based on how weak the diagonal is
   * Stronger diagonal = lower amplitude factor
   * Weaker diagonal = higher amplitude factor (more liability)
   */
  calculateAmplitudeFactor(selfAlignment) {
    // Exponential decay: strong alignment reduces amplitude dramatically
    // Weak alignment creates high amplitude (liability multiplier)
    return Math.pow(2 - selfAlignment, 2); // Range: 1.0 (perfect) to 4.0 (terrible)
  }

  /**
   * Calculate misalignment factor for off-diagonal cells
   * High similarity where there should be low = misalignment
   */
  calculateMisalignmentFactor(cellData, isAboveDiagonal) {
    const similarity = cellData.similarity || 0;
    const gap = cellData.gap || 0;
    
    // Above diagonal: Implementation holes (working on X when should be Y)
    // Below diagonal: Documentation holes (documenting X while working on Y)
    
    if (isAboveDiagonal) {
      // Above diagonal: High similarity indicates implementation confusion
      return similarity * gap; // Both high similarity AND gap = bad
    } else {
      // Below diagonal: High gap indicates documentation lag
      return Math.pow(gap, 1.5); // Gap dominates below diagonal
    }
  }

  /**
   * Get positional weight based on matrix position
   * Corner positions (far from diagonal) have higher weight
   */
  getPositionalWeight(i, j, matrixSize) {
    const distanceFromDiagonal = Math.abs(i - j);
    const maxDistance = matrixSize - 1;
    
    // Weight increases with distance from diagonal
    return 0.1 + (distanceFromDiagonal / maxDistance) * 0.4; // Range: 0.1 to 0.5
  }

  /**
   * Get category weight for different types of categories
   */
  getCategoryWeight(categoryPath) {
    // Core MVP categories get higher weight
    if (categoryPath.includes('Α📏')) return 0.4;  // Measurement - critical
    if (categoryPath.includes('Β🎨')) return 0.35; // Visualization - important  
    if (categoryPath.includes('Γ⚖️')) return 0.25; // Enforcement - necessary
    
    // Sub-categories get proportional weight
    if (categoryPath.includes('.D📊')) return 0.15; // Drift Detection
    if (categoryPath.includes('.S🎯')) return 0.15; // Scoring Formula
    if (categoryPath.includes('.M🔲')) return 0.12; // Trade-off Matrix
    
    return 0.1; // Default weight
  }

  /**
   * Calculate time factor (days since last good state)
   */
  calculateTimeFactor() {
    // For now, use 30 days as default drift period
    return 30;
  }

  /**
   * Calculate specification age factor
   */
  calculateSpecAge() {
    // Patent filed ~180 days ago, business plan ~90 days
    return 180;
  }

  /**
   * Load matrix data
   */
  loadMatrix() {
    if (fs.existsSync(this.matrixPath)) {
      return JSON.parse(fs.readFileSync(this.matrixPath, 'utf8'));
    }
    return null;
  }

  /**
   * Load settings
   */
  loadSettings() {
    if (fs.existsSync(this.settingsPath)) {
      return JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
    }
    return {};
  }
}

// Export for use in other scripts
module.exports = { HeatmapCompositeTrustDebtCalculator };

// Run if called directly
if (require.main === module) {
  const calculator = new HeatmapCompositeTrustDebtCalculator();
  
  try {
    const result = calculator.calculateCompositeTrustDebt();
    
    // Save results
    fs.writeFileSync(
      'trust-debt-heatmap-composite.json',
      JSON.stringify(result, null, 2)
    );
    
    console.log('\n✅ Heatmap composite calculation complete!');
    console.log('📁 Results saved to trust-debt-heatmap-composite.json');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}