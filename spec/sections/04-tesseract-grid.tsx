/**
 * 04-tesseract-grid.tsx — 3x3 Tesseract Coordinate Namespace
 *
 * STANDALONE: This section can be edited independently.
 * CONTEXT: Maps cognitive rooms to strategic coordinates.
 * DEPENDS ON: 03-cognitive-rooms.tsx (room definitions)
 * EDITED BY: Architect agent
 */

export const SECTION_ID = '04-tesseract-grid';
export const SECTION_TITLE = 'Tesseract Coordinate Grid';

export interface GridCell {
  row: string;
  col: string;
  id: string;
  emoji: string;
  roomName: string;
  label: string;
  active?: boolean;
}

export const columns = ['Strategy (Law)', 'Tactics (Opportunity)', 'Operations (Signal)'];
export const rows = ['A (Law)', 'B (Opportunity)', 'C (Grid)'];

export const grid: GridCell[][] = [
  // Row A
  [
    { row: 'A', col: '1', id: 'A1', emoji: '⚖️', roomName: 'Vault', label: 'Law:Law' },
    { row: 'A', col: '2', id: 'A2', emoji: '🔮', roomName: 'Architect', label: 'Law:Opp' },
    { row: 'A', col: '3', id: 'A3', emoji: '💰', roomName: 'Performer', label: 'Law:Signal' },
  ],
  // Row B
  [
    { row: 'B', col: '1', id: 'B1', emoji: '🔀', roomName: 'Voice', label: 'Opp:Law' },
    { row: 'B', col: '2', id: 'B2', emoji: '🎯', roomName: 'Network', label: 'Opp:Opp' },
    { row: 'B', col: '3', id: 'B3', emoji: '📡', roomName: 'Navigator', label: 'Opp:Signal' },
  ],
  // Row C
  [
    { row: 'C', col: '1', id: 'C1', emoji: '🔌', roomName: 'Builder', label: 'Grid:Law' },
    { row: 'C', col: '2', id: 'C2', emoji: '🧪', roomName: 'Laboratory', label: 'Grid:Opp' },
    { row: 'C', col: '3', id: 'C3', emoji: '🌊', roomName: 'Operator', label: 'Grid:Signal', active: true },
  ],
];
