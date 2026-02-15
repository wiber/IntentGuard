/**
 * src/federation/index.ts — Federation System Entry Point
 *
 * Exports all federation components for easy importing:
 *   - Tensor overlap computation (cosine similarity)
 *   - Federation registry (persistent bot storage)
 *   - Handshake protocol (bot-to-bot federation)
 */
// Tensor Overlap
export { computeTensorOverlap, isCompatible, geometryHash, ALIGNMENT_THRESHOLD, DIVERGENCE_THRESHOLD, TRUST_THRESHOLD, } from './tensor-overlap';
// Federation Registry
export { FederationRegistry, QUARANTINE_THRESHOLD, DRIFT_WARNING_THRESHOLD, } from './registry';
// Handshake Protocol
export { FederationHandshake, } from './handshake';
//# sourceMappingURL=index.js.map