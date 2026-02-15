/**
 * src/api/index.ts — API Module Exports
 *
 * Exports all API-related modules:
 * - Tesseract playground server
 * - Playground integration
 * - Command handlers
 */

export {
  TesseractPlayground,
  startPlaygroundServer,
  type PlaygroundConfig,
} from './tesseract-playground.js';

export {
  PlaygroundManager,
  getPlaygroundManager,
  initializePlayground,
  handlePlaygroundCommand,
  type PlaygroundIntegrationConfig,
  type PlaygroundCommandResult,
} from './playground-integration.js';
