#!/usr/bin/env node

/**
 * Trust Debt Document Tracker
 * Loads and analyzes key documents to extract intent signals
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

class TrustDebtDocumentTracker {
  constructor(settings) {
    this.settings = settings;
    this.documents = new Map();
    this.cache = new Map();
    this.projectRoot = execSync('git rev-parse --show-toplevel').toString().trim();
  }

  async loadAllDocuments() {
    console.log('\n📚 Loading tracked documents...');
    const results = {};
    
    // Load tracked documents from settings
    for (const [key, doc] of Object.entries(this.settings.documents.tracked)) {
      const fullPath = path.join(this.projectRoot, doc.path);
      if (fs.existsSync(fullPath)) {
        console.log(`  📄 Loading ${key}...`);
        results[key] = await this.loadDocument(fullPath, key);
      } else {
        console.log(`  ⚠️  Skipping ${key} (not found)`);
      }
    }
    
    return results;
  }

  async loadDocument(filePath, type) {
    const content = fs.readFileSync(filePath, 'utf8');
    const hash = crypto.createHash('md5').update(content).digest('hex');
    
    // Check cache
    if (this.cache.has(hash)) {
      return this.cache.get(hash);
    }
    
    const doc = {
      path: filePath,
      type: type,
      content: content,
      hash: hash,
      lastModified: fs.statSync(filePath).mtime,
      sections: this.extractSections(content, type),
      signals: this.extractIntentSignals(content, type),
      categories: this.extractCategories(content),
      weight: this.settings.documents.tracked[type]?.weight || 0.1,
      stats: {
        size: content.length,
        lines: content.split('\n').length,
        words: content.split(/\s+/).length
      }
    };
    
    this.documents.set(filePath, doc);
    this.cache.set(hash, doc);
    
    return doc;
  }

  extractSections(content, type) {
    const sections = {};
    
    // Extract markdown sections
    const headingRegex = /^(#{1,3})\s+(.+)$/gm;
    let match;
    const headings = [];
    
    while ((match = headingRegex.exec(content)) !== null) {
      headings.push({
        level: match[1].length,
        title: match[2],
        position: match.index
      });
    }
    
    // Group content by sections
    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      const nextHeading = headings[i + 1];
      const endPosition = nextHeading ? nextHeading.position : content.length;
      
      const sectionContent = content.slice(heading.position, endPosition);
      const sectionKey = this.normalizeCategory(heading.title);
      
      sections[sectionKey] = {
        title: heading.title,
        level: heading.level,
        content: sectionContent,
        weight: this.calculateSectionWeight(sectionContent)
      };
    }
    
    return sections;
  }

  extractIntentSignals(content, type) {
    const signals = {
      trust: 0,
      timing: 0,
      recognition: 0,
      categories: {},
      keywords: {}
    };
    
    // Define pattern sets for different intent types
    const patterns = {
      trust: {
        regex: /\b(trust|debt|reliable|stable|secure|quality|measure|quantif|metric|score|liability|risk|integrity)\b/gi,
        weight: 1.0
      },
      timing: {
        regex: /\b(timing|speed|fast|quick|30.second|immediate|urgent|precision|latency|performance|efficient)\b/gi,
        weight: 1.0
      },
      recognition: {
        regex: /\b(recognition|insight|breakthrough|pattern|discover|oh.moment|aha|realize|understand|clarity)\b/gi,
        weight: 1.0
      },
      implementation: {
        regex: /\b(implement|code|build|develop|create|fix|refactor|test|deploy)\b/gi,
        weight: 0.8
      },
      documentation: {
        regex: /\b(document|spec|plan|design|architect|strategy|requirement|story)\b/gi,
        weight: 0.7
      }
    };
    
    // Count matches for each pattern
    for (const [key, pattern] of Object.entries(patterns)) {
      const matches = content.match(pattern.regex) || [];
      const rawCount = matches.length;
      
      // Normalize by document length (per 1000 words)
      const normalizedCount = (rawCount / (content.split(/\s+/).length / 1000));
      
      if (key === 'trust' || key === 'timing' || key === 'recognition') {
        signals[key] = normalizedCount * pattern.weight;
      } else {
        signals.categories[key] = normalizedCount * pattern.weight;
      }
      
      // Track actual keywords found
      if (rawCount > 0) {
        signals.keywords[key] = [...new Set(matches.map(m => m.toLowerCase()))];
      }
    }
    
    // Extract custom categories from ShortLex patterns if present
    const shortlexPattern = /([OΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψω])[^\s]*\s+([^\n]+)/g;
    let shortlexMatch;
    
    while ((shortlexMatch = shortlexPattern.exec(content)) !== null) {
      const symbol = shortlexMatch[1];
      const name = this.normalizeCategory(shortlexMatch[2]);
      signals.categories[name] = { symbol, weight: 1.0 };
    }
    
    return signals;
  }

  extractCategories(content) {
    const categories = new Set();
    
    // Extract from headings
    const headings = content.match(/^#{1,3}\s+(.+)$/gm) || [];
    for (const heading of headings) {
      const text = heading.replace(/^#{1,3}\s+/, '').trim();
      
      // Skip very short or very long headings
      if (text.length > 2 && text.length < 50) {
        // Extract key phrases
        const normalized = this.normalizeCategory(text);
        if (this.isValidCategory(normalized)) {
          categories.add(normalized);
        }
      }
    }
    
    // Extract from emphasized lists
    const emphasisPattern = /^\s*[\*\-]\s+\*\*([^*]+)\*\*/gm;
    let emphasisMatch;
    
    while ((emphasisMatch = emphasisPattern.exec(content)) !== null) {
      const text = emphasisMatch[1].trim();
      if (text.length > 2 && text.length < 30) {
        const normalized = this.normalizeCategory(text);
        if (this.isValidCategory(normalized)) {
          categories.add(normalized);
        }
      }
    }
    
    // Extract from definition patterns (e.g., "Security: ...")
    const definitionPattern = /^([A-Z][a-zA-Z\s]+):\s/gm;
    let defMatch;
    
    while ((defMatch = definitionPattern.exec(content)) !== null) {
      const text = defMatch[1].trim();
      if (text.length > 2 && text.length < 30) {
        const normalized = this.normalizeCategory(text);
        if (this.isValidCategory(normalized)) {
          categories.add(normalized);
        }
      }
    }
    
    return Array.from(categories);
  }

  normalizeCategory(text) {
    // Convert to PascalCase for ShortLex sorting
    return text
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special chars
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  isValidCategory(category) {
    // Filter out common non-category words
    const blacklist = [
      'The', 'And', 'Or', 'But', 'For', 'With', 'From', 'Into',
      'Overview', 'Introduction', 'Conclusion', 'Summary', 'References'
    ];
    
    return !blacklist.includes(category) && 
           category.length > 2 && 
           category.length < 30 &&
           /^[A-Z]/.test(category); // Must start with capital
  }

  calculateSectionWeight(content) {
    let weight = 1.0;
    
    // Weight based on content length
    const length = content.length;
    if (length > 2000) weight *= 1.2;
    if (length > 5000) weight *= 1.3;
    
    // Weight based on list items
    const listItems = (content.match(/^\s*[\*\-]\s+/gm) || []).length;
    if (listItems > 5) weight *= 1.1;
    if (listItems > 10) weight *= 1.2;
    
    // Weight based on code blocks
    const codeBlocks = (content.match(/```[\s\S]*?```/g) || []).length;
    if (codeBlocks > 0) weight *= 1.1;
    
    // Weight based on emphasis
    const emphasis = (content.match(/\*\*[^*]+\*\*/g) || []).length;
    if (emphasis > 3) weight *= 1.1;
    
    return Math.min(2.0, weight); // Cap at 2x
  }

  async getConsolidatedIntent() {
    const documents = await this.loadAllDocuments();
    const consolidated = {
      trust: 0,
      timing: 0,
      recognition: 0,
      categories: [],
      customCategories: {},
      keywords: {},
      totalWeight: 0
    };
    
    let totalWeight = 0;
    
    for (const [key, doc] of Object.entries(documents)) {
      const weight = doc.weight || 0.1;
      
      // Aggregate intent signals
      consolidated.trust += (doc.signals.trust || 0) * weight;
      consolidated.timing += (doc.signals.timing || 0) * weight;
      consolidated.recognition += (doc.signals.recognition || 0) * weight;
      
      // Merge categories
      for (const cat of doc.categories) {
        if (!consolidated.categories.includes(cat)) {
          consolidated.categories.push(cat);
        }
      }
      
      // Merge custom categories
      Object.assign(consolidated.customCategories, doc.signals.categories || {});
      
      // Merge keywords
      for (const [type, words] of Object.entries(doc.signals.keywords || {})) {
        if (!consolidated.keywords[type]) {
          consolidated.keywords[type] = [];
        }
        consolidated.keywords[type].push(...words);
      }
      
      totalWeight += weight;
    }
    
    // Normalize weighted values
    if (totalWeight > 0) {
      consolidated.trust /= totalWeight;
      consolidated.timing /= totalWeight;
      consolidated.recognition /= totalWeight;
    }
    
    // Deduplicate keywords
    for (const type of Object.keys(consolidated.keywords)) {
      consolidated.keywords[type] = [...new Set(consolidated.keywords[type])];
    }
    
    consolidated.totalWeight = totalWeight;
    
    return consolidated;
  }

  generateSummary() {
    console.log('\n📊 Document Analysis Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    let totalSections = 0;
    let totalCategories = 0;
    let totalSignals = { trust: 0, timing: 0, recognition: 0 };
    
    for (const [path, doc] of this.documents) {
      console.log(`\n📄 ${doc.type}:`);
      console.log(`   Sections: ${Object.keys(doc.sections).length}`);
      console.log(`   Categories: ${doc.categories.length}`);
      console.log(`   Intent Signals:`);
      console.log(`     Trust: ${doc.signals.trust.toFixed(2)}`);
      console.log(`     Timing: ${doc.signals.timing.toFixed(2)}`);
      console.log(`     Recognition: ${doc.signals.recognition.toFixed(2)}`);
      
      totalSections += Object.keys(doc.sections).length;
      totalCategories += doc.categories.length;
      totalSignals.trust += doc.signals.trust;
      totalSignals.timing += doc.signals.timing;
      totalSignals.recognition += doc.signals.recognition;
    }
    
    console.log('\n📈 Totals:');
    console.log(`   Documents: ${this.documents.size}`);
    console.log(`   Sections: ${totalSections}`);
    console.log(`   Categories: ${totalCategories}`);
    console.log(`   Average Signals:`);
    console.log(`     Trust: ${(totalSignals.trust / this.documents.size).toFixed(2)}`);
    console.log(`     Timing: ${(totalSignals.timing / this.documents.size).toFixed(2)}`);
    console.log(`     Recognition: ${(totalSignals.recognition / this.documents.size).toFixed(2)}`);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}

// Run if called directly
if (require.main === module) {
  const SettingsManager = require('./trust-debt-settings-manager');
  
  (async () => {
    const settingsManager = new SettingsManager();
    const settings = await settingsManager.load();
    
    const tracker = new TrustDebtDocumentTracker(settings);
    const documents = await tracker.loadAllDocuments();
    
    tracker.generateSummary();
    
    const consolidated = await tracker.getConsolidatedIntent();
    console.log('\n🎯 Consolidated Intent:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Trust: ${consolidated.trust.toFixed(2)}`);
    console.log(`Timing: ${consolidated.timing.toFixed(2)}`);
    console.log(`Recognition: ${consolidated.recognition.toFixed(2)}`);
    console.log(`\nTop Categories: ${consolidated.categories.slice(0, 10).join(', ')}`);
    console.log(`\nKeywords Found:`);
    for (const [type, words] of Object.entries(consolidated.keywords)) {
      console.log(`  ${type}: ${words.slice(0, 5).join(', ')}${words.length > 5 ? '...' : ''}`);
    }
  })();
}

module.exports = TrustDebtDocumentTracker;