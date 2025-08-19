#!/usr/bin/env node

/**
 * Trust Debt Intent Manager
 * Manage and update intent vectors for Trust Debt analysis
 * Usage: node trust-debt-intent-manager.js [command] [options]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TrustDebtIntentManager {
  constructor() {
    this.projectRoot = execSync('git rev-parse --show-toplevel').toString().trim();
    this.intentFile = path.join(this.projectRoot, 'trust-debt-intent-vectors.json');
    this.loadIntent();
  }

  /**
   * Load current intent vectors
   */
  loadIntent() {
    if (fs.existsSync(this.intentFile)) {
      this.data = JSON.parse(fs.readFileSync(this.intentFile, 'utf8'));
    } else {
      // Initialize with defaults
      this.data = {
        version: '1.0',
        primary: {
          id: 'main',
          name: 'Primary Architecture Intent',
          vector: {
            trust: 0.35,
            timing: 0.35,
            recognition: 0.30
          },
          confidence: 0.85,
          lastUpdated: new Date().toISOString(),
          source: 'CLAUDE.md core values',
          rationale: 'Core product vision: Strategic Nudges via Un-Robocall with 30% acceleration promise'
        },
        contexts: [],
        history: [],
        metadata: {
          lastRefinement: new Date().toISOString(),
          refinementSource: 'manual',
          shortlexSync: false,
          autoRefine: false
        }
      };
    }
  }

  /**
   * Save intent vectors
   */
  saveIntent() {
    fs.writeFileSync(this.intentFile, JSON.stringify(this.data, null, 2));
  }

  /**
   * Display current intent
   */
  show() {
    console.log('\n📊 Current Intent Vectors');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const primary = this.data.primary;
    console.log('\n🎯 Primary Intent:');
    console.log(`  Source: ${primary.source}`);
    console.log(`  Confidence: ${(primary.confidence * 100).toFixed(0)}%`);
    console.log(`  Last Updated: ${new Date(primary.lastUpdated).toLocaleString()}`);
    console.log('\n  Vector Distribution:');
    console.log(`    🏛️  Trust:       ${(primary.vector.trust * 100).toFixed(0)}%`);
    console.log(`    ⏰  Timing:      ${(primary.vector.timing * 100).toFixed(0)}%`);
    console.log(`    💡  Recognition: ${(primary.vector.recognition * 100).toFixed(0)}%`);
    console.log(`\n  Rationale: ${primary.rationale}`);
    
    if (this.data.contexts && this.data.contexts.length > 0) {
      console.log('\n📁 Context-Specific Intents:');
      for (const ctx of this.data.contexts) {
        console.log(`\n  ${ctx.id} (${ctx.pattern}):`);
        console.log(`    Trust: ${(ctx.vector.trust * 100).toFixed(0)}%, Timing: ${(ctx.vector.timing * 100).toFixed(0)}%, Recognition: ${(ctx.vector.recognition * 100).toFixed(0)}%`);
        console.log(`    Confidence: ${(ctx.confidence * 100).toFixed(0)}% | ${ctx.rationale}`);
      }
    }
    
    if (this.data.history && this.data.history.length > 0) {
      console.log('\n📜 Recent History:');
      const recent = this.data.history.slice(-5);
      for (const entry of recent) {
        const delta = entry.delta;
        const changes = [];
        if (delta.trust !== 0) changes.push(`Trust ${delta.trust > 0 ? '+' : ''}${(delta.trust * 100).toFixed(0)}%`);
        if (delta.timing !== 0) changes.push(`Timing ${delta.timing > 0 ? '+' : ''}${(delta.timing * 100).toFixed(0)}%`);
        if (delta.recognition !== 0) changes.push(`Recognition ${delta.recognition > 0 ? '+' : ''}${(delta.recognition * 100).toFixed(0)}%`);
        
        console.log(`  ${new Date(entry.timestamp).toLocaleDateString()} - ${entry.trigger}`);
        if (changes.length > 0) {
          console.log(`    Changes: ${changes.join(', ')}`);
        }
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * Update primary intent vector
   */
  update(trust, timing, recognition, source = 'manual update', rationale = 'User-specified adjustment') {
    // Normalize to ensure they sum to 1
    const total = trust + timing + recognition;
    const normalized = {
      trust: trust / total,
      timing: timing / total,
      recognition: recognition / total
    };
    
    // Store previous for history
    const previous = { ...this.data.primary.vector };
    
    // Update primary
    this.data.primary.vector = normalized;
    this.data.primary.source = source;
    this.data.primary.rationale = rationale;
    this.data.primary.lastUpdated = new Date().toISOString();
    
    // Add to history
    if (!this.data.history) this.data.history = [];
    this.data.history.push({
      timestamp: new Date().toISOString(),
      vector: { ...normalized },
      trigger: source,
      delta: {
        trust: normalized.trust - previous.trust,
        timing: normalized.timing - previous.timing,
        recognition: normalized.recognition - previous.recognition
      }
    });
    
    // Keep only last 50 history entries
    if (this.data.history.length > 50) {
      this.data.history = this.data.history.slice(-50);
    }
    
    this.saveIntent();
    
    console.log('\n✅ Intent Updated Successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🎯 New Intent Vector:');
    console.log(`  Trust:       ${(normalized.trust * 100).toFixed(0)}%`);
    console.log(`  Timing:      ${(normalized.timing * 100).toFixed(0)}%`);
    console.log(`  Recognition: ${(normalized.recognition * 100).toFixed(0)}%`);
    console.log(`\n  Source: ${source}`);
    console.log(`  Rationale: ${rationale}`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * Analyze CLAUDE.md for intent signals
   */
  async analyzeSpec() {
    const claudeMd = path.join(this.projectRoot, 'CLAUDE.md');
    if (!fs.existsSync(claudeMd)) {
      console.error('❌ CLAUDE.md not found');
      return;
    }
    
    const content = fs.readFileSync(claudeMd, 'utf8');
    
    // Count keyword occurrences
    const patterns = {
      trust: /trust|reliable|stable|quality|consistent|measure|quantif/gi,
      timing: /timing|speed|fast|quick|30.second|precision|immediate|instant/gi,
      recognition: /recognition|oh.moment|insight|breakthrough|pattern|discover/gi
    };
    
    const counts = {
      trust: (content.match(patterns.trust) || []).length,
      timing: (content.match(patterns.timing) || []).length,
      recognition: (content.match(patterns.recognition) || []).length
    };
    
    const total = counts.trust + counts.timing + counts.recognition;
    
    if (total === 0) {
      console.log('⚠️ No intent signals found in CLAUDE.md');
      return;
    }
    
    const suggested = {
      trust: counts.trust / total,
      timing: counts.timing / total,
      recognition: counts.recognition / total
    };
    
    console.log('\n📄 CLAUDE.md Analysis');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 Keyword Counts:');
    console.log(`  Trust keywords:       ${counts.trust}`);
    console.log(`  Timing keywords:      ${counts.timing}`);
    console.log(`  Recognition keywords: ${counts.recognition}`);
    console.log('\n🎯 Suggested Intent Vector:');
    console.log(`  Trust:       ${(suggested.trust * 100).toFixed(0)}%`);
    console.log(`  Timing:      ${(suggested.timing * 100).toFixed(0)}%`);
    console.log(`  Recognition: ${(suggested.recognition * 100).toFixed(0)}%`);
    
    console.log('\n🔄 Current Intent Vector:');
    console.log(`  Trust:       ${(this.data.primary.vector.trust * 100).toFixed(0)}%`);
    console.log(`  Timing:      ${(this.data.primary.vector.timing * 100).toFixed(0)}%`);
    console.log(`  Recognition: ${(this.data.primary.vector.recognition * 100).toFixed(0)}%`);
    
    // Calculate difference
    const diff = {
      trust: suggested.trust - this.data.primary.vector.trust,
      timing: suggested.timing - this.data.primary.vector.timing,
      recognition: suggested.recognition - this.data.primary.vector.recognition
    };
    
    const maxDiff = Math.max(Math.abs(diff.trust), Math.abs(diff.timing), Math.abs(diff.recognition));
    
    if (maxDiff > 0.1) {
      console.log('\n⚠️ Significant difference detected (>10%)');
      console.log('Consider updating intent to match CLAUDE.md patterns');
      console.log('\nTo apply suggested values, run:');
      console.log(`  node ${path.basename(__filename)} update --trust ${(suggested.trust * 100).toFixed(0)} --timing ${(suggested.timing * 100).toFixed(0)} --recognition ${(suggested.recognition * 100).toFixed(0)} --source "CLAUDE.md analysis"`);
    } else {
      console.log('\n✅ Intent well-aligned with CLAUDE.md');
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * Run the manager
   */
  run() {
    const args = process.argv.slice(2);
    const command = args[0] || 'show';
    
    switch (command) {
      case 'show':
        this.show();
        break;
        
      case 'update':
        // Parse arguments
        let trust = 35, timing = 35, recognition = 30;
        let source = 'manual update';
        let rationale = 'User-specified adjustment';
        
        for (let i = 1; i < args.length; i++) {
          if (args[i] === '--trust' && args[i + 1]) {
            trust = parseFloat(args[i + 1]);
            i++;
          } else if (args[i] === '--timing' && args[i + 1]) {
            timing = parseFloat(args[i + 1]);
            i++;
          } else if (args[i] === '--recognition' && args[i + 1]) {
            recognition = parseFloat(args[i + 1]);
            i++;
          } else if (args[i] === '--source' && args[i + 1]) {
            source = args[i + 1];
            i++;
          } else if (args[i] === '--rationale' && args[i + 1]) {
            rationale = args[i + 1];
            i++;
          }
        }
        
        this.update(trust, timing, recognition, source, rationale);
        break;
        
      case 'analyze':
        this.analyzeSpec();
        break;
        
      case 'help':
      default:
        console.log('\n📚 Trust Debt Intent Manager');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\nUsage: node trust-debt-intent-manager.js [command] [options]');
        console.log('\nCommands:');
        console.log('  show                     Display current intent vectors');
        console.log('  update [options]         Update primary intent vector');
        console.log('  analyze                  Analyze CLAUDE.md for intent signals');
        console.log('  help                     Show this help message');
        console.log('\nUpdate Options:');
        console.log('  --trust <value>          Trust percentage (0-100)');
        console.log('  --timing <value>         Timing percentage (0-100)');
        console.log('  --recognition <value>    Recognition percentage (0-100)');
        console.log('  --source <text>          Source of the update');
        console.log('  --rationale <text>       Reason for the update');
        console.log('\nExamples:');
        console.log('  node trust-debt-intent-manager.js show');
        console.log('  node trust-debt-intent-manager.js update --trust 40 --timing 35 --recognition 25');
        console.log('  node trust-debt-intent-manager.js analyze');
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        break;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const manager = new TrustDebtIntentManager();
  manager.run();
}