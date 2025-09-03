#!/usr/bin/env node

console.log('Starting Trust Debt Analysis...');

try {
    const { TrustDebtCalculator, generateHTML } = require('./src/trust-debt-final.js');
    
    console.log('Creating calculator...');
    const calculator = new TrustDebtCalculator();
    
    console.log('Running analysis...');
    const results = calculator.calculate();
    
    console.log('\nRESULTS:');
    console.log('Total Trust Debt:', results.totalDebt);
    console.log('Upper Triangle (Git/Reality):', results.upperTriangleDebt || 'Not calculated');
    console.log('Lower Triangle (Docs/Intent):', results.lowerTriangleDebt || 'Not calculated');
    console.log('Asymmetry Debt:', results.asymmetryDebt || 'Not calculated');
    
    console.log('\nGenerating HTML report...');
    const html = generateHTML(results);
    
    const fs = require('fs');
    fs.writeFileSync('trust-debt-test.html', html);
    console.log('Report saved to trust-debt-test.html');
    
} catch (error) {
    console.error('ERROR:', error.message);
    console.error(error.stack);
}