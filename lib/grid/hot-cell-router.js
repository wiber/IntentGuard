/**
 * hot-cell-router.ts — Tesseract Hot-Cell Router
 *
 * Calculates cell pressure based on event frequency and routes priority to cognitive rooms.
 * Implements pressure-based decision making for distributed AI coordination.
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
/**
 * Cell-to-room mapping based on tesseract structure
 */
const CELL_TO_ROOM = {
    A1: '#legal-room',
    A2: '#strategy-room',
    A3: '#finance-room',
    B1: '#speed-room',
    B2: '#deals-room',
    B3: '#signal-room',
    C1: '#ops-room',
    C2: '#loop-room',
    C3: '#flow-room',
};
/**
 * HotCellRouter — Calculate pressure and route to cognitive rooms
 */
export class HotCellRouter {
    eventsPath;
    cellPressures = new Map();
    constructor(eventsPath) {
        this.eventsPath = eventsPath || join(process.cwd(), 'data', 'grid-events.jsonl');
    }
    /**
     * Load events from JSONL file
     */
    loadEvents() {
        if (!existsSync(this.eventsPath)) {
            return [];
        }
        try {
            const content = readFileSync(this.eventsPath, 'utf8');
            const lines = content.trim().split('\n').filter(line => line.length > 0);
            return lines.map(line => JSON.parse(line));
        }
        catch (error) {
            console.error('[HotCellRouter] Failed to load events:', error);
            return [];
        }
    }
    /**
     * Update cell pressures based on event frequency
     *
     * Pressure calculation:
     * - Recent events (last hour) = 1.0 weight
     * - Events in last 6 hours = 0.5 weight
     * - Events in last 24 hours = 0.2 weight
     * - Normalized to 0.0-1.0 scale
     *
     * @param events - Optional event list (defaults to loading from file)
     * @returns Record of cell pressures
     */
    updatePressures(events) {
        const eventList = events || this.loadEvents();
        if (eventList.length === 0) {
            return {};
        }
        const now = Date.now();
        const ONE_HOUR = 60 * 60 * 1000;
        const SIX_HOURS = 6 * ONE_HOUR;
        const ONE_DAY = 24 * ONE_HOUR;
        // Initialize cell data
        const cellData = new Map();
        // Calculate weighted scores
        for (const event of eventList) {
            const eventTime = new Date(event.timestamp).getTime();
            const age = now - eventTime;
            if (age > ONE_DAY)
                continue; // Ignore events older than 24 hours
            let weight = 0.2; // Default weight for last 24 hours
            if (age < ONE_HOUR)
                weight = 1.0;
            else if (age < SIX_HOURS)
                weight = 0.5;
            const existing = cellData.get(event.cell) || { score: 0, count: 0, lastEvent: event.timestamp };
            cellData.set(event.cell, {
                score: existing.score + weight,
                count: existing.count + 1,
                lastEvent: event.timestamp > existing.lastEvent ? event.timestamp : existing.lastEvent,
            });
        }
        // Find max score for normalization
        let maxScore = 0;
        for (const data of cellData.values()) {
            if (data.score > maxScore)
                maxScore = data.score;
        }
        // Normalize and update pressures
        const pressures = {};
        for (const [cell, data] of cellData.entries()) {
            const normalized = maxScore > 0 ? data.score / maxScore : 0;
            pressures[cell] = normalized;
            this.cellPressures.set(cell, {
                cell,
                pressure: normalized,
                eventCount: data.count,
                lastEvent: data.lastEvent,
                room: CELL_TO_ROOM[cell] || '#unknown',
            });
        }
        return pressures;
    }
    /**
     * Get cells above pressure threshold
     *
     * @param threshold - Pressure threshold (0.0-1.0, default 0.7)
     * @returns Array of hot cell IDs
     */
    getHotCells(threshold = 0.7) {
        const hotCells = [];
        for (const [cell, data] of this.cellPressures.entries()) {
            if (data.pressure >= threshold) {
                hotCells.push(cell);
            }
        }
        return hotCells.sort((a, b) => {
            const pressureA = this.cellPressures.get(a)?.pressure || 0;
            const pressureB = this.cellPressures.get(b)?.pressure || 0;
            return pressureB - pressureA; // Descending order
        });
    }
    /**
     * Get routing recommendation based on hot cells
     *
     * @param hotCells - Optional pre-calculated hot cells
     * @returns Routing recommendation with room priority
     */
    routeToRoom(hotCells) {
        const cells = hotCells || this.getHotCells();
        if (cells.length === 0) {
            return {
                room: '#general',
                cells: [],
                totalPressure: 0,
                reason: 'No hot cells detected',
            };
        }
        // Group by room and calculate total pressure per room
        const roomPressures = new Map();
        for (const cell of cells) {
            const cellData = this.cellPressures.get(cell);
            if (!cellData)
                continue;
            const existing = roomPressures.get(cellData.room) || { cells: [], totalPressure: 0 };
            existing.cells.push(cell);
            existing.totalPressure += cellData.pressure;
            roomPressures.set(cellData.room, existing);
        }
        // Find room with highest total pressure
        let topRoom = '#general';
        let topPressure = 0;
        let topCells = [];
        for (const [room, data] of roomPressures.entries()) {
            if (data.totalPressure > topPressure) {
                topRoom = room;
                topPressure = data.totalPressure;
                topCells = data.cells;
            }
        }
        return {
            room: topRoom,
            cells: topCells,
            totalPressure: topPressure,
            reason: `Highest pressure: ${topCells.join(', ')} (${topPressure.toFixed(2)})`,
        };
    }
    /**
     * Get all cell pressures
     */
    getAllPressures() {
        return Array.from(this.cellPressures.values()).sort((a, b) => b.pressure - a.pressure);
    }
    /**
     * Get pressure for specific cell
     */
    getCellPressure(cell) {
        return this.cellPressures.get(cell);
    }
    /**
     * Get summary report
     */
    getSummary() {
        const pressures = this.getAllPressures();
        const recommendation = this.routeToRoom();
        const lines = [
            '🔥 HOT-CELL ROUTER SUMMARY',
            '═'.repeat(50),
            '',
            '📊 Cell Pressures:',
        ];
        for (const cell of pressures) {
            const bar = '█'.repeat(Math.floor(cell.pressure * 20));
            lines.push(`  ${cell.cell} (${cell.room}): ${bar} ${(cell.pressure * 100).toFixed(0)}% (${cell.eventCount} events)`);
        }
        lines.push('');
        lines.push('🎯 Routing Recommendation:');
        lines.push(`  Room: ${recommendation.room}`);
        lines.push(`  Cells: ${recommendation.cells.join(', ')}`);
        lines.push(`  Total Pressure: ${(recommendation.totalPressure * 100).toFixed(0)}%`);
        lines.push(`  Reason: ${recommendation.reason}`);
        return lines.join('\n');
    }
}
/**
 * Singleton instance for easy import
 */
export const hotCellRouter = new HotCellRouter();
//# sourceMappingURL=hot-cell-router.js.map