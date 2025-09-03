#!/usr/bin/env node

/**
 * Generate Trust Debt badges for README
 * Updates badge URLs based on latest trust-debt-final.json
 */

const fs = require('fs');
const path = require('path');

// Try to read the latest trust-debt-final.json
let trustDebtData;
try {
    trustDebtData = JSON.parse(
        fs.readFileSync('trust-debt-final.json', 'utf8')
    );
} catch (error) {
    console.log('No trust-debt-final.json found, using defaults');
    trustDebtData = {
        summary: {
            totalTrustDebt: 342,
            orthogonality: 0.87,
            asymmetryRatio: 2.3,
            coldSpotPercentage: 14
        }
    };
}

// Extract key metrics - using the TRUE Trust Debt calculation
const upperTriangle = Math.round(trustDebtData.metrics?.upperTriangleDebt * 100 || 5458);
const lowerTriangle = Math.round(trustDebtData.metrics?.lowerTriangleDebt * 100 || 6385);
const trueTrustDebt = Math.abs(upperTriangle - lowerTriangle);
const orthogonality = Math.round((trustDebtData.metrics?.orthogonality || 0.11) * 100);
const asymmetry = (trustDebtData.metrics?.asymmetryRatio || 5.2).toFixed(1);

// Determine grade based on Trust Debt
function getGrade(debt) {
    if (debt < 100) return 'A+';
    if (debt < 200) return 'A';
    if (debt < 300) return 'B+';
    if (debt < 500) return 'B';
    if (debt < 800) return 'C';
    if (debt < 1200) return 'D';
    return 'F';
}

// Determine colors for badges
function getDebtColor(debt) {
    if (debt < 200) return 'brightgreen';
    if (debt < 500) return 'green';
    if (debt < 800) return 'yellow';
    if (debt < 1200) return 'orange';
    return 'red';
}

function getOrthogonalityColor(orth) {
    if (orth > 95) return 'brightgreen';
    if (orth > 90) return 'green';
    if (orth > 80) return 'blue';
    if (orth > 70) return 'yellow';
    return 'red';
}

function getAsymmetryColor(asym) {
    const asymNum = parseFloat(asym);
    if (asymNum < 1.5) return 'green';
    if (asymNum < 2.5) return 'yellow';
    if (asymNum < 3.5) return 'orange';
    return 'red';
}

const grade = getGrade(trueTrustDebt);
const gradeColor = getDebtColor(trueTrustDebt);
const debtColor = getDebtColor(trueTrustDebt);
const orthColor = orthogonality < 20 ? 'red' : getOrthogonalityColor(orthogonality);
const asymColor = getAsymmetryColor(asymmetry);

// Generate badge URLs (shields.io format) - TRUE Trust Debt version
const badges = {
    trueTrustDebt: `https://img.shields.io/badge/TRUE%20Trust%20Debt™-${trueTrustDebt}%20units-${debtColor}.svg`,
    upperTriangle: `https://img.shields.io/badge/Upper△-${upperTriangle}-red.svg`,
    lowerTriangle: `https://img.shields.io/badge/Lower△-${lowerTriangle}-blue.svg`,
    asymmetry: `https://img.shields.io/badge/Asymmetry-${asymmetry}x-${asymColor}.svg`,
    orthogonality: `https://img.shields.io/badge/Orthogonality-${orthogonality}%25-${orthColor}.svg`
};

// Calculate the MEANINGFUL metrics
const totalTrustDebt = upperTriangle + lowerTriangle;
const promiseRatio = Math.round((upperTriangle / totalTrustDebt) * 100);
const realityRatio = Math.round((lowerTriangle / totalTrustDebt) * 100);

// Update badge URLs with the new metrics
badges.totalDebt = `https://img.shields.io/badge/Total%20Trust%20Debt-${totalTrustDebt.toLocaleString()}%20units-red.svg`;
badges.brokenPromises = `https://img.shields.io/badge/Broken%20Promises-${upperTriangle.toLocaleString()}-orange.svg`;
badges.hiddenFeatures = `https://img.shields.io/badge/Hidden%20Features-${lowerTriangle.toLocaleString()}-blue.svg`;
badges.alphaStatus = `https://img.shields.io/badge/Alpha%20Status-Chaos-purple.svg`;

// Generate the badge markdown section
const badgeSection = `## 📊 Our Own Trust Debt (We Eat Our Own Dog Food)

[![Total Trust Debt](${badges.totalDebt})](https://github.com/eliasmoosman/IntentGuard/blob/main/trust-debt-final.html)
[![Broken Promises](${badges.brokenPromises})](https://github.com/eliasmoosman/IntentGuard/blob/main/trust-debt-final.html)
[![Hidden Features](${badges.hiddenFeatures})](https://github.com/eliasmoosman/IntentGuard/blob/main/trust-debt-final.html)
[![Orthogonality](${badges.orthogonality})](https://github.com/eliasmoosman/IntentGuard/blob/main/trust-debt-final.html)
[![Alpha Status](${badges.alphaStatus})](https://github.com/eliasmoosman/IntentGuard/blob/main/trust-debt-final.html)

> **Alpha Reality Check:** ${totalTrustDebt.toLocaleString()} units of total confusion - we have ${upperTriangle.toLocaleString()} broken promises and ${lowerTriangle.toLocaleString()} hidden features. Our orthogonality is ${orthogonality}% (categories are basically having a fistfight). This is exactly why we built IntentGuard. [See our beautiful mess →](trust-debt-final.html)`;

// Output results
console.log('📊 Trust Debt Metrics:');
console.log(`   Trust Debt: ${trustDebt} units (Grade: ${grade})`);
console.log(`   Orthogonality: ${orthogonality}%`);
console.log(`   Asymmetry: ${asymmetry}x`);
console.log(`   Cold Spots: ${coldSpots}%`);
console.log('');
console.log('Badge URLs generated:');
Object.entries(badges).forEach(([name, url]) => {
    console.log(`   ${name}: ${url}`);
});
console.log('');
console.log('To update README.md, replace the badge section with:');
console.log('----------------------------------------');
console.log(badgeSection);
console.log('----------------------------------------');

// Optionally auto-update README.md
if (process.argv.includes('--update')) {
    const readmePath = path.join(__dirname, 'README.md');
    try {
        let readme = fs.readFileSync(readmePath, 'utf8');
        
        // Find and replace the badge section
        const badgeStart = '## 📊 Our Own Trust Debt';
        const badgeEnd = '> **Alpha Honesty:**';
        
        const startIndex = readme.indexOf(badgeStart);
        if (startIndex !== -1) {
            const endIndex = readme.indexOf('\n\n', readme.indexOf(badgeEnd));
            if (endIndex !== -1) {
                readme = readme.slice(0, startIndex) + 
                         badgeSection + 
                         readme.slice(endIndex);
                
                fs.writeFileSync(readmePath, readme);
                console.log('✅ README.md updated successfully!');
            }
        }
    } catch (error) {
        console.error('Could not auto-update README.md:', error.message);
    }
}

// Create a simple JSON file for CI/CD integration
const badgeData = {
    metrics: {
        trustDebt,
        grade,
        orthogonality,
        asymmetry,
        coldSpots
    },
    badges,
    generated: new Date().toISOString()
};

fs.writeFileSync('trust-debt-badges.json', JSON.stringify(badgeData, null, 2));
console.log('✅ Saved badge data to trust-debt-badges.json');