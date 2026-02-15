/**
 * src/pipeline/types.ts — Pipeline Type Definitions
 *
 * Shared TypeScript interfaces for the 8-step Trust Debt pipeline.
 * Used across all pipeline steps for type safety and validation.
 */
// ─── Type Guards ──────────────────────────────────────────────
export function isRawMaterials(obj) {
    return typeof obj === 'object' && obj !== null &&
        'step' in obj && obj.step === 0 &&
        'documents' in obj && Array.isArray(obj.documents);
}
export function isProcessingResult(obj) {
    return typeof obj === 'object' && obj !== null &&
        'step' in obj && obj.step === 1 &&
        'documents' in obj && Array.isArray(obj.documents);
}
export function isOrganicExtraction(obj) {
    return typeof obj === 'object' && obj !== null &&
        'step' in obj && obj.step === 2 &&
        'signals' in obj && Array.isArray(obj.signals);
}
export function isFrequencyAnalysis(obj) {
    return typeof obj === 'object' && obj !== null &&
        'step' in obj && obj.step === 3 &&
        'categories' in obj && Array.isArray(obj.categories);
}
export function isGradesStatistics(obj) {
    return typeof obj === 'object' && obj !== null &&
        'step' in obj && obj.step === 4 &&
        'overallGrade' in obj;
}
export function isGoalAlignmentResult(obj) {
    return typeof obj === 'object' && obj !== null &&
        'step' in obj && obj.step === 5 &&
        'alignments' in obj && Array.isArray(obj.alignments);
}
export function isSymmetricMatrix(obj) {
    return typeof obj === 'object' && obj !== null &&
        'step' in obj && obj.step === 6 &&
        'matrix' in obj && Array.isArray(obj.matrix);
}
export function isFinalReport(obj) {
    return typeof obj === 'object' && obj !== null &&
        'step' in obj && obj.step === 7 &&
        'executiveSummary' in obj;
}
export function isTrustDebtGrade(value) {
    return typeof value === 'string' && ['A', 'B', 'C', 'D'].includes(value);
}
//# sourceMappingURL=types.js.map