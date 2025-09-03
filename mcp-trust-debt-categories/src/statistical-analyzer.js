import { 
  sampleCorrelation,
  sampleCovariance,
  mean,
  standardDeviation
} from 'simple-statistics';

/**
 * Statistical analyzer for Trust Debt category independence
 * Uses formal statistical methods to determine category relationships
 */
export class StatisticalAnalyzer {
  constructor() {
    this.significanceLevel = 0.05;
  }

  /**
   * Analyze statistical independence between categories
   */
  async analyzeIndependence(categories, data, tests) {
    const results = {
      categories,
      dataSize: data.length,
      tests: [],
      summary: {},
      independenceMatrix: this.createIndependenceMatrix(categories)
    };

    // Extract category values for analysis
    const categoryData = this.extractCategoryData(categories, data);

    for (const testType of tests) {
      let testResult;
      
      switch (testType) {
        case 'chi_square':
          testResult = await this.performChiSquareTest(categoryData, categories);
          break;
        case 'mutual_information':
          testResult = await this.calculateMutualInformation(categoryData, categories);
          break;
        case 'correlation':
          testResult = await this.calculateCorrelationMatrix(categoryData, categories);
          break;
        case 'cramers_v':
          testResult = await this.calculateCramersV(categoryData, categories);
          break;
        default:
          throw new Error(`Unknown test type: ${testType}`);
      }
      
      results.tests.push(testResult);
    }

    // Generate overall independence assessment
    results.summary = this.generateIndependenceSummary(results.tests);
    
    return results;
  }

  /**
   * Extract category values from historical data
   */
  extractCategoryData(categories, data) {
    const categoryData = {};
    
    categories.forEach(category => {
      categoryData[category] = data.map(point => {
        const value = point.categories[category] || 0;
        return typeof value === 'number' ? value : 0;
      });
    });
    
    return categoryData;
  }

  /**
   * Perform Chi-Square test for independence
   */
  async performChiSquareTest(categoryData, categories) {
    const results = {
      name: 'Chi-Square Independence Test',
      type: 'chi_square',
      pairwiseResults: [],
      overallSignificant: false,
      interpretation: ''
    };

    // Test all pairs of categories
    const categoryPairs = [];
    for (let i = 0; i < categories.length; i++) {
      for (let j = i + 1; j < categories.length; j++) {
        categoryPairs.push([categories[i], categories[j]]);
      }
    }
    
    for (const [cat1, cat2] of categoryPairs) {
      const contingencyTable = this.createContingencyTable(
        categoryData[cat1], 
        categoryData[cat2]
      );
      
      try {
        const chiSquareResult = this.chiSquareIndependence(contingencyTable);
        
        results.pairwiseResults.push({
          categories: [cat1, cat2],
          statistic: chiSquareResult.statistic,
          pValue: chiSquareResult.pValue,
          degreesOfFreedom: chiSquareResult.df,
          significant: chiSquareResult.pValue < this.significanceLevel,
          interpretation: this.interpretChiSquare(chiSquareResult, cat1, cat2)
        });
      } catch (error) {
        results.pairwiseResults.push({
          categories: [cat1, cat2],
          error: error.message,
          significant: false
        });
      }
    }

    // Overall assessment
    const significantPairs = results.pairwiseResults.filter(r => r.significant).length;
    results.overallSignificant = significantPairs > 0;
    results.interpretation = `${significantPairs}/${results.pairwiseResults.length} category pairs show significant dependence`;

    return results;
  }

  /**
   * Calculate mutual information between categories
   */
  async calculateMutualInformation(categoryData, categories) {
    const results = {
      name: 'Mutual Information Analysis',
      type: 'mutual_information',
      pairwiseResults: [],
      averageMI: 0,
      interpretation: ''
    };

    const categoryPairs = [];
    for (let i = 0; i < categories.length; i++) {
      for (let j = i + 1; j < categories.length; j++) {
        categoryPairs.push([categories[i], categories[j]]);
      }
    }
    let totalMI = 0;

    for (const [cat1, cat2] of categoryPairs) {
      const mi = this.mutualInformation(categoryData[cat1], categoryData[cat2]);
      
      results.pairwiseResults.push({
        categories: [cat1, cat2],
        mutualInformation: mi,
        normalized: this.normalizedMutualInformation(categoryData[cat1], categoryData[cat2]),
        interpretation: this.interpretMutualInformation(mi, cat1, cat2)
      });
      
      totalMI += mi;
    }

    results.averageMI = totalMI / results.pairwiseResults.length;
    results.interpretation = `Average mutual information: ${results.averageMI.toFixed(4)}. Lower values indicate greater independence.`;

    return results;
  }

  /**
   * Calculate correlation matrix
   */
  async calculateCorrelationMatrix(categoryData, categories) {
    const results = {
      name: 'Correlation Analysis',
      type: 'correlation',
      correlationMatrix: [],
      strongCorrelations: [],
      averageAbsCorrelation: 0,
      interpretation: ''
    };

    const matrix = [];
    const correlations = [];

    for (let i = 0; i < categories.length; i++) {
      const row = [];
      for (let j = 0; j < categories.length; j++) {
        if (i === j) {
          row.push(1.0);
        } else if (j < i) {
          row.push(matrix[j][i]); // Use symmetry
        } else {
          const correlation = sampleCorrelation(
            categoryData[categories[i]], 
            categoryData[categories[j]]
          );
          row.push(correlation);
          correlations.push(Math.abs(correlation));
          
          if (Math.abs(correlation) > 0.7) {
            results.strongCorrelations.push({
              categories: [categories[i], categories[j]],
              correlation,
              strength: this.interpretCorrelationStrength(Math.abs(correlation))
            });
          }
        }
      }
      matrix.push(row);
    }

    results.correlationMatrix = matrix;
    results.averageAbsCorrelation = mean(correlations);
    results.interpretation = `Average absolute correlation: ${results.averageAbsCorrelation.toFixed(3)}. ${results.strongCorrelations.length} strong correlations detected.`;

    return results;
  }

  /**
   * Calculate Cramer's V for categorical associations
   */
  async calculateCramersV(categoryData, categories) {
    const results = {
      name: 'Cramers V Association Test',
      type: 'cramers_v',
      pairwiseResults: [],
      averageCramersV: 0,
      interpretation: ''
    };

    const categoryPairs = [];
    for (let i = 0; i < categories.length; i++) {
      for (let j = i + 1; j < categories.length; j++) {
        categoryPairs.push([categories[i], categories[j]]);
      }
    }
    let totalCramersV = 0;

    for (const [cat1, cat2] of categoryPairs) {
      const contingencyTable = this.createContingencyTable(
        categoryData[cat1], 
        categoryData[cat2]
      );
      
      const cramersV = this.cramersV(contingencyTable);
      
      results.pairwiseResults.push({
        categories: [cat1, cat2],
        cramersV,
        strength: this.interpretCramersV(cramersV),
        interpretation: `${cat1} and ${cat2}: ${this.interpretCramersV(cramersV)} association (V=${cramersV.toFixed(3)})`
      });
      
      totalCramersV += cramersV;
    }

    results.averageCramersV = totalCramersV / results.pairwiseResults.length;
    results.interpretation = `Average Cramer's V: ${results.averageCramersV.toFixed(3)}. Values closer to 0 indicate independence.`;

    return results;
  }

  /**
   * Detect causal relationships using Granger causality and time-series analysis
   */
  async detectCausality(timeseriesData, lagWindow, significanceThreshold) {
    const results = {
      relationships: [],
      temporalPatterns: [],
      lagAnalysis: {},
      summary: {}
    };

    // Extract categories from the data
    const categories = Object.keys(timeseriesData[0]?.categories || {});
    if (categories.length === 0) return results;

    // Prepare time series for each category
    const categoryTimeSeries = {};
    categories.forEach(cat => {
      categoryTimeSeries[cat] = timeseriesData.map(point => point.categories[cat] || 0);
    });

    // Test Granger causality for each pair
    const categoryPairs = [];
    for (let i = 0; i < categories.length; i++) {
      for (let j = i + 1; j < categories.length; j++) {
        categoryPairs.push([categories[i], categories[j]]);
      }
    }
    
    for (const [cat1, cat2] of categoryPairs) {
      const causality12 = this.grangerCausalityTest(
        categoryTimeSeries[cat1], 
        categoryTimeSeries[cat2], 
        lagWindow
      );
      
      const causality21 = this.grangerCausalityTest(
        categoryTimeSeries[cat2], 
        categoryTimeSeries[cat1], 
        lagWindow
      );

      if (causality12.pValue < significanceThreshold) {
        results.relationships.push({
          cause: cat1,
          effect: cat2,
          strength: causality12.fStatistic,
          confidence: 1 - causality12.pValue,
          lag: causality12.optimalLag,
          evidence: `F-statistic: ${causality12.fStatistic.toFixed(3)}, p-value: ${causality12.pValue.toFixed(4)}`
        });
      }

      if (causality21.pValue < significanceThreshold) {
        results.relationships.push({
          cause: cat2,
          effect: cat1,
          strength: causality21.fStatistic,
          confidence: 1 - causality21.pValue,
          lag: causality21.optimalLag,
          evidence: `F-statistic: ${causality21.fStatistic.toFixed(3)}, p-value: ${causality21.pValue.toFixed(4)}`
        });
      }
    }

    // Analyze temporal patterns
    results.temporalPatterns = this.analyzeTemporalPatterns(categoryTimeSeries, timeseriesData);
    
    return results;
  }

  // === Helper Methods ===

  createContingencyTable(data1, data2) {
    // Discretize continuous data into bins
    const bins1 = this.discretizeData(data1);
    const bins2 = this.discretizeData(data2);
    
    const table = {};
    
    for (let i = 0; i < bins1.length; i++) {
      const bin1 = bins1[i];
      const bin2 = bins2[i];
      
      if (!table[bin1]) table[bin1] = {};
      if (!table[bin1][bin2]) table[bin1][bin2] = 0;
      
      table[bin1][bin2]++;
    }
    
    return table;
  }

  discretizeData(data, numBins = 5) {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const binSize = (max - min) / numBins;
    
    return data.map(value => {
      const bin = Math.floor((value - min) / binSize);
      return Math.min(bin, numBins - 1);
    });
  }

  chiSquareIndependence(contingencyTable) {
    // Convert contingency table to format for chi-square test
    const observed = [];
    const expected = [];
    
    const rowTotals = {};
    const colTotals = {};
    let grandTotal = 0;

    // Calculate totals
    Object.keys(contingencyTable).forEach(row => {
      rowTotals[row] = 0;
      Object.keys(contingencyTable[row]).forEach(col => {
        const count = contingencyTable[row][col];
        rowTotals[row] += count;
        colTotals[col] = (colTotals[col] || 0) + count;
        grandTotal += count;
      });
    });

    // Calculate chi-square statistic
    let chiSquare = 0;
    let df = 0;
    
    Object.keys(contingencyTable).forEach(row => {
      Object.keys(contingencyTable[row]).forEach(col => {
        const observedCount = contingencyTable[row][col];
        const expectedCount = (rowTotals[row] * colTotals[col]) / grandTotal;
        
        if (expectedCount > 0) {
          chiSquare += Math.pow(observedCount - expectedCount, 2) / expectedCount;
          df++;
        }
      });
    });

    df = (Object.keys(rowTotals).length - 1) * (Object.keys(colTotals).length - 1);
    
    // Approximate p-value using chi-square distribution
    const pValue = this.chiSquarePValue(chiSquare, df);
    
    return {
      statistic: chiSquare,
      pValue,
      df,
      significant: pValue < this.significanceLevel
    };
  }

  mutualInformation(x, y) {
    // Estimate mutual information using histogram approach
    const jointHist = this.buildJointHistogram(x, y);
    const marginalX = this.buildMarginalHistogram(x);
    const marginalY = this.buildMarginalHistogram(y);
    
    let mi = 0;
    const total = x.length;
    
    Object.keys(jointHist).forEach(binX => {
      Object.keys(jointHist[binX] || {}).forEach(binY => {
        const jointProb = jointHist[binX][binY] / total;
        const marginalProbX = marginalX[binX] / total;
        const marginalProbY = marginalY[binY] / total;
        
        if (jointProb > 0 && marginalProbX > 0 && marginalProbY > 0) {
          mi += jointProb * Math.log2(jointProb / (marginalProbX * marginalProbY));
        }
      });
    });
    
    return mi;
  }

  normalizedMutualInformation(x, y) {
    const mi = this.mutualInformation(x, y);
    const hX = this.entropy(x);
    const hY = this.entropy(y);
    
    return mi / Math.sqrt(hX * hY);
  }

  entropy(data) {
    const hist = this.buildMarginalHistogram(data);
    const total = data.length;
    let entropy = 0;
    
    Object.values(hist).forEach(count => {
      if (count > 0) {
        const prob = count / total;
        entropy -= prob * Math.log2(prob);
      }
    });
    
    return entropy;
  }

  cramersV(contingencyTable) {
    const chiSquareResult = this.chiSquareIndependence(contingencyTable);
    const n = Object.values(contingencyTable).reduce((sum, row) => 
      sum + Object.values(row).reduce((rowSum, count) => rowSum + count, 0), 0);
    const k = Math.min(
      Object.keys(contingencyTable).length,
      Math.max(...Object.values(contingencyTable).map(row => Object.keys(row).length))
    );
    
    return Math.sqrt(chiSquareResult.statistic / (n * (k - 1)));
  }

  grangerCausalityTest(x, y, maxLag) {
    // Simplified Granger causality test
    let bestResult = { fStatistic: 0, pValue: 1, optimalLag: 1 };
    
    for (let lag = 1; lag <= maxLag; lag++) {
      const result = this.performGrangerTest(x, y, lag);
      if (result.fStatistic > bestResult.fStatistic) {
        bestResult = { ...result, optimalLag: lag };
      }
    }
    
    return bestResult;
  }

  performGrangerTest(x, y, lag) {
    // Create lagged variables
    const laggedX = [];
    const laggedY = [];
    const currentY = [];
    
    for (let i = lag; i < x.length; i++) {
      const xLags = [];
      const yLags = [];
      
      for (let j = 1; j <= lag; j++) {
        xLags.push(x[i - j]);
        yLags.push(y[i - j]);
      }
      
      laggedX.push(xLags);
      laggedY.push(yLags);
      currentY.push(y[i]);
    }

    // Fit restricted model (y ~ lagged_y)
    const restrictedSSE = this.calculateSSE(currentY, laggedY);
    
    // Fit unrestricted model (y ~ lagged_y + lagged_x)
    const unrestrictedData = laggedY.map((yLags, i) => [...yLags, ...laggedX[i]]);
    const unrestrictedSSE = this.calculateSSE(currentY, unrestrictedData);
    
    // Calculate F-statistic
    const n = currentY.length;
    const k = lag * 2; // total parameters in unrestricted model
    const q = lag; // additional parameters (lagged x)
    
    const fStatistic = ((restrictedSSE - unrestrictedSSE) / q) / (unrestrictedSSE / (n - k - 1));
    const pValue = this.fTestPValue(fStatistic, q, n - k - 1);
    
    return { fStatistic, pValue };
  }

  analyzeTemporalPatterns(categoryTimeSeries, timeseriesData) {
    const patterns = [];
    
    // Detect trends
    Object.keys(categoryTimeSeries).forEach(category => {
      const data = categoryTimeSeries[category];
      const trend = this.detectTrend(data);
      
      patterns.push(`${category}: ${trend.direction} trend (slope: ${trend.slope.toFixed(3)})`);
    });
    
    // Detect cyclical patterns
    // TODO: Implement spectral analysis for cycle detection
    
    return patterns;
  }

  // === Statistical Utility Functions ===

  buildJointHistogram(x, y, bins = 10) {
    const hist = {};
    const binsX = this.discretizeData(x, bins);
    const binsY = this.discretizeData(y, bins);
    
    for (let i = 0; i < binsX.length; i++) {
      const binX = binsX[i];
      const binY = binsY[i];
      
      if (!hist[binX]) hist[binX] = {};
      if (!hist[binX][binY]) hist[binX][binY] = 0;
      hist[binX][binY]++;
    }
    
    return hist;
  }

  buildMarginalHistogram(data, bins = 10) {
    const hist = {};
    const binned = this.discretizeData(data, bins);
    
    binned.forEach(bin => {
      hist[bin] = (hist[bin] || 0) + 1;
    });
    
    return hist;
  }

  calculateSSE(y, X) {
    // Simple linear regression SSE calculation
    const n = y.length;
    if (n === 0 || X.length === 0) return 0;
    
    const meanY = mean(y);
    let sse = 0;
    
    // For simplicity, assume mean prediction
    y.forEach(yi => {
      sse += Math.pow(yi - meanY, 2);
    });
    
    return sse;
  }

  detectTrend(data) {
    const n = data.length;
    const x = Array.from({length: n}, (_, i) => i);
    
    // Simple linear regression
    const meanX = mean(x);
    const meanY = mean(data);
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (x[i] - meanX) * (data[i] - meanY);
      denominator += (x[i] - meanX) ** 2;
    }
    
    const slope = denominator === 0 ? 0 : numerator / denominator;
    
    return {
      slope,
      direction: slope > 0.01 ? 'increasing' : slope < -0.01 ? 'decreasing' : 'stable'
    };
  }

  // Approximation functions for statistical distributions
  chiSquarePValue(chiSquare, df) {
    // Rough approximation - in production, use proper statistical library
    if (df === 1) {
      return 2 * (1 - this.normalCDF(Math.sqrt(chiSquare)));
    }
    // Very rough approximation
    return Math.exp(-chiSquare / 2);
  }

  fTestPValue(f, df1, df2) {
    // Very rough approximation - use proper F-distribution in production
    return Math.exp(-f / 2);
  }

  normalCDF(x) {
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  erf(x) {
    // Approximation of error function
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return sign * y;
  }

  // === Interpretation Methods ===

  interpretChiSquare(result, cat1, cat2) {
    if (result.significant) {
      return `${cat1} and ${cat2} are significantly dependent (reject independence hypothesis)`;
    } else {
      return `${cat1} and ${cat2} appear independent (fail to reject independence hypothesis)`;
    }
  }

  interpretMutualInformation(mi, cat1, cat2) {
    if (mi < 0.1) {
      return `Low mutual information - ${cat1} and ${cat2} are largely independent`;
    } else if (mi < 0.3) {
      return `Moderate mutual information - some dependence between ${cat1} and ${cat2}`;
    } else {
      return `High mutual information - significant dependence between ${cat1} and ${cat2}`;
    }
  }

  interpretCorrelationStrength(absCorr) {
    if (absCorr < 0.3) return 'weak';
    if (absCorr < 0.7) return 'moderate';
    return 'strong';
  }

  interpretCramersV(v) {
    if (v < 0.1) return 'negligible';
    if (v < 0.3) return 'weak';
    if (v < 0.5) return 'moderate';
    return 'strong';
  }

  createIndependenceMatrix(categories) {
    const matrix = {};
    categories.forEach(cat1 => {
      matrix[cat1] = {};
      categories.forEach(cat2 => {
        matrix[cat1][cat2] = cat1 === cat2 ? 1.0 : null; // Will be filled during analysis
      });
    });
    return matrix;
  }

  generateIndependenceSummary(tests) {
    return {
      overallIndependence: tests.every(test => 
        test.pairwiseResults ? 
          test.pairwiseResults.every(result => !result.significant) : 
          true
      ),
      recommendedActions: this.generateRecommendedActions(tests)
    };
  }

  generateRecommendedActions(tests) {
    const actions = [];
    
    tests.forEach(test => {
      if (test.pairwiseResults) {
        const dependentPairs = test.pairwiseResults.filter(r => r.significant);
        dependentPairs.forEach(pair => {
          actions.push(`Consider merging or redefining categories: ${pair.categories.join(' and ')}`);
        });
      }
    });
    
    return actions.length > 0 ? actions : ['Categories show good independence - no action needed'];
  }
}