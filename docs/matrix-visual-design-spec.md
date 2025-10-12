# Trust Debt Matrix Visual Design Specification

## Double-Walled Boundary Concept

### Core Principle
**Double-walled boundaries appear ONLY between category groups to create visual separation between semantic families.**

Each boundary consists of **TWO adjacent walls**, each colored from the group it borders:
- **Left/Top wall**: Colored from the exiting group
- **Right/Bottom wall**: Colored from the entering group

### Visual Example

```
┌─────────────┬─────────────┐
│   A🚀.4🎯   │║  B🔒.1📚   │
│             │║             │
│   (Green)   ║║   (Blue)   │
│             │║             │
└─────────────┴═════════────┘
              ↑↑
          Green│Blue
           wall│wall
```

**NOT** this (single border):
```
┌─────────────┬─────────────┐
│   A🚀.4🎯   │   B🔒.1📚   │
│   (Green)   ║   (Blue)    │
└─────────────┴─────────────┘
              ↑
         Single border
```

## Implementation Details

### Category Structure (25 categories)

**6 Parent Categories:**
1. A🚀 CoreEngine (Green: #00ff88)
2. B🔒 Documentation (Blue: #00aaff)
3. C💨 Visualization (Orange: #ffaa00)
4. D🧠 Integration (Pink: #ff00aa)
5. E🎨 BusinessLayer (Red: #ff0044)
6. F⚡ Claude-Flow (Blue-gray: #3b82f6)

**19 Child Categories (distributed across parents):**
- A🚀.1⚡, A🚀.2🔥, A🚀.3📈, A🚀.4🎯 (4 children)
- B🔒.1📚, B🔒.2📖, B🔒.3📋 (3 children)
- C💨.1✨, C💨.2🎨, C💨.3📊 (3 children)
- D🧠.1🔗, D🧠.2⚙️, D🧠.3🌐 (3 children)
- E🎨.1💼, E🎨.2⚖️, E🎨.3🎯 (3 children)
- F⚡.0🎯, F⚡.1💾, F⚡.7📄 (3 children)

### Double-Wall Locations

**5 Vertical Double Walls** (between column groups):

1. **After column 11** (A🚀.4🎯): `Green | Blue`
   - Separates A🚀 family from B🔒 family

2. **After column 14** (B🔒.3📋): `Blue | Orange`
   - Separates B🔒 family from C💨 family

3. **After column 17** (C💨.3📊): `Orange | Pink`
   - Separates C💨 family from D🧠 family

4. **After column 20** (D🧠.3🌐): `Pink | Red`
   - Separates D🧠 family from E🎨 family

5. **After column 23** (E🎨.3🎯): `Red | Blue-gray`
   - Separates E🎨 family from F⚡ family

**5 Horizontal Double Walls** (between row groups):
- Same pattern as vertical, applied to rows

### CSS Implementation

```css
/* Example: Double wall after A🚀.4🎯 (column 11) */
th:nth-child(11), td:nth-child(11) {
    border-right: 2px solid #00ff88 !important;  /* Green wall (A🚀) */
    box-shadow: 2px 0 0 0 #00aaff !important;   /* Blue wall (B🔒) */
}

/* Example: Double wall after A🚀.4🎯 (row 11) */
tr:nth-child(11) th, tr:nth-child(11) td {
    border-bottom: 2px solid #00ff88 !important;  /* Green wall (A🚀) */
    box-shadow: 0 2px 0 0 #00aaff !important;    /* Blue wall (B🔒) */
}
```

### Why Box-Shadow?

Using `box-shadow` for the second wall allows:
1. **Two distinct colors** for each wall
2. **No layout shift** (box-shadow doesn't affect layout)
3. **Clean separation** between semantic groups
4. **Visual clarity** at boundaries

### Common Mistakes to Avoid

❌ **WRONG**: Putting borders around every category
```css
/* This creates visual noise */
th:nth-child(8) { border: 2px solid #00ff88; }
th:nth-child(9) { border: 2px solid #00ff88; }
th:nth-child(10) { border: 2px solid #00ff88; }
```

✅ **CORRECT**: Only at group boundaries
```css
/* Clean separation between groups */
th:nth-child(11) {
    border-right: 2px solid #00ff88;    /* Left wall */
    box-shadow: 2px 0 0 0 #00aaff;      /* Right wall */
}
```

❌ **WRONG**: Single-color boundaries
```css
/* Loses the "belonging" information */
th:nth-child(11) { border-right: 4px solid #888; }
```

✅ **CORRECT**: Two-color boundaries
```css
/* Shows which groups are being separated */
th:nth-child(11) {
    border-right: 2px solid #00ff88;    /* From A🚀 */
    box-shadow: 2px 0 0 0 #00aaff;      /* To B🔒 */
}
```

## Visual Hierarchy Goals

1. **Parent categories** stand out with full names and stronger colors
2. **Child categories** use lighter shades of parent colors
3. **Group boundaries** are clearly visible with double walls
4. **Diagonal cells** emphasize self-consistency measurement
5. **Trust Debt intensity** shown through cell color coding

## Testing Checklist

- [ ] Exactly 5 vertical double walls visible in matrix
- [ ] Exactly 5 horizontal double walls visible in matrix
- [ ] Each wall shows two distinct colors
- [ ] No borders between categories within same group
- [ ] Boundaries align with category family transitions
- [ ] Visual clarity: can identify which group each category belongs to
- [ ] Print/PDF export maintains double-wall appearance
