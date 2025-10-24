#!/usr/bin/env node

/**
 * PRODUCTION MATRIX RENDERER
 * ==========================
 * Renders IntentGuard Trust Debt matrix with:
 * - ShortLex + ShortRank + Emoji axes (symmetrical)
 * - Colored block characters inside cells (NEVER emojis)
 * - Color encodes meaning (learnable for 15×15 or 20×20)
 * - Output flow: Preprocessing → Axes → Map (map always last)
 * - Map next to next box (continuous output)
 */

class MatrixRendererProduction {
    constructor(options = {}) {
        this.colorMode = options.colorMode || 'ansi'; // 'ansi' or 'none'
        this.matrixSize = options.matrixSize || 20; // 15 or 20
        this.showFullMatrix = options.showFullMatrix !== false;

        // ANSI color codes (for terminal)
        this.colors = {
            critical: '\x1b[31m', // Red
            high: '\x1b[33m',     // Yellow
            medium: '\x1b[36m',   // Cyan
            low: '\x1b[32m',      // Green
            minimal: '\x1b[90m',  // Gray
            reset: '\x1b[0m'
        };

        // Block characters for different drift levels
        this.blocks = {
            critical: '█', // Solid
            high: '▓',     // Dark
            medium: '▒',   // Medium
            low: '░',      // Light
            minimal: '·',  // Dot
            none: ' '      // Space
        };
    }

    /**
     * STEP 1: Preprocessing - Show what we're about to render
     */
    renderPreprocessing(categories, stats) {
        console.log('');
        console.log('🔧 PREPROCESSING: Matrix Configuration');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
        console.log(`Matrix Size: ${categories.length}×${categories.length}`);
        console.log(`Total Categories: ${categories.length}`);
        console.log(`ShortLex Ordering: Enabled (Length 1 → Length 2)`);
        console.log(`Color Encoding: ${this.colorMode === 'ansi' ? 'ANSI Colors' : 'Monochrome'}`);
        console.log(`Symmetrical Axes: Yes`);
        console.log('');

        if (stats) {
            console.log('📊 Statistics:');
            console.log(`  Total Trust Debt: ${stats.totalUnits || 'N/A'} units`);
            console.log(`  Grade: ${stats.grade || 'N/A'}`);
            console.log('');
        }
    }

    /**
     * STEP 2: Axes Definition - Show ShortLex + ShortRank + Emoji
     */
    renderAxes(categories) {
        console.log('');
        console.log('📍 AXES DEFINITION: ShortLex + ShortRank + Emoji');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');

        // Separate parents (length 1) and children (length 2)
        const parents = categories.filter(c => c.shortlex_length === 1 || !c.id.includes('.'));
        const children = categories.filter(c => c.shortlex_length === 2 || c.id.includes('.'));

        console.log('LENGTH 1 (Parents):');
        parents.forEach((cat, idx) => {
            const code = this.getCategoryCode(cat);
            const rank = idx + 1;
            console.log(`  ${rank}. ${code} ${cat.name || cat.id}`);
        });

        console.log('');
        console.log('LENGTH 2 (Children):');
        children.forEach((cat, idx) => {
            const code = this.getCategoryCode(cat);
            const rank = parents.length + idx + 1;
            console.log(`  ${rank}. ${code} ${cat.name || cat.id}`);
        });

        console.log('');
        console.log('COLOR KEY (Drift Levels):');
        console.log(`  ${this.colorize('█', 'critical')} Critical (High drift)`);
        console.log(`  ${this.colorize('▓', 'high')} High (Moderate drift)`);
        console.log(`  ${this.colorize('▒', 'medium')} Medium (Some drift)`);
        console.log(`  ${this.colorize('░', 'low')} Low (Minimal drift)`);
        console.log(`  ${this.colorize('·', 'minimal')} Minimal (Aligned)`);
        console.log('');
    }

    /**
     * STEP 3: Render the actual matrix (FINAL OUTPUT)
     */
    renderMatrix(matrix, categories) {
        console.log('');
        console.log('🗺️  TRUST DEBT MATRIX (ShortLex Ordered)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');

        // Get category codes (A🚀, B🔒, etc.)
        const codes = categories.map(c => this.getCategoryCode(c));

        // Render header row (horizontal axis)
        const header = '    ' + codes.map(c => c.padEnd(3)).join(' ');
        console.log(header);
        console.log('    ' + '─'.repeat(codes.length * 4));

        // Render each row
        for (let i = 0; i < categories.length; i++) {
            const rowCode = codes[i].padEnd(3);
            const cells = [];

            for (let j = 0; j < categories.length; j++) {
                const cell = matrix[i][j];
                const block = this.getCellBlock(cell);
                const colored = this.colorize(block, this.getDriftLevel(cell));
                cells.push(colored + colored); // Double for visibility
            }

            console.log(rowCode + ' ' + cells.join(' '));
        }

        console.log('');
    }

    /**
     * Get category code (ShortLex + Emoji)
     */
    getCategoryCode(category) {
        // If category already has code like "A🚀", use it
        if (category.code) return category.code;
        if (category.id && category.id.match(/^[A-Z]/)) return category.id;

        // Extract from name or ID
        const match = category.name?.match(/^([A-Z][\u{1F300}-\u{1F9FF}])/u);
        if (match) return match[1];

        // Fallback: use first letter + generic emoji
        const letter = category.name?.[0] || category.id?.[0] || 'X';
        return `${letter}⚡`;
    }

    /**
     * Get block character for cell value
     */
    getCellBlock(cell) {
        const value = typeof cell === 'object' ? cell.value : cell;

        if (value >= 0.7) return this.blocks.critical;
        if (value >= 0.5) return this.blocks.high;
        if (value >= 0.3) return this.blocks.medium;
        if (value >= 0.1) return this.blocks.low;
        if (value > 0) return this.blocks.minimal;
        return this.blocks.none;
    }

    /**
     * Get drift level for color coding
     */
    getDriftLevel(cell) {
        const value = typeof cell === 'object' ? cell.value : cell;

        if (value >= 0.7) return 'critical';
        if (value >= 0.5) return 'high';
        if (value >= 0.3) return 'medium';
        if (value >= 0.1) return 'low';
        return 'minimal';
    }

    /**
     * Colorize text with ANSI codes
     */
    colorize(text, level) {
        if (this.colorMode !== 'ansi') return text;
        return this.colors[level] + text + this.colors.reset;
    }

    /**
     * MAIN RENDER FUNCTION
     * Follows output flow: Preprocessing → Axes → Map
     */
    render(matrix, categories, stats = null) {
        // STEP 1: Preprocessing
        this.renderPreprocessing(categories, stats);

        // STEP 2: Axes Definition
        this.renderAxes(categories);

        // STEP 3: Matrix (FINAL OUTPUT - always last)
        this.renderMatrix(matrix, categories);

        console.log('✅ Matrix rendering complete');
        console.log('');
    }
}

module.exports = MatrixRendererProduction;

// CLI usage
if (require.main === module) {
    // Example: Mock 6×6 matrix for testing
    const mockCategories = [
        { id: 'A🚀', name: 'A🚀 CoreEngine', shortlex_length: 1, code: 'A🚀' },
        { id: 'B🔒', name: 'B🔒 Documentation', shortlex_length: 1, code: 'B🔒' },
        { id: 'C💨', name: 'C💨 Visualization', shortlex_length: 1, code: 'C💨' },
        { id: 'D🧠', name: 'D🧠 Integration', shortlex_length: 1, code: 'D🧠' },
        { id: 'E🎨', name: 'E🎨 BusinessLayer', shortlex_length: 1, code: 'E🎨' },
        { id: 'F🤖', name: 'F🤖 Agents', shortlex_length: 1, code: 'F🤖' }
    ];

    // Mock matrix with varying drift values
    const mockMatrix = [
        [0.1, 0.3, 0.5, 0.7, 0.2, 0.4],
        [0.3, 0.1, 0.6, 0.4, 0.8, 0.3],
        [0.5, 0.6, 0.1, 0.2, 0.4, 0.5],
        [0.7, 0.4, 0.2, 0.1, 0.3, 0.6],
        [0.2, 0.8, 0.4, 0.3, 0.1, 0.7],
        [0.4, 0.3, 0.5, 0.6, 0.7, 0.1]
    ];

    const mockStats = {
        totalUnits: 1234,
        grade: 'B'
    };

    const renderer = new MatrixRendererProduction({
        colorMode: 'ansi',
        matrixSize: 6,
        showFullMatrix: true
    });

    renderer.render(mockMatrix, mockCategories, mockStats);
}
