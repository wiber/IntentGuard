/**
 * src/federation/index.ts — Federation System Entry Point
 *
 * Exports all federation components for easy importing:
 *   - Tensor overlap computation (cosine similarity)
 *   - Federation registry (persistent bot storage)
 *   - Handshake protocol (bot-to-bot federation)
 */
export { computeTensorOverlap, isCompatible, geometryHash, ALIGNMENT_THRESHOLD, DIVERGENCE_THRESHOLD, TRUST_THRESHOLD, TensorOverlapResult, } from './tensor-overlap';
export { FederationRegistry, QUARANTINE_THRESHOLD, DRIFT_WARNING_THRESHOLD, BotEntry, BotStatus, DriftCheck, } from './registry';
export { FederationHandshake, HandshakeRequest, HandshakeResponse, FederationChannel, } from './handshake';
//# sourceMappingURL=index.d.ts.map