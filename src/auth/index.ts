/**
 * @intentguard/auth - Fractal Identity Map (FIM) Authentication Layer
 *
 * Open-source geometric permission engine based on 20-dimensional trust vectors.
 *
 * ## What is FIM?
 *
 * **Fractal Identity Map (IAMFIM)** is a mathematical permission system that uses
 * geometric overlap in a 20-dimensional trust-debt vector space to determine whether
 * an AI agent or user should be allowed to execute a specific action.
 *
 * **Core Concept:**
 * - **Identity** = 20-dimensional vector representing trust-debt category scores (0.0-1.0)
 * - **Action Requirement** = Sparse vector defining minimum scores per category
 * - **Permission** = Geometric overlap >= threshold AND sovereignty >= minimum
 *
 * **Mathematical Foundation:**
 * ```
 * Permission(user, action) = Identity(user) ∩ Requirement(action) >= Threshold
 * ```
 *
 * Where:
 * - **Identity vector** comes from trust-debt pipeline analysis (20 dimensions)
 * - **Requirements** are defined per tool/action in ACTION_MAP
 * - **Overlap** is computed via cosine similarity in 20D space
 * - **Sovereignty** is the weighted average trust score across all dimensions
 *
 * ## Quick Start
 *
 * ```typescript
 * import {
 *   checkPermission,
 *   loadIdentityFromPipeline,
 *   ACTION_MAP,
 *   getActionRequirement,
 *   type IdentityVector
 * } from 'intentguard/auth';
 *
 * // 1. Load identity from trust-debt pipeline
 * const identity: IdentityVector = loadIdentityFromPipeline('./data/pipeline-runs/latest');
 *
 * console.log('Sovereignty score:', identity.sovereigntyScore);
 * console.log('Security score:', identity.categoryScores.security);
 *
 * // 2. Check permission for git push
 * const requirement = getActionRequirement('git_push');
 * if (requirement) {
 *   const result = checkPermission(identity, requirement);
 *
 *   if (result.allowed) {
 *     console.log('✅ Permission granted - executing git push');
 *     // Execute git push
 *   } else {
 *     console.log('❌ Permission denied');
 *     console.log('Overlap:', result.overlap.toFixed(3));
 *     console.log('Sovereignty:', result.sovereignty.toFixed(3));
 *     console.log('Failed categories:', result.failedCategories);
 *   }
 * }
 *
 * // 3. Use FIM Interceptor for automated enforcement
 * import { FimInterceptor } from 'intentguard/auth';
 *
 * const interceptor = new FimInterceptor(logger, './data');
 *
 * // Configure denial callback
 * interceptor.onDenial = async (event) => {
 *   console.log('🔴 FIM DENIED:', event.toolName);
 *   console.log('   Overlap:', event.overlap.toFixed(3));
 *   console.log('   Failed:', event.failedCategories.join(', '));
 *   // Post to transparency engine, alert team, etc.
 * };
 *
 * // Configure drift threshold callback
 * interceptor.onDriftThreshold = async () => {
 *   console.log('⚠️  Drift threshold reached - recalibrating');
 *   // Trigger trust-debt pipeline re-run
 * };
 *
 * // Intercept skill execution
 * const denial = await interceptor.intercept('shell_execute', { command: 'rm -rf /' });
 * if (denial) {
 *   console.error('Blocked:', denial.message);
 * } else {
 *   // Execute skill
 * }
 * ```
 *
 * ## Architecture Overview
 *
 * ```
 * Trust Debt Pipeline (Agents 0-7)
 *         ↓
 * 4-grades-statistics.json
 *         ↓
 * Identity Vector Loader (20-dimensional)
 *         ↓
 * FIM Interceptor (runtime enforcement)
 *         ↓
 * Permission Check (geometric overlap + sovereignty)
 *         ↓
 * ALLOW / DENY
 *         ↓
 * Audit Log + Drift Tracking
 * ```
 *
 * **Module Breakdown:**
 *
 * 1. **geometric.ts** - Core vector math (dot product, cosine similarity, overlap computation)
 * 2. **action-map.ts** - Tool requirements registry (40+ tools with risk levels)
 * 3. **sovereignty.ts** - Sovereignty score calculation with drift reduction
 * 4. **identity-vector.ts** - Identity loading from pipeline output
 * 5. **fim-interceptor.ts** - Runtime permission enforcement with drift feedback
 * 6. **audit-logger.ts** - Permission decision audit trail (JSONL format)
 * 7. **plugin.ts** - OpenClaw plugin code generation for external integration
 * 8. **benchmark.ts** - Performance benchmarking (0.0004ms per check)
 *
 * ## The 20 Trust-Debt Categories
 *
 * Each identity vector has scores for these orthogonal dimensions:
 *
 * 1. **security** - Protection against unauthorized access
 * 2. **reliability** - Consistent, predictable behavior
 * 3. **data_integrity** - Accuracy and consistency of data
 * 4. **process_adherence** - Following established workflows
 * 5. **code_quality** - Maintainable, well-structured code
 * 6. **testing** - Test coverage and quality
 * 7. **documentation** - Clear, up-to-date documentation
 * 8. **communication** - Clear, timely communication
 * 9. **time_management** - Meeting deadlines and efficiency
 * 10. **resource_efficiency** - Optimal resource usage
 * 11. **risk_assessment** - Identifying and mitigating risks
 * 12. **compliance** - Adherence to regulations and standards
 * 13. **innovation** - Creative problem-solving and new approaches
 * 14. **collaboration** - Working effectively with others
 * 15. **accountability** - Ownership of actions and outcomes
 * 16. **transparency** - Openness about decisions and processes
 * 17. **adaptability** - Flexibility in changing conditions
 * 18. **domain_expertise** - Deep knowledge of relevant domains
 * 19. **user_focus** - Prioritizing user needs and experience
 * 20. **ethical_alignment** - Adherence to ethical principles
 *
 * ## Key Features
 *
 * ### 🔐 Geometric Permission Checks
 * - 20-dimensional vector space (one per trust-debt category)
 * - Cosine similarity for overlap (0.0 - 1.0)
 * - Configurable threshold (default 0.8)
 * - Fail-open for undefined tools (logged but allowed)
 *
 * ### 📊 Sovereignty Score
 * - Weighted average of category scores
 * - Includes orthogonality bonus from pipeline
 * - Drift reduction: `sovereignty *= (1 - k_E)^driftEvents`
 * - Secondary permission gate
 *
 * ### 🚨 Drift Detection & Feedback Loop
 * - Consecutive denials tracked (threshold: 3)
 * - Triggers pipeline re-run to recalibrate
 * - All denials logged to `fim-denials.jsonl`
 * - Heat map updates track usage patterns
 *
 * ### 🛠️ Action Requirement Map
 * - 40+ tools mapped to required scores
 * - Risk levels: low (0.2), medium (0.5), high (0.7), critical (0.9+)
 * - Categories: git, file system, database, communication, deployment, financial
 * - Extensible for custom tools
 *
 * ### 📝 Transparency & Auditability
 * - Every permission check logged with timestamp
 * - Failed categories explicitly listed
 * - Overlap and sovereignty scores recorded
 * - Supports compliance and post-incident analysis
 *
 * ### ⚡ Performance
 * - **0.0004ms** per overlap computation (benchmarked)
 * - Identity caching with 5-minute TTL
 * - Zero runtime dependencies for core math
 * - Suitable for real-time enforcement
 *
 * ## Integration Patterns
 *
 * ### Pattern 1: Standalone Permission Checks
 * ```typescript
 * import { checkPermission, loadIdentityFromPipeline, getActionRequirement } from 'intentguard/auth';
 *
 * const identity = loadIdentityFromPipeline('./data/pipeline-runs/latest');
 * const requirement = getActionRequirement('git_push');
 *
 * if (requirement) {
 *   const result = checkPermission(identity, requirement);
 *   if (result.allowed) {
 *     // Execute action
 *   }
 * }
 * ```
 *
 * ### Pattern 2: Runtime Interception
 * ```typescript
 * import { FimInterceptor } from 'intentguard/auth';
 *
 * const interceptor = new FimInterceptor(logger, dataDir);
 * const denial = await interceptor.intercept(skillName, payload);
 * if (!denial) {
 *   // Allowed - execute skill
 * }
 * ```
 *
 * ### Pattern 3: OpenClaw Plugin
 * ```typescript
 * import { generateFimPlugin, installFimPlugin } from 'intentguard/auth';
 *
 * const pluginCode = generateFimPlugin({
 *   identityPath: './data/identity.json',
 *   actionMapPath: './data/action-map.json',
 * });
 *
 * await installFimPlugin(pluginCode, '~/.openclaw/plugins/fim-auth.js');
 * ```
 *
 * ## License
 *
 * **MIT** - Free for commercial and non-commercial use
 *
 * @module @intentguard/auth
 * @version 2.0.0
 * @license MIT
 * @packageDocumentation
 */

// ═══════════════════════════════════════════════════════════════════════════
// Core Geometric Engine (geometric.ts)
// ═══════════════════════════════════════════════════════════════════════════

export {
  // Types
  type IdentityVector,
  type ActionRequirement,
  type PermissionResult,
  type TrustDebtCategory,

  // Constants
  TRUST_DEBT_CATEGORIES,
  DEFAULT_REQUIREMENTS,

  // Vector Operations (20-dimensional math)
  identityToVector,
  requirementToVector,
  dotProduct,
  magnitude,
  cosineSimilarity,

  // Overlap Computation
  computeOverlap,              // v0.2: Cosine similarity-based
  computeOverlapThreshold,     // v0.1: Threshold-based (backward compat)

  // Permission Checking
  checkPermission,

  // Identity Loading
  loadIdentityFromPipeline,
  getRequirement,
} from './geometric.js';

// ═══════════════════════════════════════════════════════════════════════════
// Action Requirements Map (action-map.ts)
// ═══════════════════════════════════════════════════════════════════════════

export {
  // Action Map (40+ tools)
  ACTION_MAP,

  // Lookup Functions
  getActionRequirement,
  hasActionRequirement,
  getAllToolNames,
  getAllRequirements,
  getActionsBySovereignty,
  getActionsByCategory,

  // Risk Levels
  getRiskLevel,

  // Constants
  DEFAULT_OVERLAP_THRESHOLD,
  SOVEREIGNTY_LEVELS,
} from './action-map.js';

// ═══════════════════════════════════════════════════════════════════════════
// Sovereignty Score Calculation (sovereignty.ts)
// ═══════════════════════════════════════════════════════════════════════════

export {
  // Types
  type TrustDebtStats,
  type DriftEvent,
  type SovereigntyCalculation,
  type Grade,

  // Core Calculation
  calculateSovereignty,
  calculateRawSovereignty,
  applyDriftReduction,

  // Grade Mapping
  unitsToGrade,

  // Category Score Extraction
  extractCategoryScores,

  // Drift Event Tracking
  countDriftEvents,
  recordDriftEvent,

  // Forecasting & Recovery
  driftEventsUntilZero,
  calculateRecoveryPath,

  // Constants
  K_E,
  MAX_TRUST_DEBT_UNITS,
  GRADE_BOUNDARIES,
} from './sovereignty.js';

// ═══════════════════════════════════════════════════════════════════════════
// Identity Vector Loading (identity-vector.ts)
// ═══════════════════════════════════════════════════════════════════════════

export {
  // Load Functions
  loadIdentityVector,
  loadIdentityVectorDefault,

  // Conversion Utilities
  normalizeRawVector,
  vectorToRaw,

  // Cache Management
  clearCache,
  getCacheStats,
} from './identity-vector.js';

// ═══════════════════════════════════════════════════════════════════════════
// Identity Vector Validation (identity-vector-validate.ts)
// NOTE: This module is internal-only, not exported for external use
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// FIM Interceptor - Runtime Enforcement (fim-interceptor.ts)
// ═══════════════════════════════════════════════════════════════════════════

export {
  // Interceptor Class
  FimInterceptor,

  // Types
  type FimDenialEvent,
} from './fim-interceptor.js';

// ═══════════════════════════════════════════════════════════════════════════
// Audit Logging (audit-logger.ts)
// ═══════════════════════════════════════════════════════════════════════════

export {
  // Audit Logger Class (named FimAuditLogger in source)
  FimAuditLogger as AuditLogger,

  // Types
  type FimAuditRecord,
  type FimDecision,
  type AuditQuery,
  type AuditStats,
} from './audit-logger.js';

// ═══════════════════════════════════════════════════════════════════════════
// OpenClaw Plugin Generation (plugin.ts)
// ═══════════════════════════════════════════════════════════════════════════

export {
  // Plugin Functions
  generatePluginCode as generateFimPlugin,
  installPlugin as installFimPlugin,
  getDefaultPluginDir,

  // Types
  type OpenClawPlugin,
} from './plugin.js';

// ═══════════════════════════════════════════════════════════════════════════
// Performance Benchmarking (benchmark.ts)
// NOTE: Benchmark module exists but exports are not yet standardized
// Use the module directly for now: import { ... } from 'intentguard/auth/benchmark'
// ═══════════════════════════════════════════════════════════════════════════

export {
  // Types
  type BenchmarkResult,
} from './benchmark.js';

// ═══════════════════════════════════════════════════════════════════════════
// Package Metadata & Quick Start
// ═══════════════════════════════════════════════════════════════════════════

/**
 * FIM Auth Layer Version
 */
export const FIM_VERSION = '2.0.0';

/**
 * Package name
 */
export const PACKAGE_NAME = '@intentguard/auth';

/**
 * License
 */
export const LICENSE = 'MIT';

/**
 * Homepage
 */
export const HOMEPAGE = 'https://github.com/wiber/IntentGuard';

/**
 * Quick start example for standalone usage
 */
export const QUICKSTART_EXAMPLE = `
// Install IntentGuard
npm install intentguard

// Import FIM auth layer
import {
  checkPermission,
  loadIdentityFromPipeline,
  getActionRequirement,
  FimInterceptor
} from 'intentguard/auth';

// 1. Load identity from trust-debt pipeline
const identity = loadIdentityFromPipeline('./data/pipeline-runs/latest');
console.log('Sovereignty:', identity.sovereigntyScore.toFixed(3));

// 2. Check permission for git push
const requirement = getActionRequirement('git_push');
if (requirement) {
  const result = checkPermission(identity, requirement);

  if (result.allowed) {
    console.log('✅ Allowed - overlap:', result.overlap.toFixed(3));
    // Execute git push
  } else {
    console.log('❌ Denied - failed:', result.failedCategories.join(', '));
  }
}

// 3. Use FIM Interceptor for runtime enforcement
const interceptor = new FimInterceptor(logger, './data');
interceptor.onDenial = async (event) => {
  console.log('🔴 FIM DENIED:', event.toolName);
};

const denial = await interceptor.intercept('shell_execute', payload);
if (!denial) {
  // Allowed - execute skill
}
`;

/**
 * Minimal example for quick testing
 */
export const MINIMAL_EXAMPLE = `
import { checkPermission, loadIdentityFromPipeline, getActionRequirement } from 'intentguard/auth';

const identity = loadIdentityFromPipeline('./data/pipeline-runs/latest');
const requirement = getActionRequirement('git_push');

if (requirement) {
  const result = checkPermission(identity, requirement);
  console.log(result.allowed ? '✅ ALLOWED' : '❌ DENIED');
}
`;
