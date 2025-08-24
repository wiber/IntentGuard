# Double-Bordered Submatrices Visualization Algorithm

## Current Understanding

The Trust Debt matrix uses double-bordered submatrices to create visual blocks that show category boundaries and relationships. Here's my current understanding of the algorithm:

## Visual Structure

### Matrix Layout
```
Reality↓ / Intent→    A🚀    B🔒    C💨    D🧠    E🎨    A🚀.1⚡  A🚀.2🔥  ...
A🚀 Performance        [====================================]
B🔒 Security                  [====================================]
C💨 Speed                             [====================================]
D🧠 Intelligence                                   [====================================]
E🎨 Visual                                                  [====================================]
A🚀.1⚡ Optimization    [====================================]
A🚀.2🔥 Caching        [====================================]
...
```

## Border Color Rules

### What I Think Should Happen:

1. **Category Ownership**: Each category (A🚀, B🔒, C💨, D🧠, E🎨) has its own color:
   - A🚀 Performance: #ff6600 (orange/auburn)
   - B🔒 Security: #9900ff (purple)
   - C💨 Speed: #00ffff (cyan)
   - D🧠 Intelligence: #ffff00 (yellow)
   - E🎨 Visual: #ff0099 (pink/magenta)

2. **Border Application**:
   - **Horizontal borders** (top/bottom) = Row category color
   - **Vertical borders** (left/right) = Column category color
   
3. **Subcategory Inheritance**: 
   - A🚀.1⚡ inherits A's color (#ff6600)
   - B🔒.2🔑 inherits B's color (#9900ff)
   - And so on...

## The Double-Wall Effect

At category boundaries, we should see TWO borders side-by-side:
- The ending category's border (on its side)
- The starting category's border (on its side)

### Example Cell: A🚀 row × B🔒 column
```
┌─────────────┐
│             │  ← Top border: #ff6600 (A's color - row category)
│    Cell     │  ← Left border: #9900ff (B's color - column category)
│             │  ← Right border: #9900ff (B's color - column category)  
└─────────────┘  ← Bottom border: #ff6600 (A's color - row category)
```

## Block Boundaries

### When Borders Appear:

**Block Start Conditions**:
- `block-start-A`: First column of A category block
- `block-start-row-A`: First row of A category block

**Block End Conditions**:
- `block-end-A`: Last column of A category block
- `block-end-row-A`: Last row of A category block

### ShortLex Ordering Impact:
Categories are ordered: A🚀 < A🚀.1⚡ < A🚀.2🔥 < ... < B🔒 < B🔒.1🛡 < ...

This means:
- A🚀.4🎯 is the last A subcategory → gets `block-end-A` class
- B🔒.1🛡 is the first B subcategory → gets `block-start-B` class

## Visual Purpose

The double borders serve to:
1. **Create visual blocks** showing which categories belong together
2. **Show transitions** between major category groups
3. **Maintain visual hierarchy** where parent categories define the block colors
4. **Enable quick scanning** of the matrix to identify category relationships

## Questions for Clarification

1. **Color Matching**: Should the border colors EXACTLY match the text colors in the headers?
   - Currently: Borders use different colors than text
   - Expected: Borders should match header text colors?

2. **Subcategory Borders**: Should ALL subcategories (A🚀.1⚡, A🚀.2🔥, etc.) within a block have the same border color as their parent?
   - Currently: Only at block boundaries
   - Expected: All cells in A block have orange borders?

3. **Double Wall Visibility**: Should we see actual double lines at boundaries (two separate borders)?
   - Currently: Single 3px border
   - Expected: Two distinct borders creating a "wall"?

4. **Inner Block Borders**: Within a block (e.g., A🚀 to A🚀.1⚡), should there be any borders?
   - Currently: No borders within blocks
   - Expected: Subtle borders or none?

## Proposed Algorithm Fix

```javascript
function getCellBorderClasses(row, col, categories) {
  const rowCat = categories[row];
  const colCat = categories[col];
  
  // Get parent category letter (A, B, C, D, or E)
  const rowParent = rowCat.id.charAt(0);
  const colParent = colCat.id.charAt(0);
  
  // Previous/next for boundary detection
  const prevRow = row > 0 ? categories[row-1] : null;
  const nextRow = row < categories.length-1 ? categories[row+1] : null;
  const prevCol = col > 0 ? categories[col-1] : null;
  const nextCol = col < categories.length-1 ? categories[col+1] : null;
  
  const classes = [];
  
  // Row borders (horizontal)
  if (!prevRow || prevRow.id.charAt(0) !== rowParent) {
    classes.push(`block-start-row-${rowParent}`);
  }
  if (!nextRow || nextRow.id.charAt(0) !== rowParent) {
    classes.push(`block-end-row-${rowParent}`);
  }
  
  // Column borders (vertical)
  if (!prevCol || prevCol.id.charAt(0) !== colParent) {
    classes.push(`block-start-${colParent}`);
  }
  if (!nextCol || nextCol.id.charAt(0) !== colParent) {
    classes.push(`block-end-${colParent}`);
  }
  
  return classes.join(' ');
}
```

## CSS Implementation

```css
/* Each category gets its matching color */
.block-start-A, .block-end-A { 
  border-color: #ff6600; /* Matches A🚀 text color */
}
.block-start-B, .block-end-B { 
  border-color: #9900ff; /* Matches B🔒 text color */
}
/* ... etc ... */

/* Double wall effect at boundaries */
.block-end-A + .block-start-B {
  /* Creates visible gap between blocks */
  margin-left: 3px;
}
```

## Please Confirm/Correct

Is this understanding correct? What specific aspects need adjustment?