#!/usr/bin/env node

console.log('Test script starting...');

try {
    console.log('Loading module...');
    const { TrustDebtCalculator, generateHTML } = require('./src/trust-debt-final.js');
    
    console.log('Creating calculator...');
    const calculator = new TrustDebtCalculator();
    
    console.log('Running analysis...');
    const results = calculator.analyze();
    
    console.log('Analysis complete!');
    console.log('Total debt:', results.totalDebt);
    console.log('Intent cells:', Object.keys(results.intentMatrix).length);
    console.log('Reality cells:', Object.keys(results.realityMatrix).length);
    
} catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
}