/**
 * IntentGuard - Mathematical foundation for AI trust measurement
 *
 * Quantifies alignment between intent and reality through convergent properties.
 * The only system that makes AI trust measurable, insurable, and legally defensible.
 *
 * @packageDocumentation
 */
export * from './types';
export * from './auth/index.js';
export { FimInterceptor as FIMInterceptor } from './auth/fim-interceptor.js';
export { AuditLogger } from './auth/audit-logger.js';
export { WalletLedger } from './skills/wallet-ledger';
export { CostReporter } from './skills/cost-reporter';
export { ArtifactGenerator } from './skills/artifact-generator';
export { ArtifactComparison } from './skills/artifact-comparison';
export { PipelineRunner } from './pipeline/runner';
export * from './pipeline/types';
export * from './grid';
export * from './federation';
export { ProgressTracker } from './progress-tracker';
export * from './swarm/index.js';
/**
 * Current version of IntentGuard
 */
export declare const VERSION = "1.8.3";
/**
 * IntentGuard brand information
 */
export declare const BRAND: {
    readonly name: "IntentGuard";
    readonly tagline: "Mathematical foundation for AI trust measurement";
    readonly website: "https://github.com/wiber/IntentGuard";
    readonly license: "MIT";
};
//# sourceMappingURL=index.d.ts.map