/**
 * src/pipeline/step-1.ts — Document Processing
 *
 * Parses and normalizes raw materials into a structured format.
 * Extracts key sections, metadata, and prepares for trust signal extraction.
 *
 * INPUTS:  step-0 raw materials
 * OUTPUTS: step-1-processed.json (normalized documents with extracted sections)
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface ProcessedDocument {
  id: string;
  type: string;
  title: string;
  normalizedContent: string;
  sections: string[];
  keywords: string[];
  wordCount: number;
  timestamp: string;
  metadata: Record<string, unknown>;
}

interface ProcessingResult {
  step: 1;
  name: 'document-processing';
  timestamp: string;
  documents: ProcessedDocument[];
  stats: {
    totalProcessed: number;
    totalWords: number;
    avgWordCount: number;
    keywordFrequency: Record<string, number>;
  };
}

/**
 * Normalize text: lowercase, remove excessive whitespace, strip special chars.
 */
function normalizeText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/#{1,6}\s*/g, '') // Remove markdown headers
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1') // Remove bold/italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract sections from content (split by headers or blank lines).
 */
function extractSections(content: string): string[] {
  // Split by markdown headers or double newlines
  const raw = content.split(/(?=^#{1,3}\s)|(?:\n\n)/m);
  return raw
    .map(s => s.trim())
    .filter(s => s.length > 20); // Minimum section length
}

/**
 * Extract keywords from text using simple frequency analysis.
 */
function extractKeywords(text: string): string[] {
  const STOP_WORDS = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'need', 'must', 'to', 'of',
    'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'between', 'and', 'but',
    'or', 'nor', 'not', 'so', 'yet', 'both', 'each', 'few', 'more', 'most',
    'other', 'some', 'such', 'than', 'too', 'very', 'just', 'about', 'also',
    'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their',
    'we', 'our', 'you', 'your', 'he', 'she', 'him', 'her', 'his',
  ]);

  const words = text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').split(/\s+/);
  const freq = new Map<string, number>();

  for (const word of words) {
    if (word.length < 3 || STOP_WORDS.has(word)) continue;
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}

/**
 * Run step 1: process and normalize documents.
 */
export async function run(runDir: string, stepDir: string): Promise<void> {
  console.log('[step-1] Processing documents...');

  // Load step 0 output
  const rawPath = join(runDir, '0-raw-materials', '0-raw-materials.json');
  const raw = JSON.parse(readFileSync(rawPath, 'utf-8'));

  const processed: ProcessedDocument[] = [];
  const globalKeywordFreq: Record<string, number> = {};

  for (const doc of raw.documents) {
    const normalizedContent = normalizeText(doc.content);
    const sections = extractSections(doc.content);
    const keywords = extractKeywords(normalizedContent);
    const wordCount = normalizedContent.split(/\s+/).length;

    // Aggregate keyword frequency
    for (const kw of keywords) {
      globalKeywordFreq[kw] = (globalKeywordFreq[kw] || 0) + 1;
    }

    processed.push({
      id: doc.id,
      type: doc.type,
      title: doc.title,
      normalizedContent,
      sections,
      keywords,
      wordCount,
      timestamp: doc.timestamp,
      metadata: doc.metadata,
    });
  }

  const totalWords = processed.reduce((sum, d) => sum + d.wordCount, 0);

  const result: ProcessingResult = {
    step: 1,
    name: 'document-processing',
    timestamp: new Date().toISOString(),
    documents: processed,
    stats: {
      totalProcessed: processed.length,
      totalWords,
      avgWordCount: processed.length > 0 ? Math.round(totalWords / processed.length) : 0,
      keywordFrequency: Object.fromEntries(
        Object.entries(globalKeywordFreq)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 50),
      ),
    },
  };

  writeFileSync(
    join(stepDir, '1-document-processing.json'),
    JSON.stringify(result, null, 2),
  );

  console.log(`[step-1] Processed ${processed.length} documents (${totalWords} total words)`);
}
