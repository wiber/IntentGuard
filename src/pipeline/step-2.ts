/**
 * src/pipeline/step-2.ts — Organic Extraction
 *
 * Extracts trust signals from processed documents.
 * Maps content to the 20 trust-debt categories using keyword patterns.
 *
 * INPUTS:  step-1 processed documents
 * OUTPUTS: step-2-organic-extraction.json (trust signals per document)
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { TRUST_DEBT_CATEGORIES, type TrustDebtCategory } from '../auth/geometric.js';

/** Keyword patterns for each trust-debt category */
const CATEGORY_PATTERNS: Record<TrustDebtCategory, string[]> = {
  security: ['security', 'auth', 'encrypt', 'vulnerability', 'permission', 'access', 'credential', 'token', 'secret', 'firewall'],
  reliability: ['reliable', 'uptime', 'availability', 'fault', 'resilient', 'recovery', 'backup', 'failover', 'stable', 'crash'],
  data_integrity: ['data', 'integrity', 'consistent', 'corrupt', 'validate', 'schema', 'migration', 'database', 'backup', 'sync'],
  process_adherence: ['process', 'workflow', 'procedure', 'standard', 'protocol', 'guideline', 'policy', 'compliance', 'audit', 'checklist'],
  code_quality: ['refactor', 'clean', 'lint', 'quality', 'technical debt', 'code review', 'pattern', 'architecture', 'solid', 'dry'],
  testing: ['test', 'spec', 'assert', 'coverage', 'unit', 'integration', 'e2e', 'mock', 'fixture', 'regression'],
  documentation: ['doc', 'readme', 'comment', 'api doc', 'guide', 'tutorial', 'wiki', 'changelog', 'jsdoc', 'typedoc'],
  communication: ['communicate', 'message', 'notify', 'email', 'slack', 'discord', 'channel', 'announcement', 'update', 'report'],
  time_management: ['deadline', 'schedule', 'sprint', 'milestone', 'timeline', 'priority', 'urgent', 'overdue', 'estimate', 'velocity'],
  resource_efficiency: ['performance', 'optimize', 'memory', 'cpu', 'bandwidth', 'cache', 'latency', 'throughput', 'efficient', 'scale'],
  risk_assessment: ['risk', 'threat', 'vulnerability', 'impact', 'likelihood', 'mitigation', 'contingency', 'exposure', 'assess', 'evaluate'],
  compliance: ['compliance', 'regulation', 'legal', 'gdpr', 'hipaa', 'license', 'terms', 'privacy', 'consent', 'audit'],
  innovation: ['innovate', 'experiment', 'prototype', 'novel', 'creative', 'research', 'explore', 'breakthrough', 'invent', 'patent'],
  collaboration: ['collaborate', 'team', 'pair', 'review', 'merge', 'contribute', 'shared', 'together', 'coordinate', 'sync'],
  accountability: ['accountable', 'responsible', 'owner', 'commit', 'deliver', 'promise', 'follow-up', 'track', 'measure', 'report'],
  transparency: ['transparent', 'open', 'visible', 'public', 'disclose', 'share', 'honest', 'clear', 'accessible', 'audit'],
  adaptability: ['adapt', 'flexible', 'pivot', 'change', 'evolve', 'iterate', 'agile', 'responsive', 'dynamic', 'adjust'],
  domain_expertise: ['domain', 'expert', 'specialist', 'knowledge', 'experience', 'deep', 'mastery', 'insight', 'understanding', 'skill'],
  user_focus: ['user', 'customer', 'client', 'ux', 'usability', 'feedback', 'satisfaction', 'persona', 'journey', 'accessibility'],
  ethical_alignment: ['ethical', 'moral', 'fair', 'bias', 'equity', 'inclusive', 'responsible', 'sustainable', 'trust', 'integrity'],
};

interface TrustSignal {
  category: TrustDebtCategory;
  strength: number; // 0.0-1.0
  evidence: string[];
  matchCount: number;
}

interface DocumentSignals {
  documentId: string;
  documentType: string;
  documentTitle: string;
  signals: TrustSignal[];
  dominantCategory: TrustDebtCategory | null;
  signalDensity: number; // signals per 100 words
}

interface ExtractionResult {
  step: 2;
  name: 'organic-extraction';
  timestamp: string;
  documents: DocumentSignals[];
  globalSignals: Record<TrustDebtCategory, { totalStrength: number; documentCount: number }>;
  stats: {
    documentsAnalyzed: number;
    totalSignals: number;
    categoriesDetected: number;
    avgSignalsPerDocument: number;
  };
}

/**
 * Extract trust signals from a single document.
 */
function extractSignals(content: string, wordCount: number): TrustSignal[] {
  const normalizedContent = content.toLowerCase();
  const signals: TrustSignal[] = [];

  for (const category of TRUST_DEBT_CATEGORIES) {
    const patterns = CATEGORY_PATTERNS[category];
    const evidence: string[] = [];
    let matchCount = 0;

    for (const pattern of patterns) {
      const regex = new RegExp(pattern, 'gi');
      const matches = normalizedContent.match(regex);
      if (matches) {
        matchCount += matches.length;
        evidence.push(`${pattern} (${matches.length}x)`);
      }
    }

    if (matchCount > 0) {
      // Strength scales logarithmically with match count, normalized by doc length
      const density = matchCount / Math.max(1, wordCount / 100);
      const strength = Math.min(1.0, Math.log2(1 + density) / 3);

      signals.push({ category, strength, evidence, matchCount });
    }
  }

  // Sort by strength descending
  signals.sort((a, b) => b.strength - a.strength);
  return signals;
}

/**
 * Run step 2: extract organic trust signals.
 */
export async function run(runDir: string, stepDir: string): Promise<void> {
  console.log('[step-2] Extracting organic trust signals...');

  // Load step 1 output
  const processedPath = join(runDir, '1-document-processing', '1-document-processing.json');
  const processed = JSON.parse(readFileSync(processedPath, 'utf-8'));

  const documentSignals: DocumentSignals[] = [];
  const globalSignals: Record<string, { totalStrength: number; documentCount: number }> = {};

  // Initialize global signals
  for (const cat of TRUST_DEBT_CATEGORIES) {
    globalSignals[cat] = { totalStrength: 0, documentCount: 0 };
  }

  let totalSignals = 0;

  for (const doc of processed.documents) {
    const signals = extractSignals(doc.normalizedContent, doc.wordCount);
    totalSignals += signals.length;

    // Update global aggregates
    for (const signal of signals) {
      globalSignals[signal.category].totalStrength += signal.strength;
      globalSignals[signal.category].documentCount += 1;
    }

    const dominantCategory = signals.length > 0 ? signals[0].category : null;
    const signalDensity = doc.wordCount > 0 ? (signals.length / doc.wordCount) * 100 : 0;

    documentSignals.push({
      documentId: doc.id,
      documentType: doc.type,
      documentTitle: doc.title,
      signals,
      dominantCategory,
      signalDensity,
    });
  }

  const categoriesDetected = Object.values(globalSignals).filter(g => g.documentCount > 0).length;

  const result: ExtractionResult = {
    step: 2,
    name: 'organic-extraction',
    timestamp: new Date().toISOString(),
    documents: documentSignals,
    globalSignals: globalSignals as ExtractionResult['globalSignals'],
    stats: {
      documentsAnalyzed: documentSignals.length,
      totalSignals,
      categoriesDetected,
      avgSignalsPerDocument: documentSignals.length > 0
        ? Math.round(totalSignals / documentSignals.length * 10) / 10
        : 0,
    },
  };

  writeFileSync(
    join(stepDir, '2-organic-extraction.json'),
    JSON.stringify(result, null, 2),
  );

  console.log(`[step-2] Extracted ${totalSignals} signals across ${categoriesDetected} categories from ${documentSignals.length} documents`);
}
