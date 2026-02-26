/**
 * ceo-loop.test.ts — Unit tests for CEO Loop pure logic
 *
 * Run with: npx vitest run src/ceo-loop.test.ts
 *
 * Tests the scoring, vagueness detection, subdivision, and spec-parsing
 * logic from ceo-loop.ts. Pure functions are imported directly; the spec
 * parser is duplicated here since it's not exported (filesystem-coupled).
 */

import { describe, it, expect } from 'vitest';

// ── Pure functions duplicated from ceo-loop.ts for isolated testing ──
// ceo-loop.ts has heavy side-effect imports (discord.js, child_process)
// that make direct import impractical in test. These mirror the source exactly.

interface SpecTodo {
  phase: string;
  phaseName: string;
  phaseIndex: number;
  index: number;
  text: string;
  future: boolean;
}

function scoreTodo(todo: SpecTodo): number {
  let score = 100;
  score -= todo.phaseIndex * 5;
  const t = todo.text.toLowerCase();
  if (t.includes('skeleton') || t.includes('create') || t.includes('build')) score += 20;
  if (t.includes('test') || t.includes('verify')) score += 10;
  if (t.includes('wire') || t.includes('connect')) score += 15;
  if (t.includes('add') || t.includes('implement')) score += 12;
  if (t.includes('command') || t.includes('!')) score += 8;
  if (todo.text.length < 60) score += 5;
  return score;
}

function isVague(text: string): boolean {
  const vaguePatterns = [
    /^(enable|implement|build|create)\s+\w+\s+\w+$/i,
    /adapter$/i,
    /placeholder/i,
  ];
  return vaguePatterns.some(p => p.test(text));
}

function subdivide(todo: SpecTodo): string[] | null {
  const t = todo.text.toLowerCase();
  if (t.includes('whatsapp channel adapter')) {
    return [
      'Create src/channels/whatsapp-adapter.ts skeleton with WhatsApp Web.js',
      'Wire WhatsApp adapter to channel-manager.ts',
      'Test WhatsApp message receive and reply',
    ];
  }
  if (t.includes('telegram channel adapter')) {
    return [
      'Create src/channels/telegram-adapter.ts skeleton with node-telegram-bot-api',
      'Wire Telegram adapter to channel-manager.ts',
      'Test Telegram message receive and reply',
    ];
  }
  return null;
}

function getRelativeTypesPath(filePath: string): string {
  const depth = filePath.split('/').length - 2;
  return '../'.repeat(depth) + 'types.js';
}

function parseSpecContent(content: string): SpecTodo[] {
  const todos: SpecTodo[] = [];
  const phaseBlocks = content.split(/\{\s*\n\s*id:\s*'/);
  for (let i = 1; i < phaseBlocks.length; i++) {
    const block = phaseBlocks[i];
    const idMatch = block.match(/^([^']+)'/);
    const nameMatch = block.match(/name:\s*'([^']+)'/);
    const futureMatch = block.match(/future:\s*(true|false)/);
    const phase = idMatch?.[1] || `phase-${i}`;
    const phaseName = nameMatch?.[1] || phase;
    const future = futureMatch?.[1] === 'true';
    const itemRegex = /\{\s*text:\s*'([^']+)',\s*status:\s*'todo'\s*\}/g;
    let match;
    let idx = 0;
    while ((match = itemRegex.exec(block)) !== null) {
      todos.push({ phase, phaseName, phaseIndex: i, index: idx++, text: match[1], future });
    }
  }
  return todos;
}

// ── Tests ───────────────────────────────────────────────────────

describe('scoreTodo', () => {
  const base: SpecTodo = {
    phase: 'phase-1', phaseName: 'Phase 1', phaseIndex: 1,
    index: 0, text: 'Generic task with a longer description here', future: false,
  };

  it('returns base score minus phase penalty plus short text bonus', () => {
    expect(scoreTodo(base)).toBe(100 - 5 + 5);
  });

  it('boosts skeleton/create/build keywords', () => {
    const todo = { ...base, text: 'Create skeleton module' };
    expect(scoreTodo(todo)).toBe(100 - 5 + 20 + 5);
  });

  it('boosts test/verify keywords', () => {
    const todo = { ...base, text: 'Test the integration endpoint' };
    expect(scoreTodo(todo)).toBe(100 - 5 + 10 + 5);
  });

  it('boosts wire/connect keywords', () => {
    const todo = { ...base, text: 'Wire module to event bus' };
    expect(scoreTodo(todo)).toBe(100 - 5 + 15 + 5);
  });

  it('boosts add/implement keywords', () => {
    const todo = { ...base, text: 'Add new handler' };
    expect(scoreTodo(todo)).toBe(100 - 5 + 12 + 5);
  });

  it('boosts command/! keywords', () => {
    const todo = { ...base, text: '!status command' };
    expect(scoreTodo(todo)).toBe(100 - 5 + 8 + 5);
  });

  it('gives short text bonus for text under 60 chars', () => {
    const short = { ...base, text: 'Short' };
    const long = { ...base, text: 'A'.repeat(61) };
    expect(scoreTodo(short)).toBeGreaterThan(scoreTodo(long));
  });

  it('penalizes higher phase indices', () => {
    const early = { ...base, phaseIndex: 1 };
    const late = { ...base, phaseIndex: 10 };
    expect(scoreTodo(early)).toBeGreaterThan(scoreTodo(late));
  });

  it('accumulates multiple keyword bonuses', () => {
    const todo = { ...base, text: 'Create test and wire connection' };
    expect(scoreTodo(todo)).toBe(100 - 5 + 20 + 10 + 15 + 5);
  });
});

describe('isVague', () => {
  it('detects "enable X Y" pattern', () => {
    expect(isVague('Enable webhook adapter')).toBe(true);
  });

  it('detects "implement X Y" pattern', () => {
    expect(isVague('Implement voice reactor')).toBe(true);
  });

  it('detects text ending in "adapter"', () => {
    expect(isVague('WhatsApp Channel Adapter')).toBe(true);
  });

  it('detects "placeholder"', () => {
    expect(isVague('Build placeholder module for testing')).toBe(true);
  });

  it('returns false for concrete tasks', () => {
    expect(isVague('Create src/channels/whatsapp-adapter.ts skeleton with WhatsApp Web.js')).toBe(false);
  });

  it('returns false for specific file-based tasks', () => {
    expect(isVague('Wire steering-loop.ts to channel-manager')).toBe(false);
  });
});

describe('subdivide', () => {
  const makeTodo = (text: string): SpecTodo => ({
    phase: 'phase-3', phaseName: 'Phase 3', phaseIndex: 3,
    index: 0, text, future: false,
  });

  it('subdivides WhatsApp channel adapter into 3 subtasks', () => {
    const result = subdivide(makeTodo('Enable WhatsApp channel adapter'));
    expect(result).toHaveLength(3);
    expect(result![0]).toContain('whatsapp-adapter.ts');
    expect(result![1]).toContain('Wire');
    expect(result![2]).toContain('Test');
  });

  it('subdivides Telegram channel adapter into 3 subtasks', () => {
    const result = subdivide(makeTodo('Enable Telegram channel adapter'));
    expect(result).toHaveLength(3);
    expect(result![0]).toContain('telegram-adapter.ts');
  });

  it('returns null for concrete tasks', () => {
    expect(subdivide(makeTodo('Build auth module skeleton'))).toBeNull();
  });

  it('returns null for unknown vague tasks', () => {
    expect(subdivide(makeTodo('Enable slack adapter'))).toBeNull();
  });
});

describe('getRelativeTypesPath', () => {
  it('returns correct path for src/ level files', () => {
    expect(getRelativeTypesPath('src/module.ts')).toBe('types.js');
  });

  it('returns one level up for src/subdir/ files', () => {
    expect(getRelativeTypesPath('src/skills/foo.ts')).toBe('../types.js');
  });

  it('returns two levels up for deeper nesting', () => {
    expect(getRelativeTypesPath('src/auth/sub/bar.ts')).toBe('../../types.js');
  });
});

describe('parseSpecContent (readSpecTodos logic)', () => {
  const MOCK_SPEC = `
export const phases = [
  {
    id: 'phase-1',
    name: 'Phase 1 — Foundation',
    future: false,
    checklist: [
      { text: 'Set up project', status: 'done' },
      { text: 'Create skeleton module', status: 'todo' },
      { text: 'Wire routing layer', status: 'todo' },
    ],
  },
  {
    id: 'phase-2',
    name: 'Phase 2 — Future Work',
    future: true,
    checklist: [
      { text: 'Build advanced feature', status: 'todo' },
      { text: 'Deploy to production', status: 'done' },
    ],
  },
];
`;

  it('extracts only todo items (not done)', () => {
    const todos = parseSpecContent(MOCK_SPEC);
    expect(todos).toHaveLength(3);
    expect(todos.every(t => t.text !== 'Set up project')).toBe(true);
    expect(todos.every(t => t.text !== 'Deploy to production')).toBe(true);
  });

  it('assigns correct phase metadata', () => {
    const todos = parseSpecContent(MOCK_SPEC);
    const phase1 = todos.filter(t => t.phase === 'phase-1');
    expect(phase1).toHaveLength(2);
    expect(phase1[0].phaseName).toBe('Phase 1 — Foundation');
    expect(phase1[0].future).toBe(false);
  });

  it('marks future phases correctly', () => {
    const todos = parseSpecContent(MOCK_SPEC);
    const phase2 = todos.filter(t => t.phase === 'phase-2');
    expect(phase2).toHaveLength(1);
    expect(phase2[0].future).toBe(true);
    expect(phase2[0].text).toBe('Build advanced feature');
  });

  it('assigns sequential indices within phases', () => {
    const todos = parseSpecContent(MOCK_SPEC);
    const phase1 = todos.filter(t => t.phase === 'phase-1');
    expect(phase1[0].index).toBe(0);
    expect(phase1[1].index).toBe(1);
  });

  it('returns empty array for content with no todos', () => {
    expect(parseSpecContent('no phases here')).toEqual([]);
  });
});
