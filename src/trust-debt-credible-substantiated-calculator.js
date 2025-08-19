#!/usr/bin/env node

/**
 * Trust Debt Credible Substantiated Calculator
 * 
 * CRITICAL: Trust Debt must be legitimately substantiated by:
 * 1. ACTUAL commit history analysis (last 7 days)
 * 2. REAL documentation summaries that Claude processes
 * 3. MEASURABLE gaps between stated intent and delivered reality
 * 
 * No theoretical calculations - only evidence-based measurement
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CredibleTrustDebtCalculator {
  constructor() {
    this.projectRoot = process.cwd();
    this.analysisWindow = 7; // days
  }

  /**
   * Calculate Trust Debt based on actual evidence
   */
  async calculateCredibleTrustDebt() {
    console.log('\n🔍 CREDIBLE TRUST DEBT CALCULATOR');
    console.log('=' .repeat(50));
    console.log('Evidence-based measurement using:');
    console.log('• Actual commit history (last 7 days)');
    console.log('• Real documentation summaries');
    console.log('• Measurable intent vs reality gaps');
    
    // Step 1: Analyze actual commit history
    const commitAnalysis = this.analyzeActualCommits();
    
    // Step 2: Analyze actual documentation
    const docAnalysis = this.analyzeActualDocumentation();
    
    // Step 3: Measure real gaps
    const credibleGaps = this.measureCredibleGaps(commitAnalysis, docAnalysis);
    
    // Step 4: Calculate substantiated Trust Debt
    const trustDebt = this.calculateSubstantiatedTrustDebt(credibleGaps);
    
    return {
      score: trustDebt.total,
      evidence: {
        commitAnalysis,
        docAnalysis,
        gaps: credibleGaps
      },
      substantiation: trustDebt.substantiation,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Analyze actual commits from last 7 days
   */
  analyzeActualCommits() {
    console.log('\n📊 ANALYZING ACTUAL COMMITS (Last 7 Days)');
    
    try {
      // Get actual commits
      const commitLog = execSync(`git log --since="7 days ago" --pretty=format:"%h|%s|%an|%ad" --date=short`, {
        encoding: 'utf8'
      });
      
      // Get changed files
      const filesChanged = execSync(`git log --since="7 days ago" --name-only --pretty=format:""`, {
        encoding: 'utf8'
      });
      
      const commits = commitLog.split('\n').filter(line => line.trim()).map(line => {
        const [hash, subject, author, date] = line.split('|');
        return { hash, subject, author, date };
      });
      
      const files = filesChanged.split('\n').filter(f => f.trim());
      
      // Analyze work patterns
      const workPatterns = this.analyzeWorkPatterns(commits, files);
      
      console.log(`  📈 Total commits: ${commits.length}`);
      console.log(`  📁 Files changed: ${files.length}`);
      console.log(`  🎯 Work focus: ${workPatterns.primaryFocus}`);
      console.log(`  ⚠️ Drift indicators: ${workPatterns.driftSignals.length}`);
      
      return {
        totalCommits: commits.length,
        filesChanged: files.length,
        commits: commits.slice(0, 10), // Latest 10 for evidence
        workPatterns,
        timespan: '7 days'
      };
      
    } catch (error) {
      console.log('  ❌ Error analyzing commits:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Analyze actual documentation that exists and is referenced
   */
  analyzeActualDocumentation() {
    console.log('\n📚 ANALYZING ACTUAL DOCUMENTATION');
    
    const docSources = [
      'docs/01-business/patents/v16 filed/FIM_Patent_v16_USPTO_FILING.txt',
      'docs/coherence-cycles/CANONICAL_BUSINESS_PLAN.md', 
      'docs/03-product/MVP/commitMVP.txt',
      'CLAUDE.md'
    ];
    
    const docAnalysis = {
      sources: [],
      totalWordCount: 0,
      keyPromises: [],
      lastUpdated: null
    };
    
    for (const docPath of docSources) {
      const fullPath = path.join(this.projectRoot, docPath);
      
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const stats = fs.statSync(fullPath);
        const wordCount = content.split(/\s+/).length;
        
        // Extract key promises/commitments
        const promises = this.extractKeyPromises(content, docPath);
        
        docAnalysis.sources.push({
          path: docPath,
          wordCount,
          lastModified: stats.mtime,
          promises: promises.length,
          exists: true
        });
        
        docAnalysis.totalWordCount += wordCount;
        docAnalysis.keyPromises.push(...promises);
        
        if (!docAnalysis.lastUpdated || stats.mtime > docAnalysis.lastUpdated) {
          docAnalysis.lastUpdated = stats.mtime;
        }
        
        console.log(`  ✅ ${docPath}: ${wordCount} words, ${promises.length} promises`);
      } else {
        console.log(`  ❌ ${docPath}: NOT FOUND`);
        docAnalysis.sources.push({
          path: docPath,
          exists: false
        });
      }
    }
    
    console.log(`  📊 Total: ${docAnalysis.totalWordCount} words, ${docAnalysis.keyPromises.length} promises`);
    
    return docAnalysis;
  }

  /**
   * Extract key promises/commitments from documentation
   */
  extractKeyPromises(content, docPath) {
    const promises = [];
    
    // Common promise patterns
    const patterns = [
      /will\s+([^.]{10,50})/gi,
      /shall\s+([^.]{10,50})/gi, 
      /must\s+([^.]{10,50})/gi,
      /provides?\s+([^.]{10,50})/gi,
      /delivers?\s+([^.]{10,50})/gi,
      /implements?\s+([^.]{10,50})/gi,
      /enables?\s+([^.]{10,50})/gi
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        promises.push({
          text: match[0].trim(),
          context: match[1].trim(),
          source: docPath,
          type: match[0].split(/\s+/)[0].toLowerCase()
        });
      }
    }
    
    return promises.slice(0, 5); // Top 5 promises per document
  }

  /**
   * Analyze work patterns from commits
   */
  analyzeWorkPatterns(commits, files) {
    const patterns = {
      trustDebtFocus: 0,
      patentWork: 0,
      productWork: 0,
      documentationWork: 0,
      metaWork: 0 // Working on the system that measures the system
    };
    
    const driftSignals = [];
    
    // Analyze commit subjects
    commits.forEach(commit => {
      const subject = commit.subject.toLowerCase();
      
      if (subject.includes('trust debt') || subject.includes('trust-debt')) {
        patterns.trustDebtFocus++;
      } else if (subject.includes('patent') || subject.includes('fim')) {
        patterns.patentWork++;
      } else if (subject.includes('feat:') && !subject.includes('trust debt')) {
        patterns.productWork++;
      } else if (subject.includes('docs:') || subject.includes('.md')) {
        patterns.documentationWork++;
      }
      
      // Detect drift signals
      if (subject.includes('update trust debt') || subject.includes('enhance trust debt')) {
        driftSignals.push({
          type: 'recursive_measurement',
          commit: commit.hash,
          description: 'Working on measurement system instead of measured system'
        });
      }
    });
    
    // Analyze file changes
    const trustDebtFiles = files.filter(f => f.includes('trust-debt')).length;
    const productFiles = files.filter(f => 
      f.includes('src/') && 
      !f.includes('trust-debt') && 
      !f.includes('docs/')
    ).length;
    
    if (trustDebtFiles > productFiles * 3) {
      driftSignals.push({
        type: 'measurement_obsession', 
        ratio: `${trustDebtFiles}:${productFiles}`,
        description: 'More work on measuring than building'
      });
    }
    
    // Determine primary focus
    const maxPattern = Object.entries(patterns).reduce((max, [key, value]) => 
      value > max.value ? { key, value } : max, 
      { key: 'unknown', value: 0 }
    );
    
    return {
      patterns,
      primaryFocus: maxPattern.key,
      driftSignals,
      trustDebtObsession: patterns.trustDebtFocus / commits.length
    };
  }

  /**
   * Measure credible gaps between documentation promises and commit delivery
   */
  measureCredibleGaps(commitAnalysis, docAnalysis) {
    console.log('\n⚖️ MEASURING CREDIBLE GAPS');
    
    const gaps = [];
    
    // Gap 1: Recursive measurement obsession
    if (commitAnalysis.workPatterns.trustDebtObsession > 0.5) {
      gaps.push({
        category: 'Measurement Recursion',
        gap: commitAnalysis.workPatterns.trustDebtObsession,
        evidence: `${Math.round(commitAnalysis.workPatterns.trustDebtObsession * 100)}% of commits on Trust Debt system`,
        impact: 'Building measurement instead of product',
        liability: 'Feature velocity approaches zero'
      });
    }
    
    // Gap 2: Documentation promises vs commit delivery
    const promises = docAnalysis.keyPromises.filter(p => 
      ['implements', 'provides', 'delivers'].includes(p.type)
    );
    
    const implementations = commitAnalysis.commits.filter(c => 
      c.subject.includes('feat:') && 
      !c.subject.includes('trust debt') &&
      !c.subject.includes('docs:')
    );
    
    const promiseImplementationRatio = implementations.length / Math.max(promises.length, 1);
    
    if (promiseImplementationRatio < 0.2) {
      gaps.push({
        category: 'Promise Implementation Gap',
        gap: 1 - promiseImplementationRatio,
        evidence: `${promises.length} promises vs ${implementations.length} feature implementations`,
        impact: 'Documentation promises exceed delivery capacity',
        liability: 'Credibility gap with stakeholders'
      });
    }
    
    // Gap 3: Meta-work drift
    const metaDrift = commitAnalysis.workPatterns.driftSignals.length / Math.max(commitAnalysis.totalCommits, 1);
    
    if (metaDrift > 0.3) {
      gaps.push({
        category: 'Meta-Work Drift',
        gap: metaDrift,
        evidence: `${commitAnalysis.workPatterns.driftSignals.length} drift signals in ${commitAnalysis.totalCommits} commits`,
        impact: 'Working on the system instead of with the system',
        liability: 'Infinite recursion risk'
      });
    }
    
    console.log(`  📊 Identified ${gaps.length} credible gaps`);
    gaps.forEach((gap, i) => {
      console.log(`  ${i + 1}. ${gap.category}: ${(gap.gap * 100).toFixed(1)}% gap`);
      console.log(`     Evidence: ${gap.evidence}`);
    });
    
    return gaps;
  }

  /**
   * Calculate substantiated Trust Debt based on evidence
   */
  calculateSubstantiatedTrustDebt(gaps) {
    console.log('\n💰 CALCULATING SUBSTANTIATED TRUST DEBT');
    
    let total = 0;
    const components = [];
    const substantiation = [];
    
    const baseMultiplier = 100; // Conservative base unit
    const timeMultiplier = this.analysisWindow; // 7 days
    
    gaps.forEach(gap => {
      // Conservative calculation: Gap² × Base × Time × Evidence Weight
      const evidenceWeight = this.getEvidenceWeight(gap);
      const component = Math.pow(gap.gap, 2) * baseMultiplier * timeMultiplier * evidenceWeight;
      
      components.push({
        category: gap.category,
        gap: gap.gap,
        evidenceWeight,
        contribution: component,
        evidence: gap.evidence
      });
      
      total += component;
      
      substantiation.push({
        claim: `${gap.category}: ${(gap.gap * 100).toFixed(1)}% gap`,
        evidence: gap.evidence,
        impact: gap.impact,
        liability: gap.liability,
        calculation: `${gap.gap.toFixed(3)}² × ${baseMultiplier} × ${timeMultiplier} × ${evidenceWeight} = ${component.toFixed(0)} units`
      });
      
      console.log(`  ${gap.category}: ${component.toFixed(0)} units`);
      console.log(`    Formula: ${gap.gap.toFixed(3)}² × ${baseMultiplier} × ${timeMultiplier} × ${evidenceWeight}`);
      console.log(`    Evidence: ${gap.evidence}`);
    });
    
    console.log(`  ─────────────────────────────`);
    console.log(`  TOTAL SUBSTANTIATED: ${total.toFixed(0)} units`);
    
    return {
      total: Math.round(total),
      components,
      substantiation,
      methodology: 'Evidence-based calculation using actual commit analysis and documentation review'
    };
  }

  /**
   * Get evidence weight based on how concrete the evidence is
   */
  getEvidenceWeight(gap) {
    // Higher weight for more concrete, measurable evidence
    if (gap.evidence.includes('commits') || gap.evidence.includes('files')) {
      return 3.0; // High confidence - based on actual code changes
    } else if (gap.evidence.includes('vs') || gap.evidence.includes('ratio')) {
      return 2.0; // Medium confidence - comparative evidence  
    } else {
      return 1.0; // Base confidence - qualitative evidence
    }
  }
}

// Export for use in other scripts
module.exports = { CredibleTrustDebtCalculator };

// Run if called directly
if (require.main === module) {
  const calculator = new CredibleTrustDebtCalculator();
  
  calculator.calculateCredibleTrustDebt().then(result => {
    // Save results
    fs.writeFileSync(
      'trust-debt-credible-analysis.json',
      JSON.stringify(result, null, 2)
    );
    
    console.log('\n✅ Credible Trust Debt analysis complete!');
    console.log(`📊 Final Score: ${result.score} units (evidence-based)`);
    console.log('📁 Results saved to trust-debt-credible-analysis.json');
    
    if (result.score > 500) {
      console.log('\n🚨 WARNING: Trust Debt exceeds credible threshold');
      console.log('   Recommendation: Focus on delivery over measurement');
    }
    
  }).catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}