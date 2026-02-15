/**
 * Agent 0: Outcome Requirements Parser & Architectural Shepherd
 *
 * CORE RESPONSIBILITIES (from trust-debt-pipeline-coms.txt):
 * - Extract ALL outcome requirements from HTML reports and PDF template specifications
 * - Define comprehensive 45-category hierarchical ShortLex structure compliance
 * - Establish SQLite schema requirements for 45x45 asymmetric matrix
 * - Map all outcome requirements to responsible agents
 * - Validate PDF template format compliance for downstream agents
 *
 * INPUTS:
 * - trust-debt-pipeline-coms.txt (intent specifications)
 * - Previous HTML reports (if they exist)
 * - PDF template specifications
 *
 * OUTPUTS:
 * - 0-outcome-requirements.json (all extracted requirements with agent mappings)
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as cheerio from 'cheerio';
// Use process.cwd() for runtime flexibility
const ROOT = process.cwd();
/**
 * Parse the COMS.txt file to extract intent specifications
 */
function parseComsFile(comsPath) {
    if (!existsSync(comsPath)) {
        throw new Error(`COMS file not found at ${comsPath}`);
    }
    const content = readFileSync(comsPath, 'utf-8');
    const requirements = [];
    const categories = [];
    // Extract grade boundaries
    const gradeBoundaries = {
        A: content.match(/Grade A.*?(\d+-\d+ units)/)?.[1] || '0-500 units',
        B: content.match(/Grade B.*?(\d+-\d+ units)/)?.[1] || '501-1500 units',
        C: content.match(/Grade C.*?(\d+-\d+ units)/)?.[1] || '1501-3000 units',
        D: content.match(/Grade D.*?(\d+\+ units)/)?.[1] || '3001+ units',
    };
    // Extract patent formula
    const patentFormulaMatch = content.match(/TrustDebt = ([^\n]+)/);
    const patentFormula = patentFormulaMatch?.[1]?.trim() ||
        'Σ((Intent[i] - Reality[i])² × Time × SpecAge × CategoryWeight[i])';
    // Extract matrix size
    const matrixSizeMatch = content.match(/(\d+)×(\d+) (?:asymmetric )?matrix/i);
    const matrixSize = matrixSizeMatch ? `${matrixSizeMatch[1]}×${matrixSizeMatch[2]}` : '45×45';
    // Extract orthogonality target
    const orthogonalityMatch = content.match(/orthogonality.*?(<?\d+%)/i);
    const orthogonalityTarget = orthogonalityMatch?.[1] || '<1%';
    // Parse category structure (A0🎯, A1💾, etc.)
    const categoryLines = content.split('\n').filter((line) => {
        return /^A\d+/.test(line) && /:\s*$/.test(line);
    });
    for (const line of categoryLines) {
        const categoryMatch = line.match(/^(A\d+[🎯💾🏗️📐📊])\s+(.+?):\s*$/);
        if (!categoryMatch)
            continue;
        const code = categoryMatch[1];
        const name = categoryMatch[2];
        const emojiMatch = code.match(/[🎯💾🏗️📐📊]/);
        const emoji = emojiMatch ? emojiMatch[0] : '';
        categories.push({
            code,
            name,
            emoji,
            trustDebtUnits: 0, // Will be calculated by Agent 4
            description: name,
        });
    }
    // Extract requirements from agent sections
    const agentSections = content.split(/\nAGENT \d+:/);
    agentSections.shift(); // Remove the part before first agent
    for (let i = 1; i < agentSections.length; i++) {
        const section = agentSections[i];
        const agentNumMatch = section.match(/(\d+)/);
        if (!agentNumMatch)
            continue;
        const agentNum = parseInt(agentNumMatch[1], 10);
        // Extract responsibilities (bullet points starting with -)
        const responsibilities = section.split('\n')
            .filter(line => /^- (.+)$/.test(line))
            .map(line => line.match(/^- (.+)$/)?.[0] || '')
            .filter(Boolean);
        responsibilities.forEach((resp, idx) => {
            const description = resp.replace(/^- /, '').trim();
            requirements.push({
                id: `REQ-A${agentNum}-${idx + 1}`,
                category: `Agent ${agentNum}`,
                description,
                responsibleAgent: agentNum,
                validationCriteria: `Output file must contain ${description.toLowerCase()}`,
                priority: idx === 0 ? 'critical' : 'high',
                status: 'missing',
                source: 'trust-debt-pipeline-coms.txt',
            });
        });
    }
    // Add critical visual coherence requirements
    if (content.includes('VISUAL COHERENCE')) {
        requirements.push({
            id: 'REQ-VISUAL-1',
            category: 'Visual Coherence',
            description: 'Display FULL descriptive category names (never abbreviations)',
            responsibleAgent: 7,
            validationCriteria: 'HTML report shows complete category names in matrix headers',
            priority: 'critical',
            status: 'missing',
            source: 'COMS.txt Visual Coherence Requirements',
        });
        requirements.push({
            id: 'REQ-VISUAL-2',
            category: 'Visual Coherence',
            description: 'Implement double-walled submatrix borders with color coding',
            responsibleAgent: 7,
            validationCriteria: 'HTML report contains nested border styling for category blocks',
            priority: 'high',
            status: 'missing',
            source: 'COMS.txt Visual Coherence Requirements',
        });
    }
    // Add ShortLex validation requirements
    if (content.includes('SHORTLEX')) {
        requirements.push({
            id: 'REQ-SHORTLEX-1',
            category: 'ShortLex Validation',
            description: 'Validate proper ShortLex ordering (A→A.1→A.2→A.3→A.4→B→B.1...)',
            responsibleAgent: 3,
            validationCriteria: 'Shorter prefixes never follow longer prefixes',
            priority: 'critical',
            status: 'missing',
            source: 'COMS.txt ShortLex Requirements',
        });
    }
    // Add orthogonality requirement
    if (content.includes('orthogonality')) {
        requirements.push({
            id: 'REQ-ORTHOG-1',
            category: 'Orthogonality',
            description: `Achieve ${orthogonalityTarget} correlation between categories`,
            responsibleAgent: 2,
            validationCriteria: 'Category correlation score meets target threshold',
            priority: 'critical',
            status: 'missing',
            source: 'COMS.txt Orthogonality Target',
        });
    }
    return {
        requirements,
        categories,
        metadata: {
            gradeSystem: gradeBoundaries,
            patentFormula,
            matrixSize,
            orthogonalityTarget,
        },
    };
}
/**
 * Parse existing HTML report to check implementation status
 */
function parseExistingReport(reportPath) {
    const statusMap = new Map();
    if (!existsSync(reportPath)) {
        return statusMap;
    }
    try {
        const html = readFileSync(reportPath, 'utf-8');
        const $ = cheerio.load(html);
        // Check for full category names (not abbreviations)
        const hasFullNames = $('th, td').toArray().some(el => $(el).text().length > 10 && /[A-Za-z]{5,}/.test($(el).text()));
        if (hasFullNames)
            statusMap.set('REQ-VISUAL-1', 'implemented');
        // Check for double-walled borders
        const hasDoubleBorders = html.includes('border-style') || html.includes('outline');
        if (hasDoubleBorders)
            statusMap.set('REQ-VISUAL-2', 'partial');
        // Check for grade display
        const hasGrade = /Grade [ABCD]/.test(html);
        if (hasGrade)
            statusMap.set('REQ-A4-1', 'implemented');
        // Check for matrix display
        const hasMatrix = $('table').length > 0 || html.includes('matrix');
        if (hasMatrix)
            statusMap.set('REQ-A3-1', 'implemented');
    }
    catch (err) {
        console.warn('[agent-0] Could not parse existing report:', err);
    }
    return statusMap;
}
/**
 * Define SQLite schema requirements for Agent 1
 */
function defineSchemaRequirements() {
    return [
        {
            table: 'categories',
            columns: [
                { name: 'id', type: 'INTEGER PRIMARY KEY AUTOINCREMENT' },
                { name: 'code', type: 'TEXT NOT NULL UNIQUE' },
                { name: 'name', type: 'TEXT NOT NULL' },
                { name: 'emoji', type: 'TEXT' },
                { name: 'parent_category', type: 'TEXT' },
                { name: 'trust_debt_units', type: 'INTEGER DEFAULT 0' },
                { name: 'position', type: 'INTEGER' },
                { name: 'description', type: 'TEXT' },
            ],
            indexes: [
                'CREATE INDEX idx_categories_code ON categories(code)',
                'CREATE INDEX idx_categories_parent ON categories(parent_category)',
                'CREATE INDEX idx_categories_position ON categories(position)',
            ],
        },
        {
            table: 'keywords',
            columns: [
                { name: 'id', type: 'INTEGER PRIMARY KEY AUTOINCREMENT' },
                { name: 'keyword', type: 'TEXT NOT NULL' },
                { name: 'category_code', type: 'TEXT NOT NULL' },
                { name: 'intent_count', type: 'INTEGER DEFAULT 0' },
                { name: 'reality_count', type: 'INTEGER DEFAULT 0' },
            ],
            indexes: [
                'CREATE INDEX idx_keywords_keyword ON keywords(keyword)',
                'CREATE INDEX idx_keywords_category ON keywords(category_code)',
                'CREATE UNIQUE INDEX idx_keywords_unique ON keywords(keyword, category_code)',
            ],
        },
        {
            table: 'matrix_cells',
            columns: [
                { name: 'id', type: 'INTEGER PRIMARY KEY AUTOINCREMENT' },
                { name: 'row_category', type: 'TEXT NOT NULL' },
                { name: 'col_category', type: 'TEXT NOT NULL' },
                { name: 'intent_value', type: 'INTEGER DEFAULT 0' },
                { name: 'reality_value', type: 'INTEGER DEFAULT 0' },
                { name: 'trust_debt_units', type: 'INTEGER DEFAULT 0' },
                { name: 'is_upper_triangle', type: 'INTEGER DEFAULT 0' },
                { name: 'is_lower_triangle', type: 'INTEGER DEFAULT 0' },
                { name: 'is_diagonal', type: 'INTEGER DEFAULT 0' },
                { name: 'cell_color', type: 'TEXT' },
            ],
            indexes: [
                'CREATE INDEX idx_matrix_row ON matrix_cells(row_category)',
                'CREATE INDEX idx_matrix_col ON matrix_cells(col_category)',
                'CREATE UNIQUE INDEX idx_matrix_unique ON matrix_cells(row_category, col_category)',
                'CREATE INDEX idx_matrix_triangle ON matrix_cells(is_upper_triangle, is_lower_triangle)',
            ],
        },
    ];
}
/**
 * Group requirements by responsible agent
 */
function groupByAgent(requirements) {
    const grouped = {};
    for (const req of requirements) {
        const agent = req.responsibleAgent;
        if (!grouped[agent])
            grouped[agent] = [];
        grouped[agent].push(req.description);
    }
    return grouped;
}
/**
 * Main execution function for Agent 0
 */
export async function run(outputDir) {
    console.log('[agent-0] Parsing outcome requirements...');
    const comsPath = join(ROOT, 'trust-debt-pipeline-coms.txt');
    const reportPath = join(ROOT, 'trust-debt-report.html');
    // Parse COMS file for requirements
    const { requirements, categories, metadata } = parseComsFile(comsPath);
    // Check existing report for implementation status
    const implementationStatus = parseExistingReport(reportPath);
    // Update requirement status based on existing report
    for (const req of requirements) {
        if (implementationStatus.has(req.id)) {
            req.status = implementationStatus.get(req.id);
        }
    }
    // Define schema requirements
    const schemaRequirements = defineSchemaRequirements();
    // Group requirements by agent
    const agentResponsibilities = groupByAgent(requirements);
    // Calculate statistics
    const stats = {
        totalRequirements: requirements.length,
        implemented: requirements.filter(r => r.status === 'implemented').length,
        partial: requirements.filter(r => r.status === 'partial').length,
        missing: requirements.filter(r => r.status === 'missing').length,
        criticalRequirements: requirements.filter(r => r.priority === 'critical').length,
    };
    const output = {
        step: 0,
        name: 'outcome-requirements',
        timestamp: new Date().toISOString(),
        requirements,
        categories,
        schemaRequirements,
        agentResponsibilities,
        stats,
        metadata,
    };
    // Write output
    const outputPath = join(outputDir, '0-outcome-requirements.json');
    writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`[agent-0] Extracted ${requirements.length} outcome requirements`);
    console.log(`[agent-0] Status: ${stats.implemented} implemented, ${stats.partial} partial, ${stats.missing} missing`);
    console.log(`[agent-0] Critical requirements: ${stats.criticalRequirements}`);
    console.log(`[agent-0] Output written to ${outputPath}`);
}
//# sourceMappingURL=agent-0-outcome-requirements.js.map