/**
 * src/pipeline/step-3.ts — ShortLex Validation & Matrix Building (Agent 3)
 *
 * RESPONSIBILITIES:
 * - A3📐.1✅ ShortLex Validation: Validate proper ShortLex ordering
 * - A3📐.2🏗️ Matrix Construction: Build asymmetric matrix with precise dimensions
 * - A3📐.3🎯 Cell Population: Populate matrix cells with Intent vs Reality data
 * - A3📐.4🎨 Visual Integration: Integrate with SQLite for visual structure
 *
 * INPUTS:  step-2 balanced categories
 * OUTPUTS: step-3-presence-matrix.json (45x45 asymmetric matrix with ShortLex ordering)
 *
 * SHORTLEX ORDERING RULES:
 * 1. Shorter strings come before longer strings
 * 2. Within same length, sort alphabetically
 * 3. Example: A → A.1 → A.2 → A.3 → A.4 → B → B.1 → B.2 (NOT A.1 → A)
 *
 * MATRIX STRUCTURE:
 * - 45x45 asymmetric matrix (2025 cells total)
 * - Upper△ = Git/Reality implementation data (990 cells)
 * - Lower△ = Documentation/Intent specification data (990 cells)
 * - Diagonal = Category self-consistency (45 cells)
 * - Target Asymmetry Ratio: 12.98x (Building more than documenting)
 */
/**
 * Run step 3: ShortLex validation and matrix building.
 */
export declare function run(runDir: string, stepDir: string): Promise<void>;
//# sourceMappingURL=step-3.d.ts.map