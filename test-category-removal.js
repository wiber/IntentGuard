#!/usr/bin/env node

import { CategoryManager } from './mcp-trust-debt-categories/src/category-manager.js';

/**
 * Test the impact of removing B🔒 and C💨 sub-categories on statistical independence
 */
async function testCategoryRemoval() {
  console.log('🧪 Testing Category Removal Impact on Statistical Independence\n');
  
  const manager = new CategoryManager();
  
  // Categories BEFORE removal (with sub-categories)
  const categoriesBefore = [
    { id: 'A🚀', name: 'Performance', description: 'Speed, efficiency, and resource utilization' },
    { id: 'B🔒', name: 'Security', description: 'Protection, vulnerability management, and access control' },
    { id: 'B🔒.1🛡', name: 'Defense', description: 'Defensive security measures' },
    { id: 'B🔒.2🔑', name: 'Authentication', description: 'Identity verification' },
    { id: 'B🔒.3⚠', name: 'Monitoring', description: 'Security monitoring and alerts' },
    { id: 'B🔒.4🔐', name: 'Encryption', description: 'Data protection encryption' },
    { id: 'C💨', name: 'Speed', description: 'Response time and latency' },
    { id: 'C💨.1🚀', name: 'LoadTime', description: 'Initial loading performance' },
    { id: 'C💨.2💨', name: 'Response', description: 'Response time performance' },
    { id: 'C💨.3⏰', name: 'Latency', description: 'Network latency measurements' },
    { id: 'C💨.4🎮', name: 'Realtime', description: 'Real-time performance' },
    { id: 'D🧠', name: 'Intelligence', description: 'Smart automation and pattern recognition' },
    { id: 'E🎨', name: 'Visual', description: 'User interface and aesthetic quality' }
  ];

  // Categories AFTER removal (simplified)
  const categoriesAfter = [
    { id: 'A🚀', name: 'Performance', description: 'Speed, efficiency, and resource utilization' },
    { id: 'B🔒', name: 'Security', description: 'Protection, vulnerability management, and access control' },
    { id: 'C💨', name: 'Speed', description: 'Response time and latency' },
    { id: 'D🧠', name: 'Intelligence', description: 'Smart automation and pattern recognition' },
    { id: 'E🎨', name: 'Visual', description: 'User interface and aesthetic quality' }
  ];

  console.log('📋 BEFORE Removal:');
  console.log(`   Total categories: ${categoriesBefore.length}`);
  console.log(`   Sub-categories: ${categoriesBefore.filter(c => c.id.includes('.')).length}`);
  
  console.log('\n📋 AFTER Removal:');
  console.log(`   Total categories: ${categoriesAfter.length}`);
  console.log(`   Sub-categories: ${categoriesAfter.filter(c => c.id.includes('.')).length}`);

  // Generate mock data for both scenarios
  const mockDataBefore = generateMockData(categoriesBefore, 100);
  const mockDataAfter = generateMockData(categoriesAfter, 100);

  console.log('\n🔍 STATISTICAL ANALYSIS COMPARISON');
  console.log('=' .repeat(60));

  try {
    // Test BEFORE removal
    console.log('\n📊 BEFORE Removal (with sub-categories):');
    const beforeValidation = await manager.validateSystem(
      categoriesBefore,
      mockDataBefore,
      ['independence', 'orthogonality', 'completeness']
    );
    
    console.log(`🎯 Overall Health: ${beforeValidation.overallHealth}`);
    beforeValidation.tests.forEach(test => {
      const emoji = test.score >= 80 ? '🟢' : test.score >= 60 ? '🟡' : '🔴';
      console.log(`   ${emoji} ${test.name}: ${test.score}/100`);
    });

    // Test AFTER removal  
    console.log('\n📊 AFTER Removal (simplified categories):');
    const afterValidation = await manager.validateSystem(
      categoriesAfter,
      mockDataAfter,
      ['independence', 'orthogonality', 'completeness']
    );
    
    console.log(`🎯 Overall Health: ${afterValidation.overallHealth}`);
    afterValidation.tests.forEach(test => {
      const emoji = test.score >= 80 ? '🟢' : test.score >= 60 ? '🟡' : '🔴';
      console.log(`   ${emoji} ${test.name}: ${test.score}/100`);
    });

    // Statistical Independence Detailed Analysis
    console.log('\n🔬 DETAILED INDEPENDENCE ANALYSIS');
    console.log('=' .repeat(60));

    const categoryNamesBefore = categoriesBefore.map(c => c.id);
    const categoryNamesAfter = categoriesAfter.map(c => c.id);

    const independenceBefore = await manager.statisticalAnalyzer.analyzeIndependence(
      categoryNamesBefore,
      mockDataBefore,
      ['correlation', 'mutual_information']
    );

    const independenceAfter = await manager.statisticalAnalyzer.analyzeIndependence(
      categoryNamesAfter,
      mockDataAfter,
      ['correlation', 'mutual_information']
    );

    console.log('\n📈 Correlation Analysis:');
    const correlationBefore = independenceBefore.tests.find(t => t.type === 'correlation');
    const correlationAfter = independenceAfter.tests.find(t => t.type === 'correlation');
    
    if (correlationBefore && correlationAfter) {
      console.log(`   BEFORE: Average absolute correlation: ${correlationBefore.averageAbsCorrelation?.toFixed(3) || 'N/A'}`);
      console.log(`   AFTER:  Average absolute correlation: ${correlationAfter.averageAbsCorrelation?.toFixed(3) || 'N/A'}`);
      
      const improvement = correlationBefore.averageAbsCorrelation && correlationAfter.averageAbsCorrelation ?
        ((correlationBefore.averageAbsCorrelation - correlationAfter.averageAbsCorrelation) * 100).toFixed(1) :
        'N/A';
      console.log(`   🎯 Improvement: ${improvement}% reduction in correlation`);
    }

    console.log('\n📊 Mutual Information Analysis:');
    const miBefore = independenceBefore.tests.find(t => t.type === 'mutual_information');
    const miAfter = independenceAfter.tests.find(t => t.type === 'mutual_information');
    
    if (miBefore && miAfter) {
      console.log(`   BEFORE: Average mutual information: ${miBefore.averageMI?.toFixed(4) || 'N/A'}`);
      console.log(`   AFTER:  Average mutual information: ${miAfter.averageMI?.toFixed(4) || 'N/A'}`);
    }

    // Optimization Test
    console.log('\n⚡ SHORTLEX OPTIMIZATION COMPARISON');
    console.log('=' .repeat(60));

    const optimizedBefore = await manager.shortlexOptimizer.optimize(categoriesBefore, 'balanced');
    const optimizedAfter = await manager.shortlexOptimizer.optimize(categoriesAfter, 'balanced');

    console.log(`\n📈 Quality Scores:`);
    console.log(`   BEFORE: Quality Score: ${optimizedBefore.qualityScore}`);
    console.log(`           Overlap Score: ${optimizedBefore.overlapScore}`);
    console.log(`           Orthogonality: ${optimizedBefore.orthogonalityIndex}`);
    
    console.log(`   AFTER:  Quality Score: ${optimizedAfter.qualityScore}`);
    console.log(`           Overlap Score: ${optimizedAfter.overlapScore}`);
    console.log(`           Orthogonality: ${optimizedAfter.orthogonalityIndex}`);

    // Summary
    console.log('\n🎯 SUMMARY OF IMPACT');
    console.log('=' .repeat(60));
    
    const healthImprovement = getHealthScore(afterValidation.overallHealth) - getHealthScore(beforeValidation.overallHealth);
    const qualityImprovement = optimizedAfter.qualityScore - optimizedBefore.qualityScore;
    
    console.log(`✅ Removed sub-categories: B🔒.1🛡 Defense, B🔒.2🔑 Authentication, B🔒.3⚠ Monitoring, B🔒.4🔐 Encryption`);
    console.log(`✅ Removed sub-categories: C💨.1🚀 LoadTime, C💨.2💨 Response, C💨.3⏰ Latency, C💨.4🎮 Realtime`);
    console.log(`\n📊 Impact Assessment:`);
    console.log(`   • Overall Health: ${beforeValidation.overallHealth} → ${afterValidation.overallHealth} (${healthImprovement > 0 ? '+' : ''}${healthImprovement})`);
    console.log(`   • Quality Score: ${optimizedBefore.qualityScore} → ${optimizedAfter.qualityScore} (${qualityImprovement > 0 ? '+' : ''}${qualityImprovement.toFixed(3)})`);
    console.log(`   • Category Count: ${categoriesBefore.length} → ${categoriesAfter.length} (-${categoriesBefore.length - categoriesAfter.length})`);
    
    if (healthImprovement > 0) {
      console.log(`\n🎉 SUCCESS: Removing sub-categories improved statistical independence!`);
    } else if (healthImprovement === 0) {
      console.log(`\n😐 NEUTRAL: No significant change in statistical independence`);
    } else {
      console.log(`\n⚠️  CAUTION: Removing sub-categories may have reduced independence`);
    }

    console.log(`\n💡 NEXT STEPS:`);
    console.log(`   • The simplified category system has been tested`);
    console.log(`   • Use 'npm run cli' to further refine categories with natural language`);
    console.log(`   • Statistical independence ${healthImprovement >= 0 ? 'maintained or improved' : 'may need attention'}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

function generateMockData(categories, numPoints) {
  const data = [];
  
  for (let i = 0; i < numPoints; i++) {
    const point = {
      commit: `commit_${i}`,
      categories: {}
    };
    
    categories.forEach(cat => {
      // Generate somewhat correlated data to simulate real-world relationships
      let baseValue = Math.random() * 100;
      
      // Introduce realistic correlations
      if (cat.id.startsWith('B🔒') && point.categories['B🔒']) {
        baseValue = point.categories['B🔒'] * 0.6 + Math.random() * 40; // Security sub-cats correlate
      } else if (cat.id.startsWith('C💨') && point.categories['C💨']) {
        baseValue = point.categories['C💨'] * 0.7 + Math.random() * 30; // Speed sub-cats correlate highly
      } else if (cat.id === 'A🚀' && point.categories['C💨']) {
        baseValue = point.categories['C💨'] * 0.4 + Math.random() * 50; // Performance and Speed correlation
      }
      
      point.categories[cat.id] = Math.round(baseValue * 10) / 10;
    });
    
    data.push(point);
  }
  
  return data;
}

function getHealthScore(health) {
  const scores = { 'Excellent': 5, 'Good': 4, 'Fair': 3, 'Needs Improvement': 2, 'Poor': 1 };
  return scores[health] || 0;
}

// Run the test
testCategoryRemoval().catch(console.error);