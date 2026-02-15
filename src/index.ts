/**
 * IntentGuard - Mathematical foundation for AI trust measurement
 *
 * Quantifies alignment between intent and reality through convergent properties.
 * The only system that makes AI trust measurable, insurable, and legally defensible.
 *
 * @packageDocumentation
 */

// Core types and interfaces
export * from './types';

// ═══════════════════════════════════════════════════════════════════════════
// FIM Authentication Layer - Fractal Identity Map (IAMFIM)
// Open-source geometric permission engine based on 20-dimensional trust vectors
//
// NOW FULLY OPEN-SOURCED:
// - 20-dimensional identity vectors derived from trust-debt pipeline
// - Geometric overlap computation via cosine similarity
// - 40+ action requirements (git, file system, database, communication, deployment, financial)
// - Runtime enforcement with FimInterceptor
// - Drift detection & self-healing feedback loop
// - Comprehensive audit logging
// - OpenClaw plugin generation
// - Performance benchmarking (0.0004ms per check)
//
// Usage:
//   import { checkPermission, loadIdentityFromPipeline, getActionRequirement } from 'intentguard/auth';
//   const identity = loadIdentityFromPipeline('./data/pipeline-runs/latest');
//   const requirement = getActionRequirement('git_push');
//   const result = checkPermission(identity, requirement);
//   if (result.allowed) { /* execute */ }
//
// See src/auth/README.md for full documentation
// ═══════════════════════════════════════════════════════════════════════════

// Export ALL FIM auth components via the comprehensive auth/index.ts module
export * from './auth/index.js';

// Legacy named exports for backward compatibility
export { FimInterceptor as FIMInterceptor } from './auth/fim-interceptor.js';
export { AuditLogger } from './auth/audit-logger.js';

// Skills and capabilities
export { WalletLedger } from './skills/wallet-ledger';
export { CostReporter } from './skills/cost-reporter';
export { ArtifactGenerator } from './skills/artifact-generator';
export { ArtifactComparison } from './skills/artifact-comparison';

// Pipeline system
export { PipelineRunner } from './pipeline/runner';
export * from './pipeline/types';

// Grid system
export * from './grid';

// Federation and coordination
export * from './federation';

// Progress tracking
export { ProgressTracker } from './progress-tracker';

// ═══════════════════════════════════════════════════════════════════════════
// Agent Pool & Swarm Coordination - Claude Flow (50 concurrent agents)
// Manages parallel task execution with sovereignty gating and file conflict resolution
//
// Features:
// - Up to 50 concurrent Claude agents for task subdivision
// - Priority-based task queue with automatic retry
// - File claim coordination to prevent concurrent modification
// - Sovereignty-gated operations (0.5-0.9 based on risk)
// - Shared memory JSONL for cross-agent communication
// - Health monitoring with automatic timeout detection
//
// Usage:
//   import { getPoolManager, executeParallel, getPoolStats } from 'intentguard/swarm';
//   await getPoolManager().initialize(ctx);
//   const result = await executeParallel({
//     description: 'Implement auth system',
//     targetFiles: ['src/auth/login.ts', 'src/auth/logout.ts'],
//     operation: 'implement',
//     priority: 'high'
//   }, ctx, sovereigntyScore);
//
// See docs/agent-pool-integration-example.ts for full integration examples
// ═══════════════════════════════════════════════════════════════════════════
export * from './swarm/index.js';

/**
 * Current version of IntentGuard
 */
export const VERSION = '1.8.3';

/**
 * IntentGuard brand information
 */
export const BRAND = {
  name: 'IntentGuard',
  tagline: 'Mathematical foundation for AI trust measurement',
  website: 'https://github.com/wiber/IntentGuard',
  license: 'MIT'
} as const;
