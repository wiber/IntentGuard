#!/usr/bin/env node

/**
 * Trust Debt Claude Category Extractor
 * 
 * Uses Claude to extract orthogonal categories that cover the intent space
 * Based on ShortLex hierarchy and FIM patent principles
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ClaudeCategoryExtractor {
  constructor() {
    this.projectRoot = execSync('git rev-parse --show-toplevel').toString().trim();
    this.settingsFile = path.join(this.projectRoot, 'trust-debt-settings.json');
    this.cacheDir = path.join(this.projectRoot, '.trust-debt-cache');
    
    // Load settings
    this.settings = JSON.parse(fs.readFileSync(this.settingsFile, 'utf8'));
    
    // Ensure cache directory exists
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Load and prepare documents for Claude
   */
  loadDocuments() {
    const documents = [];
    for (const [key, doc] of Object.entries(this.settings.documents.tracked)) {
      const docPath = path.join(this.projectRoot, doc.path);
      if (fs.existsSync(docPath)) {
        let content = fs.readFileSync(docPath, 'utf8');
        
        // Extract key sections for each document type
        if (key === 'patent_v16') {
          // Extract claims section
          const claimsMatch = content.match(/CLAIMS[\s\S]{0,3000}/);
          if (claimsMatch) content = claimsMatch[0];
        } else if (key === 'mvpSpec') {
          // Extract core problem and solution
          const mvpMatch = content.match(/Core Problem[\s\S]{0,2000}|Solution[\s\S]{0,2000}/);
          if (mvpMatch) content = mvpMatch[0];
        } else {
          // Limit other docs to first 1500 chars
          content = content.substring(0, 1500);
        }
        
        documents.push({
          name: key,
          weight: doc.weight,
          description: doc.description,
          content: content
        });
      }
    }
    return documents;
  }

  /**
   * Extract orthogonal categories using Claude
   */
  async extractCategories() {
    console.log('\n🤖 Extracting orthogonal categories with Claude...');
    
    const documents = this.loadDocuments();
    
    // Create a carefully formatted prompt
    const promptParts = [
      "You are analyzing Trust Debt intent documents to extract orthogonal categories.",
      "",
      "CRITICAL REQUIREMENTS:",
      "1. Categories MUST be mutually orthogonal (correlation < 0.1)",
      "2. Categories MUST cover the entire intent space (no gaps)",
      "3. Use ShortLex hierarchy symbols: O (outcome), Α Β Γ Δ Ε (Greek for factors)",
      "4. Focus on MVP forcing function: carrot/stick accountability, trade-off matrix, measurement",
      "",
      "DOCUMENTS TO ANALYZE:",
      ""
    ];
    
    // Add document summaries
    for (const doc of documents) {
      promptParts.push(`[${doc.name}] Weight: ${doc.weight} - ${doc.description}`);
      promptParts.push(doc.content.substring(0, 500) + '...');
      promptParts.push("");
    }
    
    promptParts.push("Based on these documents, extract 5-7 orthogonal categories that:");
    promptParts.push("- Are truly independent (test: changing one doesn't affect others)");
    promptParts.push("- Cover the complete intent space from the documents");
    promptParts.push("- Map to the MVP forcing function goals");
    promptParts.push("");
    promptParts.push("Return ONLY a JSON array of categories:");
    promptParts.push('[');
    promptParts.push('  {"name": "CategoryName", "weight": 0.20, "description": "...", "symbol": "O", "depth": 1, "orthogonal_test": "How it\'s independent"},');
    promptParts.push('  ...');
    promptParts.push(']');
    
    const prompt = promptParts.join('\n');
    
    // Save prompt to file for Claude to read
    const promptFile = path.join(this.cacheDir, 'claude-prompt.txt');
    fs.writeFileSync(promptFile, prompt);
    
    try {
      // Use Claude with file input to avoid escaping issues
      console.log('  📝 Sending prompt to Claude...');
      const response = execSync(`cat "${promptFile}" | claude --print`, {
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 10
      });
      
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const categories = JSON.parse(jsonMatch[0]);
        
        // Validate orthogonality
        console.log('  🔍 Validating orthogonality...');
        const validated = this.validateOrthogonality(categories);
        
        // Save to cache
        const cacheData = {
          timestamp: new Date().toISOString(),
          source: 'claude',
          prompt_hash: this.hashString(prompt),
          categories: validated
        };
        
        fs.writeFileSync(
          path.join(this.cacheDir, 'categories.json'),
          JSON.stringify(cacheData, null, 2)
        );
        
        console.log(`  ✓ Extracted ${validated.length} orthogonal categories`);
        return validated;
      } else {
        throw new Error('No valid JSON in Claude response');
      }
    } catch (error) {
      console.error('  ⚠️ Claude extraction failed:', error.message);
      
      // Fallback to default MVP categories
      return this.getDefaultCategories();
    }
  }

  /**
   * Validate that categories are truly orthogonal
   */
  validateOrthogonality(categories) {
    // Check for overlap in descriptions and names
    const validated = [];
    const usedConcepts = new Set();
    const usedNames = new Set();
    
    for (const cat of categories) {
      // Ensure unique names (case-insensitive)
      const normalizedName = cat.name.toLowerCase();
      if (usedNames.has(normalizedName)) {
        console.log(`    ⚠️ Duplicate category name: "${cat.name}" - renaming`);
        // Try to disambiguate based on description
        if (cat.description.includes('quantification')) {
          cat.name = 'Quantification';
        } else if (cat.description.includes('position-meaning')) {
          cat.name = 'PositionMeaning';
        } else {
          cat.name = `${cat.name}_${validated.length + 1}`;
        }
      }
      
      const concepts = cat.description.toLowerCase().split(/\s+/);
      let isOrthogonal = true;
      
      // Check if any key concepts overlap
      for (const concept of concepts) {
        if (concept.length > 4 && usedConcepts.has(concept)) {
          console.log(`    ⚠️ Category "${cat.name}" overlaps on concept: ${concept}`);
          isOrthogonal = false;
          break;
        }
      }
      
      if (isOrthogonal) {
        validated.push(cat);
        usedNames.add(cat.name.toLowerCase());
        concepts.forEach(c => {
          if (c.length > 4) usedConcepts.add(c);
        });
      }
    }
    
    // Ensure we have at least 5 categories
    if (validated.length < 5) {
      const defaults = this.getDefaultCategories();
      for (const def of defaults) {
        if (validated.length >= 7) break;
        if (!validated.find(v => v.name === def.name)) {
          validated.push(def);
        }
      }
    }
    
    return validated;
  }

  /**
   * Get default MVP-focused categories
   */
  getDefaultCategories() {
    return [
      {
        name: "ForcingFunction",
        weight: 0.25,
        description: "Carrot and stick accountability mechanisms",
        symbol: "O",
        depth: 1,
        orthogonal_test: "Independent of how we visualize or measure"
      },
      {
        name: "Visualization",
        weight: 0.20,
        description: "Matrix displays and graph representations",
        symbol: "Α",
        depth: 1,
        orthogonal_test: "Independent of what we measure or enforce"
      },
      {
        name: "Measurement",
        weight: 0.20,
        description: "Trust Debt quantification and scoring",
        symbol: "Β",
        depth: 1,
        orthogonal_test: "Independent of how we display or enforce"
      },
      {
        name: "Alignment",
        weight: 0.15,
        description: "Intent versus reality comparison",
        symbol: "Γ",
        depth: 1,
        orthogonal_test: "Independent of specific implementations"
      },
      {
        name: "Documentation",
        weight: 0.10,
        description: "Specifications and architectural plans",
        symbol: "Δ",
        depth: 1,
        orthogonal_test: "Independent of execution or display"
      },
      {
        name: "Implementation",
        weight: 0.10,
        description: "Code commits and actual work",
        symbol: "Ε",
        depth: 1,
        orthogonal_test: "Independent of planning or visualization"
      }
    ];
  }

  /**
   * Simple hash function for cache invalidation
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  /**
   * Main execution
   */
  async run() {
    console.log('🎯 Claude Category Extraction for Trust Debt');
    console.log('═══════════════════════════════════════════');
    
    const categories = await this.extractCategories();
    
    console.log('\n📊 Extracted Categories:');
    console.log('───────────────────────');
    
    for (const cat of categories) {
      console.log(`${cat.symbol} ${cat.name} (${(cat.weight * 100).toFixed(0)}%)`);
      console.log(`  ${cat.description}`);
      console.log(`  Orthogonal: ${cat.orthogonal_test || 'Yes'}`);
    }
    
    console.log('\n✅ Categories saved to:', path.join(this.cacheDir, 'categories.json'));
    
    return categories;
  }
}

// Run if called directly
if (require.main === module) {
  const extractor = new ClaudeCategoryExtractor();
  extractor.run().catch(error => {
    console.error('Extraction failed:', error);
    process.exit(1);
  });
}

module.exports = ClaudeCategoryExtractor;