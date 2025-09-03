# Matrix Border Specification
## Symmetric Double Borders for Orthogonal Block Visualization

### Critical Requirement: Border Symmetry

**The double borders between orthogonal blocks MUST be symmetric both vertically and horizontally.**

### Implementation Rules

1. **Vertical Borders**: When a column ends a block (e.g., last A🚀 column before B🔒), apply `block-end-A` class
2. **Horizontal Borders**: When a row ends a block (e.g., last A🚀 row before B🔒), apply `block-end-row-A` class
3. **Symmetry**: These borders MUST align - if column 5 has a vertical border, row 5 has a horizontal border

### Visual Example

```
         A🚀 Block    ║    B🔒 Block    ║    C⚡ Block
      ┌─────┬─────┬───╫───┬─────┬─────╫───┬─────┬─────┐
A🚀   │ 450 │ 125 │ 89║201│ 15  │  8  ║178│  12 │ 234 │
Block │ 450 │ 125 │ 89║201│ 15  │  8  ║178│  12 │ 234 │
      ╞═════╪═════╪═══╬═══╪═════╪═════╬═══╪═════╪═════╡
B🔒   │ 450 │ 125 │ 89║201│ 15  │  8  ║178│  12 │ 234 │
Block │ 450 │ 125 │ 89║201│ 15  │  8  ║178│  12 │ 234 │
      ╞═════╪═════╪═══╬═══╪═════╪═════╬═══╪═════╪═════╡
C⚡   │ 450 │ 125 │ 89║201│ 15  │  8  ║178│  12 │ 234 │
Block │ 450 │ 125 │ 89║201│ 15  │  8  ║178│  12 │ 234 │
      └─────┴─────┴───╨───┴─────┴─────╨───┴─────┴─────┘
```

### CSS Implementation

```css
/* Vertical borders - end of blocks */
.block-end-A { border-right: 3px solid #00ff88 !important; }
.block-end-B { border-right: 3px solid #00aaff !important; }

/* Horizontal borders - MUST match vertical positions */
.block-end-row-A { border-bottom: 3px solid #00ff88 !important; }
.block-end-row-B { border-bottom: 3px solid #00aaff !important; }
```

### Code Implementation (src/trust-debt-final.js)

```javascript
// Check block boundaries for BOTH row and column
const isBlockEndRow = !nextCat || cat1.id.charAt(0) !== nextCat.id.charAt(0);
const isColBlockEnd = !nextCat2 || cat2.id.charAt(0) !== nextCat2.id.charAt(0);

// Apply BOTH borders to maintain symmetry
const cellClasses = [
    isDiagonal ? 'diagonal' : '',
    debtClass,
    // Column borders
    isColBlockEnd ? `block-end-${colBlockLetter}` : '',
    // Row borders (MUST be symmetric with columns)
    isBlockEndRow ? `block-end-row-${blockLetter}` : ''
].filter(c => c).join(' ');
```

### Why This Matters

1. **Visual Clarity**: Symmetric borders create clear orthogonal block separation
2. **Patent Compliance**: Orthogonal blocks are fundamental to multiplicative performance claims
3. **User Understanding**: Clear visual boundaries help users understand the 5×5 parent structure
4. **Mathematical Correctness**: Symmetric borders reflect the symmetric nature of the correlation matrix

### Testing Checklist

- [ ] Vertical border at end of A🚀 block (column 4-5 boundary)
- [ ] Horizontal border at same position (row 4-5 boundary)
- [ ] Borders align perfectly creating a grid
- [ ] Each parent block is visually distinct
- [ ] Borders use parent category colors

### Non-Regression Requirements

**DO NOT**:
- Remove the symmetric border logic
- Apply only vertical or only horizontal borders
- Use different positions for vertical vs horizontal borders
- Forget to check both row and column boundaries

**ALWAYS**:
- Check isBlockEndRow AND isColBlockEnd
- Apply both border classes when boundaries align
- Test with 5 parent categories to verify grid
- Maintain color consistency with parent categories

---

*This specification is critical for maintaining the visual integrity of the Trust Debt matrix.*