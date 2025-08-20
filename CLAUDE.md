# CLAUDE.md - IntentGuard System

IntentGuard measures Trust Debt through matrix analysis of documentation versus implementation.

## Implementation Status

The system analyzes patterns in documentation and code to identify drift. It recognizes keywords, calculates correlations, and generates metrics through matrix operations. The implementation includes optimization through caching, security via input validation, speed through efficient processing, pattern recognition for insights, and visual interface for understanding.

## Key Features

- Matrix calculation for Trust Debt measurement
- Pattern matching to identify semantic relationships  
- Keyword analysis for category correlation
- HTML visualization with color-coded matrix
- Orthogonality monitoring for performance

## Technical Details

The system processes documentation files and source code, analyzing them for keyword presence. It builds Intent and Reality matrices, then calculates the drift between them. The resulting Trust Debt metric helps identify misalignment between promises and delivery.

## Matrix Border Symmetry (DO NOT REGRESS)

The Trust Debt matrix MUST maintain symmetric double borders between orthogonal blocks. Vertical and horizontal borders must align at block boundaries. See MATRIX_BORDER_SPECIFICATION.md for implementation details.