#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function getAllMarkdownFiles() {
    const files = [];
    
    // Get all .md files in root directory
    const rootFiles = fs.readdirSync('.').filter(f => f.endsWith('.md'));
    rootFiles.forEach(file => {
        files.push({ path: file, category: 'root' });
    });
    
    // Get all .md files in docs directory
    if (fs.existsSync('docs')) {
        const walkDir = (dir, prefix = '') => {
            const items = fs.readdirSync(dir);
            items.forEach(item => {
                const fullPath = path.join(dir, item);
                const relativePath = prefix ? `${prefix}/${item}` : item;
                
                if (fs.statSync(fullPath).isDirectory()) {
                    walkDir(fullPath, relativePath);
                } else if (item.endsWith('.md')) {
                    files.push({ path: `docs/${relativePath}`, category: 'docs' });
                }
            });
        };
        walkDir('docs');
    }
    
    return files;
}

function categorizeDocumentation(files) {
    const categories = {
        critical: [],      // Algorithm and specification docs
        implementation: [], // Implementation and technical docs
        business: [],      // Business and product docs
        guides: [],        // User guides and tutorials
        other: []          // Everything else
    };
    
    files.forEach(file => {
        const name = file.path.toLowerCase();
        
        if (name.includes('algorithm') || name.includes('specification') || 
            name.includes('matrix') || name.includes('asymmet')) {
            categories.critical.push(file);
        } else if (name.includes('implementation') || name.includes('claude.md') ||
                   name.includes('drift') || name.includes('trust_debt')) {
            categories.implementation.push(file);
        } else if (name.includes('business') || name.includes('gtm') || 
                   name.includes('deck') || name.includes('commercial')) {
            categories.business.push(file);
        } else if (name.includes('readme') || name.includes('contributing') ||
                   name.includes('guide') || name.includes('setup')) {
            categories.guides.push(file);
        } else {
            categories.other.push(file);
        }
    });
    
    return categories;
}

function generateDocumentationConfig() {
    const allFiles = getAllMarkdownFiles();
    const categorized = categorizeDocumentation(allFiles);
    
    console.log('📚 Documentation Analysis\n');
    console.log('='.repeat(50));
    
    console.log('\n📊 Found Documentation Files:');
    console.log(`  Total: ${allFiles.length} files`);
    console.log(`  Critical: ${categorized.critical.length} files`);
    console.log(`  Implementation: ${categorized.implementation.length} files`);
    console.log(`  Business: ${categorized.business.length} files`);
    console.log(`  Guides: ${categorized.guides.length} files`);
    console.log(`  Other: ${categorized.other.length} files`);
    
    // Generate weighted configuration
    const docConfig = [];
    
    // Critical docs get highest weight
    categorized.critical.forEach(file => {
        docConfig.push({ 
            path: file.path, 
            weight: 0.15,
            category: 'critical'
        });
    });
    
    // Implementation docs get high weight
    categorized.implementation.forEach(file => {
        docConfig.push({ 
            path: file.path, 
            weight: 0.10,
            category: 'implementation'
        });
    });
    
    // Business docs get medium weight
    categorized.business.forEach(file => {
        docConfig.push({ 
            path: file.path, 
            weight: 0.05,
            category: 'business'
        });
    });
    
    // Guides get lower weight
    categorized.guides.forEach(file => {
        docConfig.push({ 
            path: file.path, 
            weight: 0.03,
            category: 'guides'
        });
    });
    
    // Other files get minimal weight
    categorized.other.forEach(file => {
        docConfig.push({ 
            path: file.path, 
            weight: 0.02,
            category: 'other'
        });
    });
    
    // Normalize weights to sum to 1.0
    const totalWeight = docConfig.reduce((sum, doc) => sum + doc.weight, 0);
    docConfig.forEach(doc => {
        doc.weight = (doc.weight / totalWeight).toFixed(4);
    });
    
    console.log('\n📝 Documentation Configuration:');
    console.log('```javascript');
    console.log('const documentation = [');
    docConfig.forEach((doc, i) => {
        const comma = i < docConfig.length - 1 ? ',' : '';
        console.log(`    { path: '${doc.path}', weight: ${doc.weight} }${comma}  // ${doc.category}`);
    });
    console.log('];');
    console.log('```');
    
    console.log('\n⚠️  Currently loaded in trust-debt-final.js: 9 files');
    console.log(`✅ Should be loading: ${allFiles.length} files`);
    
    console.log('\n🔧 To fix the generation script:');
    console.log('1. Update the documentation array in src/trust-debt-final.js');
    console.log('2. Include all critical algorithm and specification files');
    console.log('3. Re-run the generation to populate the upper triangle properly');
    
    return docConfig;
}

// Run the analysis
const config = generateDocumentationConfig();

// Save the configuration
const configPath = 'documentation-config.json';
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log(`\n💾 Configuration saved to ${configPath}`);