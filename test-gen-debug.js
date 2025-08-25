#!/usr/bin/env node

console.log('Debug script starting...');

const fs = require('fs');
const path = require('path');

// Directly run the main function code
console.log('🎯 TRUST DEBT FINAL - DETERMINISTIC');
console.log('=====================================');

const { TrustDebtCalculator, generateHTML } = require('./src/trust-debt-final.js');

console.log('Creating calculator...');
const calculator = new TrustDebtCalculator();

console.log('Running analyze...');
const results = calculator.analyze();

console.log('Analysis complete!');
console.log('Total debt:', results.totalDebt);

// Generate outputs
console.log('Generating HTML...');
const html = generateHTML(calculator, results);

console.log('Writing HTML file...');
fs.writeFileSync('trust-debt-final.html', html);

console.log('Creating JSON...');
const json = {
    metadata: {
        generated: new Date().toISOString(),
        totalFiles: Object.keys(calculator.gitFiles).length,
        totalDocs: 43,  // Updated count
        categories: calculator.categories.length
    },
    results: results,
    categories: calculator.categories,
    intentMatrix: calculator.intentMatrix,
    realityMatrix: calculator.realityMatrix
};

console.log('Writing JSON file...');
fs.writeFileSync('trust-debt-final.json', JSON.stringify(json, null, 2));

console.log('\n✅ TRUST DEBT REPORT GENERATED with 43 documentation files!');
console.log('  Total debt:', results.totalDebt);
console.log('  HTML: trust-debt-final.html');
console.log('  JSON: trust-debt-final.json');