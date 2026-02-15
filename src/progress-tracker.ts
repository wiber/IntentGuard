/**
 * progress-tracker.ts — Sovereign Engine Progress Analytics
 *
 * Reads 08-implementation-plan.tsx and reports completion metrics
 * Wires task completions to POINTER_CREATE events on tesseract.nu grid
 */

import * as fs from 'fs';
import * as path from 'path';

export interface PhaseProgress {
  id: string;
  name: string;
  done: number;
  wip: number;
  todo: number;
  total: number;
  percent: number;
}

export interface ProgressReport {
  phases: PhaseProgress[];
  totalDone: number;
  totalWip: number;
  totalTodo: number;
  percentComplete: number;
}

export interface TodoItem {
  phase: string;
  text: string;
  priority: number;
}

export interface PointerEvent {
  cell: string;
  eventType: string;
}

// Phase to ShortRank cell mapping per requirements
const PHASE_TO_CELL: Record<string, string> = {
  'phase-3': 'B1', // Speed
  'phase-4': 'C1', // Grid
  'phase-6': 'A3', // Fund
  'phase-7': 'C3', // Flow
  'phase-8': 'B2', // Deal
  'phase-9': 'C2', // Loop
};

const CELL_NAMES: Record<string, string> = {
  'B1': 'Tactics.Speed',
  'C1': 'Operations.Grid',
  'A3': 'Strategy.Fund',
  'C3': 'Operations.Flow',
  'B2': 'Tactics.Deal',
  'C2': 'Operations.Loop',
};

export default class ProgressTracker {
  private specPath: string;

  constructor(specPath?: string) {
    this.specPath = specPath || path.join(
      __dirname,
      '..',
      'spec',
      'sections',
      '08-implementation-plan.tsx'
    );
  }

  /**
   * Parse the TypeScript spec file and extract phases
   * Uses regex to parse object literals since it's a .tsx file
   */
  parseSpec(): PhaseProgress[] {
    const content = fs.readFileSync(this.specPath, 'utf-8');

    // Extract the phases array using regex
    const phasesMatch = content.match(/export const phases: Phase\[\] = \[([\s\S]*?)\n\];/);
    if (!phasesMatch) {
      throw new Error('Could not find phases array in spec file');
    }

    const phasesText = phasesMatch[1];

    // Split by },\n  { to find phase boundaries
    // Each phase object starts with "  {\n" and ends with "\n  },"
    const phaseObjects = phasesText.split(/\},\n  \{/).map((text, index, array) => {
      // Re-add the braces that were removed by split
      if (index === 0) {
        return text; // First one already has opening brace
      } else if (index === array.length - 1) {
        return '{' + text; // Last one already has closing brace
      } else {
        return '{' + text + '},';
      }
    });

    const phases: PhaseProgress[] = [];

    for (const phaseText of phaseObjects) {
      // Extract id
      const idMatch = phaseText.match(/id:\s*'([^']+)'/);
      if (!idMatch) continue;
      const id = idMatch[1];

      // Extract name
      const nameMatch = phaseText.match(/name:\s*'([^']+)'/);
      if (!nameMatch) continue;
      const name = nameMatch[1];

      // Count status types in checklist
      const doneCount = (phaseText.match(/status:\s*'done'/g) || []).length;
      const wipCount = (phaseText.match(/status:\s*'wip'/g) || []).length;
      const todoCount = (phaseText.match(/status:\s*'todo'/g) || []).length;

      const total = doneCount + wipCount + todoCount;
      const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

      phases.push({
        id,
        name,
        done: doneCount,
        wip: wipCount,
        todo: todoCount,
        total,
        percent,
      });
    }

    return phases;
  }

  /**
   * Get comprehensive progress report
   */
  getProgress(): ProgressReport {
    const phases = this.parseSpec();

    const totalDone = phases.reduce((sum, p) => sum + p.done, 0);
    const totalWip = phases.reduce((sum, p) => sum + p.wip, 0);
    const totalTodo = phases.reduce((sum, p) => sum + p.todo, 0);
    const grandTotal = totalDone + totalWip + totalTodo;

    const percentComplete = grandTotal > 0
      ? Math.round((totalDone / grandTotal) * 100)
      : 0;

    return {
      phases,
      totalDone,
      totalWip,
      totalTodo,
      percentComplete,
    };
  }

  /**
   * Format progress report as ASCII table for Discord
   */
  formatForDiscord(): string {
    const report = this.getProgress();

    const lines: string[] = [];
    lines.push('```');
    lines.push('SOVEREIGN ENGINE PROGRESS');
    lines.push('='.repeat(70));
    lines.push('');

    // Header
    lines.push(
      this.padRight('Phase', 35) +
      this.padLeft('Done', 6) +
      this.padLeft('WIP', 6) +
      this.padLeft('Todo', 6) +
      this.padLeft('Total', 7) +
      this.padLeft('%', 6)
    );
    lines.push('-'.repeat(70));

    // Phase rows
    for (const phase of report.phases) {
      const name = phase.name.replace(/Phase \d+ — /, '');
      lines.push(
        this.padRight(name, 35) +
        this.padLeft(phase.done.toString(), 6) +
        this.padLeft(phase.wip.toString(), 6) +
        this.padLeft(phase.todo.toString(), 6) +
        this.padLeft(phase.total.toString(), 7) +
        this.padLeft(`${phase.percent}%`, 6)
      );
    }

    // Footer
    lines.push('-'.repeat(70));
    lines.push(
      this.padRight('TOTAL', 35) +
      this.padLeft(report.totalDone.toString(), 6) +
      this.padLeft(report.totalWip.toString(), 6) +
      this.padLeft(report.totalTodo.toString(), 6) +
      this.padLeft((report.totalDone + report.totalWip + report.totalTodo).toString(), 7) +
      this.padLeft(`${report.percentComplete}%`, 6)
    );

    lines.push('```');
    return lines.join('\n');
  }

  /**
   * Format progress as 280-char tweet
   */
  formatForTweet(): string {
    const report = this.getProgress();
    const total = report.totalDone + report.totalWip + report.totalTodo;

    // Find highest and lowest completion phases (excluding future phases)
    const activePhases = report.phases.filter(p => p.total > 0);

    if (activePhases.length === 0) {
      return `Sovereign Engine: No active phases yet. Spec loaded, ready to begin.`;
    }

    activePhases.sort((a, b) => b.percent - a.percent);

    const highest = activePhases[0];
    const lowest = activePhases[activePhases.length - 1];

    const highestName = highest.name.replace(/Phase \d+ — /, '').split(' ')[0];
    const lowestName = lowest.name.replace(/Phase \d+ — /, '').split(' ')[0];

    return `Sovereign Engine: ${report.totalDone}/${total} tasks done (${report.percentComplete}%). ` +
           `${highestName}: ${highest.percent}%, ${lowestName}: ${lowest.percent}%. ` +
           `${report.totalWip} in progress, ${report.totalTodo} queued.`;
  }

  /**
   * Get next N highest-priority unfinished tasks
   * Priority: earlier phases first, then wip before todo
   */
  getNextTodos(count: number): TodoItem[] {
    const content = fs.readFileSync(this.specPath, 'utf-8');

    // Extract the phases array
    const phasesMatch = content.match(/export const phases: Phase\[\] = \[([\s\S]*?)\n\];/);
    if (!phasesMatch) {
      return [];
    }

    const phasesText = phasesMatch[1];
    const phaseObjects = phasesText.split(/\},\n  \{/).map((text, index, array) => {
      if (index === 0) {
        return text;
      } else if (index === array.length - 1) {
        return '{' + text;
      } else {
        return '{' + text + '},';
      }
    });

    const todos: TodoItem[] = [];
    let phaseIndex = 0;

    for (const phaseText of phaseObjects) {
      // Extract name
      const nameMatch = phaseText.match(/name:\s*'([^']+)'/);
      if (!nameMatch) continue;
      const name = nameMatch[1];

      // Extract checklist section
      const checklistMatch = phaseText.match(/checklist:\s*\[([\s\S]*?)\]/);
      if (!checklistMatch) continue;
      const checklistText = checklistMatch[1];

      // Extract individual checklist items with status wip or todo
      const itemRegex = /\{\s*text:\s*'([^']+)',\s*status:\s*'(wip|todo)'\s*\}/g;
      let itemMatch;

      while ((itemMatch = itemRegex.exec(checklistText)) !== null) {
        const [, text, status] = itemMatch;

        // Priority: phase index (earlier = higher) + status (wip = higher)
        // Lower number = higher priority
        const priority = phaseIndex * 1000 + (status === 'wip' ? 0 : 500);

        todos.push({
          phase: name,
          text,
          priority,
        });
      }

      phaseIndex++;
    }

    // Sort by priority and take top N
    todos.sort((a, b) => a.priority - b.priority);
    return todos.slice(0, count);
  }

  /**
   * Wire task completion to POINTER_CREATE event for tesseract.nu grid
   * Maps phase to ShortRank cell and generates event
   */
  onTaskComplete(phase: string, taskText: string): PointerEvent | null {
    // Extract phase ID from full name (e.g., "Phase 3 — Multi-Channel" → "phase-3")
    const phaseMatch = phase.match(/Phase (\d+)/);
    if (!phaseMatch) {
      return null;
    }

    const phaseId = `phase-${phaseMatch[1]}`;
    const cell = PHASE_TO_CELL[phaseId];

    if (!cell) {
      // Phase doesn't map to a grid cell
      return null;
    }

    return {
      cell: `${cell}:${CELL_NAMES[cell]}`,
      eventType: 'POINTER_CREATE',
    };
  }

  /**
   * Get current status of a specific phase
   */
  getPhaseStatus(phaseId: string): PhaseProgress | null {
    const phases = this.parseSpec();
    return phases.find(p => p.id === phaseId) || null;
  }

  /**
   * Get summary stats for dashboard/heartbeat
   */
  getSummary(): string {
    const report = this.getProgress();
    const activePhases = report.phases.filter(p => p.total > 0);
    const completedPhases = activePhases.filter(p => p.percent === 100).length;

    return `${completedPhases}/${activePhases.length} phases complete | ` +
           `${report.totalDone}/${report.totalDone + report.totalWip + report.totalTodo} tasks | ` +
           `${report.percentComplete}% done`;
  }

  /**
   * Check if a specific task is complete
   */
  isTaskComplete(taskText: string): boolean {
    const content = fs.readFileSync(this.specPath, 'utf-8');
    const escapedText = taskText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`text:\\s*'${escapedText}',\\s*status:\\s*'done'`);
    return regex.test(content);
  }

  /**
   * Helper: Pad string to the right
   */
  private padRight(str: string, width: number): string {
    return str.length >= width ? str.slice(0, width) : str + ' '.repeat(width - str.length);
  }

  /**
   * Helper: Pad string to the left
   */
  private padLeft(str: string, width: number): string {
    return str.length >= width ? str.slice(0, width) : ' '.repeat(width - str.length) + str;
  }
}

// CLI interface for testing
if (require.main === module) {
  const tracker = new ProgressTracker();

  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'report':
      console.log(tracker.formatForDiscord());
      break;

    case 'tweet':
      console.log(tracker.formatForTweet());
      break;

    case 'next':
      const count = parseInt(args[1]) || 5;
      const todos = tracker.getNextTodos(count);
      console.log(`\nNext ${count} priority tasks:\n`);
      todos.forEach((todo, i) => {
        console.log(`${i + 1}. [${todo.phase}] ${todo.text}`);
      });
      break;

    case 'summary':
      console.log(tracker.getSummary());
      break;

    case 'phase':
      const phaseId = args[1];
      if (!phaseId) {
        console.error('Usage: progress-tracker phase <phase-id>');
        process.exit(1);
      }
      const status = tracker.getPhaseStatus(phaseId);
      if (status) {
        console.log(JSON.stringify(status, null, 2));
      } else {
        console.error(`Phase not found: ${phaseId}`);
        process.exit(1);
      }
      break;

    case 'event':
      const phase = args[1];
      const task = args.slice(2).join(' ');
      if (!phase || !task) {
        console.error('Usage: progress-tracker event <phase> <task-text>');
        process.exit(1);
      }
      const event = tracker.onTaskComplete(phase, task);
      if (event) {
        console.log(`POINTER_CREATE → ${event.cell}`);
      } else {
        console.log('No grid mapping for this phase');
      }
      break;

    default:
      console.log('Usage: progress-tracker <command>');
      console.log('Commands:');
      console.log('  report         - ASCII table for Discord');
      console.log('  tweet          - 280-char summary');
      console.log('  next <N>       - Get next N priority tasks');
      console.log('  summary        - One-line status');
      console.log('  phase <id>     - Get status of specific phase');
      console.log('  event <phase> <task> - Generate grid event for task');
      break;
  }
}
