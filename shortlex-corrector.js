// ShortLex Corrector - Fix the category ordering
const fs = require('fs');

const matrixData = JSON.parse(fs.readFileSync('3-presence-matrix.json', 'utf8'));

console.log('CORRECTING SHORTLEX ORDERING...');

// Sort categories by ShortLex: length first, then alphabetically
const sortedCategories = matrixData.categories.sort((a, b) => {
  if (a.name.length !== b.name.length) {
    return a.name.length - b.name.length; // Sort by length first
  }
  return a.name.localeCompare(b.name); // Then alphabetically within same length
});

console.log('CORRECTED SHORTLEX ORDER:');
sortedCategories.forEach((cat, i) => {
  console.log(`${i+1}. ${cat.name} (length ${cat.name.length})`);
  // Update shortlex_order to match corrected position
  cat.shortlex_order = i + 1;
});

// Group by length to show the structure clearly
const groupedByLength = {};
sortedCategories.forEach(cat => {
  const len = cat.name.length;
  if (!groupedByLength[len]) groupedByLength[len] = [];
  groupedByLength[len].push(cat.name);
});

console.log('\nGROUPED BY LENGTH:');
Object.keys(groupedByLength).sort((a, b) => parseInt(a) - parseInt(b)).forEach(len => {
  console.log(`Length ${len}:`, groupedByLength[len]);
});

// Save corrected data
const correctedData = {
  ...matrixData,
  categories: sortedCategories
};

fs.writeFileSync('3-presence-matrix-corrected.json', JSON.stringify(correctedData, null, 2));
console.log('\n✅ CORRECTED DATA SAVED TO 3-presence-matrix-corrected.json');