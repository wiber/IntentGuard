/**
 * src/auth/sovereignty.js — Sovereignty Score Calculator
 *
 * Combines trust-debt category grades into a single 0-1 sovereignty score.
 * Implements drift reduction formula when drift events occur.
 *
 * EQUATION:
 *   Sovereignty = 1.0 - (TrustDebtUnits / MaxUnits) * (1 - k_E)^driftEvents
 *
 * WHERE:
 *   - TrustDebtUnits = total units from pipeline step 4
 *   - MaxUnits = boundary for Grade D (3000 units)
 *   - k_E = 0.003 (entropic drift rate per operation, from drift-vs-steering)
 *   - driftEvents = number of FIM deny events (drift catches)
 *
 * INTEGRATION:
 *   - Reads from: 4-grades-statistics.json (trust debt calculation)
 *   - Writes to: IdentityVector.sovereigntyScore (geometric.ts)
 *   - Triggered by: Pipeline Step 4, FIM drift events
 *
 * STATUS: v1.0 — Core sovereignty calculation with drift reduction
 */

// ─── Constants ──────────────────────────────────────────────────────────

/** Entropic drift rate per operation (from drift-vs-steering.tsx) */
const K_E = 0.003;

/** Maximum units for Grade D boundary (3000 = upper bound of Grade C) */
const MAX_TRUST_DEBT_UNITS = 3000;

/** Grade boundaries from the trust-debt pipeline */
const GRADE_BOUNDARIES = {
  A: { min: 0, max: 500, emoji: '🟢', description: 'EXCELLENT' },
  B: { min: 501, max: 1500, emoji: '🟡', description: 'GOOD' },
  C: { min: 1501, max: 3000, emoji: '🟠', description: 'NEEDS ATTENTION' },
  D: { min: 3001, max: Infinity, emoji: '🔴', description: 'REQUIRES WORK' },
};

// ─── Core Calculation ───────────────────────────────────────────────────

/**
 * Calculate raw sovereignty score from trust-debt units.
 *
 * Maps trust debt inversely to sovereignty:
 *   - 0 units → 1.0 sovereignty (perfect)
 *   - 500 units (Grade A max) → 0.833 sovereignty
 *   - 1500 units (Grade B max) → 0.5 sovereignty
 *   - 3000 units (Grade C max) → 0.0 sovereignty
 *   - 3000+ units (Grade D) → negative clamped to 0.0
 *
 * @param {number} trustDebtUnits Total units from pipeline step 4
 * @returns {number} Sovereignty score 0.0 - 1.0
 */
function calculateRawSovereignty(trustDebtUnits) {
  const ratio = trustDebtUnits / MAX_TRUST_DEBT_UNITS;
  const sovereignty = Math.max(0, 1.0 - ratio);
  return Math.min(1.0, sovereignty);
}

/**
 * Apply drift reduction to sovereignty score.
 *
 * Each drift event reduces sovereignty by k_E (0.3%).
 * Uses exponential decay: sovereignty * (1 - k_E)^driftEvents
 *
 * This implements the steering loop step 6:
 * "Drift events reduce sovereignty score for future operations"
 *
 * @param {number} rawSovereignty Sovereignty before drift reduction
 * @param {number} driftEvents Number of FIM deny events
 * @returns {number} Reduced sovereignty score
 */
function applyDriftReduction(rawSovereignty, driftEvents) {
  if (driftEvents === 0) return rawSovereignty;
  const decayFactor = Math.pow(1 - K_E, driftEvents);
  return rawSovereignty * decayFactor;
}

/**
 * Map trust-debt units to letter grade.
 *
 * @param {number} units Total trust-debt units
 * @returns {string} Grade A/B/C/D
 */
function unitsToGrade(units) {
  if (units <= GRADE_BOUNDARIES.A.max) return 'A';
  if (units <= GRADE_BOUNDARIES.B.max) return 'B';
  if (units <= GRADE_BOUNDARIES.C.max) return 'C';
  return 'D';
}

// ─── Category Score Extraction ──────────────────────────────────────────

/**
 * Convert category performance from pipeline to normalized scores.
 *
 * Maps each category's grade to a normalized score:
 *   - Grade A → 0.9 - 1.0 (excellent)
 *   - Grade B → 0.7 - 0.9 (good)
 *   - Grade C → 0.5 - 0.7 (needs attention)
 *   - Grade D → 0.0 - 0.5 (requires work)
 *
 * Uses percentage within grade range for fine-grained scoring.
 *
 * @param {Object} categoryPerformance From 4-grades-statistics.json
 * @returns {Object} Normalized scores by category
 */
function extractCategoryScores(categoryPerformance) {
  const scores = {};

  // Map pipeline category names to TrustDebtCategory
  const categoryMapping = {
    'A🚀_CoreEngine': 'code_quality',
    'B🔒_Documentation': 'documentation',
    'C💨_Visualization': 'user_focus',
    'D🧠_Integration': 'reliability',
    'E🎨_BusinessLayer': 'domain_expertise',
    'F⚡_Agents': 'process_adherence',
  };

  for (const [pipelineName, data] of Object.entries(categoryPerformance)) {
    const category = categoryMapping[pipelineName];
    if (!category) continue;

    // Map grade to score range
    const grade = data.grade;
    const units = data.units;

    let score;
    if (grade === 'A') {
      // A: 0-500 units → 0.9-1.0 score
      const ratio = units / GRADE_BOUNDARIES.A.max;
      score = 1.0 - (ratio * 0.1);
    } else if (grade === 'B') {
      // B: 501-1500 units → 0.7-0.9 score
      const range = GRADE_BOUNDARIES.B.max - GRADE_BOUNDARIES.B.min;
      const offset = units - GRADE_BOUNDARIES.B.min;
      const ratio = offset / range;
      score = 0.9 - (ratio * 0.2);
    } else if (grade === 'C') {
      // C: 1501-3000 units → 0.5-0.7 score
      const range = GRADE_BOUNDARIES.C.max - GRADE_BOUNDARIES.C.min;
      const offset = units - GRADE_BOUNDARIES.C.min;
      const ratio = offset / range;
      score = 0.7 - (ratio * 0.2);
    } else {
      // D: 3001+ units → 0.0-0.5 score
      const excess = units - GRADE_BOUNDARIES.D.min;
      const ratio = Math.min(1, excess / 3000); // Cap at 6000 units
      score = 0.5 - (ratio * 0.5);
    }

    scores[category] = Math.max(0, Math.min(1, score));
  }

  return scores;
}

// ─── Main Calculation ───────────────────────────────────────────────────

/**
 * Calculate complete sovereignty score from trust-debt stats and drift events.
 *
 * This is the main entry point for sovereignty calculation.
 * Integrates with the trust-debt pipeline and FIM guard.
 *
 * @param {Object} trustDebtStats From 4-grades-statistics.json
 * @param {number} driftEvents Number of FIM deny events since last recalc
 * @returns {Object} Complete sovereignty calculation
 */
function calculateSovereignty(trustDebtStats, driftEvents = 0) {
  const units = trustDebtStats.total_units;
  const rawScore = calculateRawSovereignty(units);
  const finalScore = applyDriftReduction(rawScore, driftEvents);
  const driftReduction = driftEvents > 0
    ? ((rawScore - finalScore) / rawScore) * 100
    : 0;

  const grade = unitsToGrade(units);
  const gradeEmoji = GRADE_BOUNDARIES[grade].emoji;
  const categoryScores = extractCategoryScores(trustDebtStats.category_performance);

  return {
    score: finalScore,
    grade,
    gradeEmoji,
    trustDebtUnits: units,
    driftEvents,
    rawScore,
    driftReduction,
    categoryScores,
    timestamp: new Date().toISOString(),
  };
}

// ─── Drift Event Tracking ───────────────────────────────────────────────

/**
 * Count drift events from FIM deny log.
 *
 * In production, this would read from a persistent log.
 * For now, it's a placeholder for the integration point.
 *
 * @param {string} since Only count events after this timestamp
 * @returns {number} Number of drift events
 */
function countDriftEvents(since) {
  // TODO: Read from data/fim-deny-log.jsonl when implemented
  // For now, return 0 as placeholder
  return 0;
}

/**
 * Record a drift event to the FIM deny log.
 *
 * Called by geometric.ts when a permission check fails.
 * Triggers sovereignty recalculation in pipeline step 4.
 *
 * @param {Object} event Drift event details
 */
function recordDriftEvent(event) {
  // TODO: Append to data/fim-deny-log.jsonl when implemented
  console.warn('Drift event recorded:', event);
}

// ─── Sovereignty Decay ──────────────────────────────────────────────────

/**
 * Calculate how many additional drift events would reduce sovereignty to zero.
 *
 * Useful for forecasting and alerting.
 *
 * @param {number} currentSovereignty Current sovereignty score
 * @returns {number} Number of drift events until sovereignty reaches 0
 */
function driftEventsUntilZero(currentSovereignty) {
  if (currentSovereignty <= 0) return 0;

  // Solve: currentSovereignty * (1 - k_E)^n = 0.01 (near-zero)
  // n = log(0.01 / currentSovereignty) / log(1 - k_E)
  const targetSovereignty = 0.01;
  const n = Math.log(targetSovereignty / currentSovereignty) / Math.log(1 - K_E);
  return Math.ceil(n);
}

/**
 * Calculate sovereignty recovery path.
 *
 * Shows how reducing trust-debt units affects sovereignty.
 *
 * @param {number} currentUnits Current trust-debt units
 * @param {number} driftEvents Current drift event count
 * @returns {Array} Recovery milestones
 */
function calculateRecoveryPath(currentUnits, driftEvents) {
  const milestones = [];
  const currentSovereignty = applyDriftReduction(calculateRawSovereignty(currentUnits), driftEvents);

  for (const grade of ['C', 'B', 'A']) {
    const targetUnits = GRADE_BOUNDARIES[grade].min;
    if (targetUnits < currentUnits && currentUnits > GRADE_BOUNDARIES[grade].max) {
      const targetSovereignty = applyDriftReduction(calculateRawSovereignty(targetUnits), driftEvents);
      milestones.push({
        targetGrade: grade,
        unitsNeeded: currentUnits - targetUnits,
        sovereigntyGain: targetSovereignty - currentSovereignty,
      });
    }
  }

  return milestones;
}

// ─── Exports ────────────────────────────────────────────────────────────

module.exports = {
  K_E,
  MAX_TRUST_DEBT_UNITS,
  GRADE_BOUNDARIES,
  calculateRawSovereignty,
  applyDriftReduction,
  unitsToGrade,
  extractCategoryScores,
  calculateSovereignty,
  countDriftEvents,
  recordDriftEvent,
  driftEventsUntilZero,
  calculateRecoveryPath,
};
