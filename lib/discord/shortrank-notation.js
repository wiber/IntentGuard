/**
 * src/discord/shortrank-notation.ts — Tesseract ShortRank Intersection Notation
 *
 * Every tweet, every update, every cognitive room message gets tagged with
 * its ShortRank intersection: `📡 B3 Tactics.Signal : 🔌 C1 Operations.Grid`
 *
 * The 12-cell grid (3x3 + 3 parents) maps to the 20 trust-debt categories.
 * ThetaSteer (Ollama) does the categorization; this module formats the output.
 *
 * CELLS:
 *   🏛️ A  Strategy         ⚡ B  Tactics          🔧 C  Operations
 *   ⚖️ A1 Strategy.Law     🏎️ B1 Tactics.Speed    🔌 C1 Operations.Grid
 *   🎯 A2 Strategy.Goal    🤝 B2 Tactics.Deal     🔄 C2 Operations.Loop
 *   💰 A3 Strategy.Fund    📡 B3 Tactics.Signal    🌊 C3 Operations.Flow
 *
 * INTERSECTION: source_cell : target_cell
 *   Means "this content connects [source] to [target]"
 *   Self-intersection (A1:A1) = pure category signal
 */
/** The 12-cell tesseract grid */
export const TESSERACT_CELLS = {
    A: { code: 'A', emoji: '🏛️', parent: 'Strategy', name: 'Strategy', fullName: 'Strategy', trustCategories: ['risk_assessment', 'domain_expertise', 'compliance'], room: 'architect' },
    B: { code: 'B', emoji: '⚡', parent: 'Tactics', name: 'Tactics', fullName: 'Tactics', trustCategories: ['time_management', 'communication', 'adaptability'], room: 'operator' },
    C: { code: 'C', emoji: '🔧', parent: 'Operations', name: 'Operations', fullName: 'Operations', trustCategories: ['reliability', 'security', 'process_adherence'], room: 'builder' },
    A1: { code: 'A1', emoji: '⚖️', parent: 'Strategy', name: 'Law', fullName: 'Strategy.Law', trustCategories: ['compliance', 'ethical_alignment', 'accountability'], room: 'vault' },
    A2: { code: 'A2', emoji: '🎯', parent: 'Strategy', name: 'Goal', fullName: 'Strategy.Goal', trustCategories: ['risk_assessment', 'domain_expertise', 'innovation'], room: 'architect' },
    A3: { code: 'A3', emoji: '💰', parent: 'Strategy', name: 'Fund', fullName: 'Strategy.Fund', trustCategories: ['resource_efficiency', 'accountability', 'transparency'], room: 'performer' },
    B1: { code: 'B1', emoji: '🏎️', parent: 'Tactics', name: 'Speed', fullName: 'Tactics.Speed', trustCategories: ['time_management', 'reliability', 'adaptability'], room: 'voice' },
    B2: { code: 'B2', emoji: '🤝', parent: 'Tactics', name: 'Deal', fullName: 'Tactics.Deal', trustCategories: ['communication', 'collaboration', 'user_focus'], room: 'network' },
    B3: { code: 'B3', emoji: '📡', parent: 'Tactics', name: 'Signal', fullName: 'Tactics.Signal', trustCategories: ['communication', 'transparency', 'innovation'], room: 'navigator' },
    C1: { code: 'C1', emoji: '🔌', parent: 'Operations', name: 'Grid', fullName: 'Operations.Grid', trustCategories: ['security', 'reliability', 'data_integrity'], room: 'builder' },
    C2: { code: 'C2', emoji: '🔄', parent: 'Operations', name: 'Loop', fullName: 'Operations.Loop', trustCategories: ['testing', 'process_adherence', 'code_quality'], room: 'laboratory' },
    C3: { code: 'C3', emoji: '🌊', parent: 'Operations', name: 'Flow', fullName: 'Operations.Flow', trustCategories: ['adaptability', 'resource_efficiency', 'documentation'], room: 'operator' },
};
/** Reverse map: trust-debt category → best tesseract cell */
const TRUST_TO_CELL = {
    security: 'C1',
    reliability: 'C1',
    data_integrity: 'C1',
    process_adherence: 'C2',
    code_quality: 'C2',
    testing: 'C2',
    documentation: 'C3',
    communication: 'B2',
    time_management: 'B1',
    resource_efficiency: 'A3',
    risk_assessment: 'A2',
    compliance: 'A1',
    innovation: 'B3',
    collaboration: 'B2',
    accountability: 'A3',
    transparency: 'B3',
    adaptability: 'B1',
    domain_expertise: 'A2',
    user_focus: 'B2',
    ethical_alignment: 'A1',
};
/** Keyword patterns for quick cell detection (used when ThetaSteer is unavailable) */
const CELL_KEYWORDS = {
    A: ['strategy', 'strategic', 'vision', 'direction', 'plan'],
    B: ['tactic', 'execute', 'action', 'move', 'implement'],
    C: ['operate', 'maintain', 'deploy', 'infrastructure', 'system'],
    A1: ['law', 'legal', 'compliance', 'regulation', 'policy', 'license', 'patent'],
    A2: ['goal', 'objective', 'target', 'milestone', 'kpi', 'metric', 'alignment'],
    A3: ['fund', 'budget', 'revenue', 'cost', 'invest', 'capital', 'resource'],
    B1: ['speed', 'fast', 'performance', 'latency', 'optimize', 'velocity', 'quick'],
    B2: ['deal', 'partner', 'collaborate', 'negotiate', 'client', 'user', 'customer'],
    B3: ['signal', 'communicate', 'broadcast', 'notify', 'message', 'transparency', 'tweet'],
    C1: ['grid', 'infrastructure', 'security', 'auth', 'database', 'pipeline', 'deploy'],
    C2: ['loop', 'test', 'iterate', 'ci', 'review', 'process', 'quality', 'refactor'],
    C3: ['flow', 'workflow', 'automate', 'stream', 'adapt', 'document', 'integrate'],
};
/**
 * Detect the best tesseract cell for a piece of text.
 * Returns the cell code (e.g., 'B3') and confidence.
 */
export function detectCell(text) {
    const lower = text.toLowerCase();
    const scores = {};
    for (const [code, keywords] of Object.entries(CELL_KEYWORDS)) {
        let score = 0;
        for (const kw of keywords) {
            if (lower.includes(kw))
                score++;
        }
        if (score > 0)
            scores[code] = score;
    }
    // Prefer specific cells (A1-C3) over parents (A-C)
    const entries = Object.entries(scores).sort((a, b) => {
        const aSpecific = a[0].length > 1 ? 1 : 0;
        const bSpecific = b[0].length > 1 ? 1 : 0;
        if (aSpecific !== bSpecific)
            return bSpecific - aSpecific;
        return b[1] - a[1];
    });
    if (entries.length === 0)
        return { cell: 'B3', confidence: 0.1 }; // Default: Signal
    return { cell: entries[0][0], confidence: Math.min(1.0, entries[0][1] / 3) };
}
/**
 * Map trust-debt categories to the best tesseract cell.
 */
export function trustCategoriesToCell(categories) {
    if (categories.length === 0)
        return 'B3';
    const cellVotes = {};
    for (const cat of categories) {
        const cell = TRUST_TO_CELL[cat] || 'B3';
        cellVotes[cell] = (cellVotes[cell] || 0) + 1;
    }
    return Object.entries(cellVotes).sort((a, b) => b[1] - a[1])[0][0];
}
/**
 * Build a ShortRank intersection from source and target cell codes.
 */
export function intersection(sourceCode, targetCode) {
    const source = TESSERACT_CELLS[sourceCode] || TESSERACT_CELLS['B3'];
    const target = TESSERACT_CELLS[targetCode] || TESSERACT_CELLS['B3'];
    return {
        source,
        target,
        notation: `${source.emoji} ${source.code} ${source.fullName} : ${target.emoji} ${target.code} ${target.fullName}`,
        compact: `${source.code}:${target.code}`,
        isSelfRef: sourceCode === targetCode,
    };
}
/**
 * Auto-detect intersection from text content.
 * Finds the two most relevant cells and creates the intersection.
 */
export function autoIntersection(text) {
    const lower = text.toLowerCase();
    const scores = [];
    for (const [code, keywords] of Object.entries(CELL_KEYWORDS)) {
        let score = 0;
        for (const kw of keywords) {
            if (lower.includes(kw))
                score++;
        }
        if (score > 0)
            scores.push([code, score]);
    }
    // Sort: prefer specific cells, then by score
    scores.sort((a, b) => {
        const aSpec = a[0].length > 1 ? 1 : 0;
        const bSpec = b[0].length > 1 ? 1 : 0;
        if (aSpec !== bSpec)
            return bSpec - aSpec;
        return b[1] - a[1];
    });
    const source = scores[0]?.[0] || 'B3';
    const target = scores[1]?.[0] || source; // Self-ref if only one match
    return intersection(source, target);
}
/**
 * Format a tweet with ShortRank intersection prefix.
 *
 * Example output:
 *   📡 B3 Tactics.Signal : 🔌 C1 Operations.Grid
 *   Pipeline complete. Sovereignty: 58% | Trust Debt: 35 units.
 *   🟡 S:58% | #IntentGuard
 */
export function formatTweetWithIntersection(text, sourceCode, targetCode, sovereignty) {
    const ix = intersection(sourceCode, targetCode);
    const sovEmoji = sovereignty >= 0.8 ? '🟢' : sovereignty >= 0.6 ? '🟡' : '🔴';
    const parts = [
        ix.notation,
        text,
        `${sovEmoji} S:${(sovereignty * 100).toFixed(0)}% | #IntentGuard`,
    ];
    return parts.join('\n');
}
/**
 * Generate a pivotal question for a cognitive room based on cell context.
 */
export function pivotalQuestion(cellCode, context) {
    const cell = TESSERACT_CELLS[cellCode] || TESSERACT_CELLS['B3'];
    const templates = {
        A1: { q: 'Does this action comply with our stated policies and ethical boundaries?', a: 'Proceeding — within FIM geometric bounds. Logging to #vault for audit.' },
        A2: { q: 'Does this align with our declared strategic goals?', a: 'Alignment check: goal-drift < 10%. Continuing on current trajectory.' },
        A3: { q: 'Is this the most resource-efficient path to the outcome?', a: 'Cost-benefit positive. No cheaper alternative detected.' },
        B1: { q: 'Can we ship this faster without increasing trust debt?', a: 'Current velocity is optimal. Rushing would spike reliability debt.' },
        B2: { q: 'Does this serve the user/partner relationship?', a: 'User-focus score stable. No collaboration risk detected.' },
        B3: { q: 'Is this signal being communicated transparently?', a: 'Broadcasting to #trust-debt-public. Transparency score maintained.' },
        C1: { q: 'Is the infrastructure secure and reliable for this operation?', a: 'Security posture green. No data integrity risks.' },
        C2: { q: 'Has this been tested and does it follow our process?', a: 'Test coverage adequate. Process adherence within bounds.' },
        C3: { q: 'Does this flow integrate smoothly with existing systems?', a: 'Integration path clear. No adaptation debt introduced.' },
        A: { q: 'Is our strategic direction still valid?', a: 'Strategy vector stable. No macro pivot required.' },
        B: { q: 'Are our tactical decisions producing results?', a: 'Execution metrics positive. Maintaining current tactics.' },
        C: { q: 'Are operations running within acceptable parameters?', a: 'Operational health green. All systems nominal.' },
    };
    const template = templates[cellCode] || templates['B3'];
    return {
        question: template.q,
        predictedAnswer: template.a,
        room: cell.room,
    };
}
/**
 * Get the cognitive room a cell routes to.
 */
export function cellToRoom(cellCode) {
    return TESSERACT_CELLS[cellCode]?.room || 'navigator';
}
/**
 * Get the cell for a cognitive room.
 */
export function roomToCell(room) {
    return Object.values(TESSERACT_CELLS).find(c => c.room === room);
}
//# sourceMappingURL=shortrank-notation.js.map