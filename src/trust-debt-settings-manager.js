#!/usr/bin/env node

/**
 * Trust Debt Settings Manager
 * Manages configuration and tracks key documents for Trust Debt analysis
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

class TrustDebtSettingsManager {
  constructor(settingsPath = null) {
    this.projectRoot = execSync('git rev-parse --show-toplevel').toString().trim();
    this.settingsPath = settingsPath || path.join(this.projectRoot, 'trust-debt-settings.json');
    this.settings = null;
    this.defaults = this.getDefaults();
  }

  getDefaults() {
    return {
      version: '1.0.0',
      lastModified: new Date().toISOString(),
      intentSphere: { 
        focus: 'all', 
        includeSubdivisions: true,
        maxDepth: 3
      },
      documents: { 
        tracked: {
          businessPlan: {
            path: 'docs/01-business/BUSINESS_PLAN.md',
            weight: 0.20,
            lastChecked: new Date().toISOString(),
            hash: ''
          },
          leanCanvas: {
            path: 'docs/01-business/LEAN_CANVAS.md', 
            weight: 0.15,
            lastChecked: new Date().toISOString(),
            hash: ''
          },
          patent: {
            path: 'docs/03-product/MVP/commitMVP.txt',
            weight: 0.25,
            lastChecked: new Date().toISOString(),
            hash: ''
          },
          spec: {
            path: 'CLAUDE.md',
            weight: 0.40,
            lastChecked: new Date().toISOString(),
            hash: ''
          }
        },
        autoRefresh: true,
        refreshInterval: 3600
      },
      shortlex: { 
        source: 'dynamic',
        maxCategories: 7, 
        minOrthogonality: 0.9 
      },
      calculation: { 
        commitWindow: 7, 
        decayRate: 0.85,
        commitWeight: 0.6,
        documentWeight: 0.4,
        specAgePenalty: 0.01
      },
      thresholds: { 
        trustDebt: { healthy: 100, warning: 200, critical: 300 },
        blankSpot: { minor: 0.3, major: 0.5, critical: 0.7 },
        correlation: { max: 0.1 },
        momentum: { low: 50, medium: 75, high: 90 }
      },
      cache: { 
        enabled: true, 
        ttl: 300,
        location: '.trust-debt-cache/'
      },
      claude: { 
        enabled: true, 
        fallbackToPattern: true 
      }
    };
  }

  async load() {
    try {
      if (fs.existsSync(this.settingsPath)) {
        console.log(`📄 Loading settings from: ${path.basename(this.settingsPath)}`);
        const content = fs.readFileSync(this.settingsPath, 'utf8');
        this.settings = JSON.parse(content);
        
        // Validate and update
        await this.validate();
        await this.checkDocumentUpdates();
        
        console.log(`✅ Settings loaded successfully`);
      } else {
        console.log('📝 Creating new settings file with defaults');
        this.settings = this.defaults;
        await this.discoverDocuments();
        await this.save();
        console.log(`✅ Settings file created: ${path.basename(this.settingsPath)}`);
      }
    } catch (error) {
      console.error('❌ Failed to load settings:', error.message);
      console.log('📝 Using default settings');
      this.settings = this.defaults;
    }
    return this.settings;
  }

  async discoverDocuments() {
    console.log('\n🔍 Discovering key documents...');
    
    // Try to find documents if they don't exist at default paths
    const patterns = {
      businessPlan: ['**/BUSINESS*.md', '**/business*.md', 'docs/**/*plan*.md'],
      leanCanvas: ['**/LEAN*.md', '**/canvas*.md', 'docs/**/*canvas*.md'],
      patent: ['**/commitMVP.txt', '**/PATENT*.md', '**/patent*.txt', 'docs/**/*patent*.md'],
      spec: ['CLAUDE.md', 'README.md', 'docs/SPEC.md']
    };
    
    for (const [type, searchPatterns] of Object.entries(patterns)) {
      const docConfig = this.settings.documents.tracked[type];
      
      // Check if default path exists
      const defaultPath = path.join(this.projectRoot, docConfig.path);
      if (fs.existsSync(defaultPath)) {
        console.log(`  ✓ ${type}: ${docConfig.path}`);
        continue;
      }
      
      // Search for alternative
      let found = false;
      for (const pattern of searchPatterns) {
        try {
          const files = execSync(`find . -name "${pattern.split('/').pop()}" -type f 2>/dev/null | head -1`, {
            cwd: this.projectRoot,
            encoding: 'utf8'
          }).trim();
          
          if (files) {
            const relativePath = files.replace('./', '');
            docConfig.path = relativePath;
            console.log(`  ✓ ${type}: Found at ${relativePath}`);
            found = true;
            break;
          }
        } catch (e) {
          // Continue searching
        }
      }
      
      if (!found) {
        console.log(`  ⚠️  ${type}: Not found (will use default path)`);
      }
    }
  }

  async validate() {
    // Validate numeric ranges
    if (this.settings.calculation.commitWindow < 1 || 
        this.settings.calculation.commitWindow > 30) {
      console.warn('⚠️  commitWindow must be between 1 and 30 days, using default');
      this.settings.calculation.commitWindow = 7;
    }

    // Validate file paths and update hashes
    for (const [key, doc] of Object.entries(this.settings.documents.tracked)) {
      const fullPath = path.join(this.projectRoot, doc.path);
      if (!fs.existsSync(fullPath)) {
        console.warn(`⚠️  Document not found: ${doc.path}`);
        doc.exists = false;
      } else {
        doc.exists = true;
      }
    }

    // Validate thresholds
    const { healthy, warning, critical } = this.settings.thresholds.trustDebt;
    if (!(healthy < warning && warning < critical)) {
      console.warn('⚠️  Invalid thresholds, using defaults');
      this.settings.thresholds.trustDebt = this.defaults.thresholds.trustDebt;
    }
  }

  async checkDocumentUpdates() {
    if (!this.settings.documents.autoRefresh) return;
    
    let updatesFound = false;

    for (const [key, doc] of Object.entries(this.settings.documents.tracked)) {
      const fullPath = path.join(this.projectRoot, doc.path);
      
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        const content = fs.readFileSync(fullPath, 'utf8');
        const hash = crypto.createHash('md5').update(content).digest('hex');
        
        if (hash !== doc.hash) {
          const oldHash = doc.hash || 'new';
          doc.lastChecked = new Date().toISOString();
          doc.hash = hash;
          doc.size = stats.size;
          doc.lines = content.split('\n').length;
          
          if (oldHash !== 'new') {
            console.log(`  📝 ${key} updated (${oldHash.substring(0, 8)} → ${hash.substring(0, 8)})`);
            updatesFound = true;
          }
        }
      }
    }
    
    if (updatesFound) {
      await this.save();
    }
  }

  async save() {
    this.settings.lastModified = new Date().toISOString();
    
    // Ensure directory exists
    const dir = path.dirname(this.settingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(
      this.settingsPath, 
      JSON.stringify(this.settings, null, 2)
    );
  }

  get(path) {
    const keys = path.split('.');
    let value = this.settings;
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) return null;
    }
    return value;
  }

  set(path, value) {
    const keys = path.split('.');
    let obj = this.settings;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    this.save();
  }

  getDocumentSummary() {
    const summary = [];
    console.log('\n📚 Tracked Documents:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    for (const [key, doc] of Object.entries(this.settings.documents.tracked)) {
      const status = doc.exists ? '✅' : '❌';
      const size = doc.size ? `${(doc.size / 1024).toFixed(1)}KB` : 'N/A';
      const lines = doc.lines || 'N/A';
      
      console.log(`\n${status} ${key}:`);
      console.log(`   Path: ${doc.path}`);
      console.log(`   Weight: ${(doc.weight * 100).toFixed(0)}%`);
      console.log(`   Size: ${size} | Lines: ${lines}`);
      if (doc.hash) {
        console.log(`   Hash: ${doc.hash.substring(0, 12)}...`);
      }
      
      summary.push({
        type: key,
        path: doc.path,
        weight: doc.weight,
        exists: doc.exists,
        hash: doc.hash
      });
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return summary;
  }

  ensureCacheDirectory() {
    const cacheDir = path.join(this.projectRoot, this.settings.cache.location);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
      console.log(`📁 Created cache directory: ${this.settings.cache.location}`);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const manager = new TrustDebtSettingsManager();
  
  const command = process.argv[2];
  
  (async () => {
    switch (command) {
      case '--check':
        await manager.load();
        manager.getDocumentSummary();
        break;
        
      case '--refresh':
        await manager.load();
        await manager.checkDocumentUpdates();
        console.log('✅ Documents refreshed');
        break;
        
      case '--init':
        manager.settings = manager.defaults;
        await manager.discoverDocuments();
        await manager.save();
        console.log('✅ Settings initialized');
        break;
        
      default:
        await manager.load();
        console.log(JSON.stringify(manager.settings, null, 2));
    }
  })();
}

module.exports = TrustDebtSettingsManager;