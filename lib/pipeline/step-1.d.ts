/**
 * src/pipeline/step-1.ts — Database Indexer & Keyword Extractor (Agent 1)
 *
 * Creates SQLite database with 45-category hierarchical structure in ShortLex order.
 * Extracts keywords using hybrid LLM-regex approach with Intent vs Reality indexing.
 * Provides statistical foundation for downstream agents (2-7).
 *
 * INPUTS:  step-0 raw materials, /docs for Intent, /src for Reality
 * OUTPUTS: 1-indexed-keywords.json, trust-debt-pipeline.db (SQLite)
 *
 * SPECIFICATIONS FROM COMS.txt:
 * - SQLite Database: EXACTLY 45 categories (5 parents + 40 children)
 * - Hierarchical Structure: Perfect ShortLex ordering A🚀→A🚀.1⚡→...→E🎨.8🏆
 * - Matrix Foundation: 45x45 asymmetric matrix (2025 cells) initialization
 * - Keyword Detection: 259 unique keywords with 421 category mappings
 * - Intent vs Reality: Index docs (intent) vs src (reality) occurrences
 * - Database Performance: All indexes for optimal Agent 2-7 query performance
 * - Category Coverage: 100% coverage - ALL 45 categories have mapped keywords
 * - Agent 2 Handoff: Database foundation for orthogonality validation
 */
/**
 * Run step 1: Database indexing and keyword extraction.
 */
export declare function run(runDir: string, stepDir: string): Promise<void>;
//# sourceMappingURL=step-1.d.ts.map