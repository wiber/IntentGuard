/**
 * Tests for step-6 (Analysis & Narrative Generator)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { run } from './step-6.js';

const TEST_RUN_DIR = join(process.cwd(), 'test-run-step-6');
const TEST_STEP_DIR = join(TEST_RUN_DIR, '6-analysis-narratives');

describe('step-6: Analysis & Narrative Generator', () => {
  beforeEach(() => {
    // Clean up and create test directories
    if (existsSync(TEST_RUN_DIR)) {
      rmSync(TEST_RUN_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_RUN_DIR, { recursive: true });
    mkdirSync(TEST_STEP_DIR, { recursive: true });

    // Create test grades data
    const gradesDir = join(TEST_RUN_DIR, '4-grades-statistics');
    mkdirSync(gradesDir, { recursive: true });
    writeFileSync(
      join(gradesDir, '4-grades-statistics.json'),
      JSON.stringify({
        step: 4,
        name: 'grades-statistics',
        grade: 'B',
        total_units: 860,
        description: 'GOOD - Solid project with minor attention areas',
        by_category: [
          { category: 'A🛡️ Security & Trust Governance', units: 180, percentage: 20.9 },
          { category: 'B⚡ Performance & Optimization', units: 120, percentage: 14.0 },
          { category: 'C🎨 User Experience & Interfaces', units: 280, percentage: 32.6 },
          { category: 'D🔧 Development & Integration', units: 80, percentage: 9.3 },
          { category: 'E💼 Business & Strategy', units: 200, percentage: 23.3 },
        ],
      }),
    );

    // Create test alignment data
    const alignmentDir = join(TEST_RUN_DIR, '5-goal-alignment');
    mkdirSync(alignmentDir, { recursive: true });
    writeFileSync(
      join(alignmentDir, '5-goal-alignment.json'),
      JSON.stringify({
        step: 5,
        name: 'goal-alignment',
        alignment: {
          overall: 0.897,
          grade: 'B',
          interpretation: 'Good alignment with minor drift',
        },
        drifts: [
          {
            category: 'A🛡️ Security & Trust Governance',
            intentScore: 0.8,
            realityScore: 0.75,
            drift: 0.05,
            severity: 'minor',
          },
          {
            category: 'C🎨 User Experience & Interfaces',
            intentScore: 0.6,
            realityScore: 0.4,
            drift: 0.2,
            severity: 'significant',
          },
        ],
      }),
    );
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(TEST_RUN_DIR)) {
      rmSync(TEST_RUN_DIR, { recursive: true, force: true });
    }
  });

  it('should generate analysis narratives JSON', async () => {
    await run(TEST_RUN_DIR, TEST_STEP_DIR);

    const outputPath = join(TEST_STEP_DIR, '6-analysis-narratives.json');
    expect(existsSync(outputPath)).toBe(true);

    const result = JSON.parse(readFileSync(outputPath, 'utf-8'));
    expect(result.step).toBe(6);
    expect(result.name).toBe('analysis-narratives');
  });

  it('should include metadata', async () => {
    await run(TEST_RUN_DIR, TEST_STEP_DIR);

    const result = JSON.parse(
      readFileSync(join(TEST_STEP_DIR, '6-analysis-narratives.json'), 'utf-8'),
    );

    expect(result.metadata).toBeDefined();
    expect(result.metadata.agent).toContain('Agent 6');
    expect(result.metadata.analysis_type).toContain('Cold Spot');
    expect(result.metadata.input_files).toBeInstanceOf(Array);
    expect(result.metadata.input_files.length).toBeGreaterThan(0);
  });

  it('should generate executive summary', async () => {
    await run(TEST_RUN_DIR, TEST_STEP_DIR);

    const result = JSON.parse(
      readFileSync(join(TEST_STEP_DIR, '6-analysis-narratives.json'), 'utf-8'),
    );

    expect(result.executive_summary).toBeDefined();
    expect(result.executive_summary.grade).toBe('B');
    expect(result.executive_summary.trust_debt_units).toBe(860);
    expect(result.executive_summary.legitimacy_score).toMatch(/\d+%/);
    expect(result.executive_summary.process_health).toBeDefined();
  });

  it('should identify cold spots', async () => {
    await run(TEST_RUN_DIR, TEST_STEP_DIR);

    const result = JSON.parse(
      readFileSync(join(TEST_STEP_DIR, '6-analysis-narratives.json'), 'utf-8'),
    );

    expect(result.cold_spots).toBeDefined();
    expect(result.cold_spots.total).toBeGreaterThanOrEqual(0);
    expect(result.cold_spots.by_severity).toBeDefined();
    expect(result.cold_spots.top_10).toBeInstanceOf(Array);

    // Check cold spot structure if any exist
    if (result.cold_spots.top_10.length > 0) {
      const spot = result.cold_spots.top_10[0];
      expect(spot.category).toBeDefined();
      expect(spot.severity).toMatch(/frozen|arctic|cold|cool/);
      expect(spot.temperature).toBeDefined();
      expect(spot.score).toBeGreaterThanOrEqual(0);
      expect(spot.score).toBeLessThanOrEqual(1);
      expect(spot.interpretation).toBeDefined();
      expect(spot.evidence).toBeInstanceOf(Array);
    }
  });

  it('should identify asymmetric patterns', async () => {
    await run(TEST_RUN_DIR, TEST_STEP_DIR);

    const result = JSON.parse(
      readFileSync(join(TEST_STEP_DIR, '6-analysis-narratives.json'), 'utf-8'),
    );

    expect(result.asymmetric_patterns).toBeDefined();
    expect(result.asymmetric_patterns).toBeInstanceOf(Array);

    // Check pattern structure if any exist
    if (result.asymmetric_patterns.length > 0) {
      const pattern = result.asymmetric_patterns[0];
      expect(pattern.type).toMatch(/diagonal|vertical|horizontal|cluster|cross-cutting/);
      expect(pattern.title).toBeDefined();
      expect(pattern.categories).toBeInstanceOf(Array);
      expect(pattern.description).toBeDefined();
      expect(pattern.severity).toMatch(/critical|high|medium|low/);
      expect(pattern.impact).toBeDefined();
    }
  });

  it('should generate narrative sections', async () => {
    await run(TEST_RUN_DIR, TEST_STEP_DIR);

    const result = JSON.parse(
      readFileSync(join(TEST_STEP_DIR, '6-analysis-narratives.json'), 'utf-8'),
    );

    expect(result.narratives).toBeDefined();
    expect(result.narratives).toBeInstanceOf(Array);
    expect(result.narratives.length).toBeGreaterThan(0);

    // Check narrative structure
    const narrative = result.narratives[0];
    expect(narrative.title).toBeDefined();
    expect(narrative.emoji).toBeDefined();
    expect(narrative.content).toBeInstanceOf(Array);
    expect(narrative.content.length).toBeGreaterThan(0);
  });

  it('should include zero multiplier analysis', async () => {
    await run(TEST_RUN_DIR, TEST_STEP_DIR);

    const result = JSON.parse(
      readFileSync(join(TEST_STEP_DIR, '6-analysis-narratives.json'), 'utf-8'),
    );

    expect(result.zero_multiplier_analysis).toBeDefined();
    expect(result.zero_multiplier_analysis.core_principle).toBeDefined();
    expect(result.zero_multiplier_analysis.calculation).toBeDefined();
    expect(result.zero_multiplier_analysis.calculation.process_health).toBeDefined();
    expect(result.zero_multiplier_analysis.calculation.outcome_reality).toBeGreaterThanOrEqual(0);
    expect(result.zero_multiplier_analysis.calculation.legitimacy_score).toBeGreaterThanOrEqual(0);
    expect(result.zero_multiplier_analysis.mathematical_foundation).toBeDefined();
  });

  it('should generate recommendations', async () => {
    await run(TEST_RUN_DIR, TEST_STEP_DIR);

    const result = JSON.parse(
      readFileSync(join(TEST_STEP_DIR, '6-analysis-narratives.json'), 'utf-8'),
    );

    expect(result.recommendations).toBeDefined();
    expect(result.recommendations).toBeInstanceOf(Array);

    // Check recommendation structure if any exist
    if (result.recommendations.length > 0) {
      const rec = result.recommendations[0];
      expect(rec.priority).toMatch(/critical|high|medium|low/);
      expect(rec.category).toBeDefined();
      expect(rec.action).toBeDefined();
      expect(rec.impact).toBeDefined();
      expect(rec.units_reduction).toBeGreaterThanOrEqual(0);
    }
  });

  it('should include statistics', async () => {
    await run(TEST_RUN_DIR, TEST_STEP_DIR);

    const result = JSON.parse(
      readFileSync(join(TEST_STEP_DIR, '6-analysis-narratives.json'), 'utf-8'),
    );

    expect(result.stats).toBeDefined();
    expect(result.stats.total_cold_spots).toBeGreaterThanOrEqual(0);
    expect(result.stats.critical_patterns).toBeGreaterThanOrEqual(0);
    expect(result.stats.legitimacy_score).toBeGreaterThanOrEqual(0);
    expect(result.stats.legitimacy_score).toBeLessThanOrEqual(100);
    expect(result.stats.orthogonality_score).toBeGreaterThanOrEqual(0);
    expect(result.stats.orthogonality_score).toBeLessThanOrEqual(100);
  });

  it('should calculate legitimacy score correctly', async () => {
    await run(TEST_RUN_DIR, TEST_STEP_DIR);

    const result = JSON.parse(
      readFileSync(join(TEST_STEP_DIR, '6-analysis-narratives.json'), 'utf-8'),
    );

    // For Grade B with 860 units and 89.7% orthogonality:
    // ProcessHealth = 0.7 (B grade)
    // OutcomeReality = max(0, 1 - 860/10000) = 0.914
    // Orthogonality = 0.897
    // Legitimacy = 0.7 * 0.914 * 0.897 = ~0.574 = 57%

    const legitimacy = result.stats.legitimacy_score;
    expect(legitimacy).toBeGreaterThan(40);
    expect(legitimacy).toBeLessThan(80);
  });

  it('should handle high-debt categories correctly', async () => {
    // Create scenario with one category >20% debt
    const gradesDir = join(TEST_RUN_DIR, '4-grades-statistics');
    writeFileSync(
      join(gradesDir, '4-grades-statistics.json'),
      JSON.stringify({
        step: 4,
        name: 'grades-statistics',
        grade: 'C',
        total_units: 2000,
        description: 'NEEDS ATTENTION',
        by_category: [
          { category: 'C🎨 User Experience & Interfaces', units: 1200, percentage: 60.0 },
          { category: 'A🛡️ Security & Trust Governance', units: 800, percentage: 40.0 },
        ],
      }),
    );

    await run(TEST_RUN_DIR, TEST_STEP_DIR);

    const result = JSON.parse(
      readFileSync(join(TEST_STEP_DIR, '6-analysis-narratives.json'), 'utf-8'),
    );

    // Should identify concentration risk
    const concentrationPattern = result.asymmetric_patterns.find(
      (p: any) => p.title === 'Concentration Risk',
    );
    expect(concentrationPattern).toBeDefined();
    expect(concentrationPattern.severity).toMatch(/high|critical/);
  });

  it('should provide business context based on grade', async () => {
    await run(TEST_RUN_DIR, TEST_STEP_DIR);

    const result = JSON.parse(
      readFileSync(join(TEST_STEP_DIR, '6-analysis-narratives.json'), 'utf-8'),
    );

    expect(result.executive_summary.business_impact).toBeDefined();

    // For Grade B, should mention GOOD status
    expect(result.executive_summary.business_impact).toContain('GOOD');
  });

  it('should sort cold spots by severity (coldest first)', async () => {
    await run(TEST_RUN_DIR, TEST_STEP_DIR);

    const result = JSON.parse(
      readFileSync(join(TEST_STEP_DIR, '6-analysis-narratives.json'), 'utf-8'),
    );

    const spots = result.cold_spots.top_10;
    if (spots.length > 1) {
      for (let i = 1; i < spots.length; i++) {
        expect(spots[i].score).toBeGreaterThanOrEqual(spots[i - 1].score);
      }
    }
  });

  it('should sort patterns by severity (critical first)', async () => {
    await run(TEST_RUN_DIR, TEST_STEP_DIR);

    const result = JSON.parse(
      readFileSync(join(TEST_STEP_DIR, '6-analysis-narratives.json'), 'utf-8'),
    );

    const patterns = result.asymmetric_patterns;
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    if (patterns.length > 1) {
      for (let i = 1; i < patterns.length; i++) {
        expect(severityOrder[patterns[i].severity]).toBeGreaterThanOrEqual(
          severityOrder[patterns[i - 1].severity],
        );
      }
    }
  });

  it('should validate JSON output is well-formed', async () => {
    await run(TEST_RUN_DIR, TEST_STEP_DIR);

    const outputPath = join(TEST_STEP_DIR, '6-analysis-narratives.json');
    const content = readFileSync(outputPath, 'utf-8');

    // Should parse without error
    expect(() => JSON.parse(content)).not.toThrow();

    // Should be prettified (contains newlines)
    expect(content).toContain('\n');
  });

  it('should log progress to console', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await run(TEST_RUN_DIR, TEST_STEP_DIR);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[step-6]'),
    );

    consoleSpy.mockRestore();
  });
});
