/**
 * spec/index.tsx — IntentGuard Migration Spec Composer
 *
 * Assembles all modular sections into the final HTML page.
 * Each section in sections/ is independently editable by Claude Flow agents.
 *
 * PATTERN: Same as thetadrivencoach/src/components/home/*.tsx
 *   - Each section is self-contained with data + types
 *   - This file composes them into the full page
 *   - Claude Flow agents edit individual sections without context overflow
 *
 * TO ADD A NEW SECTION:
 *   1. Create spec/sections/NN-name.tsx with SECTION_ID and data exports
 *   2. Import it here
 *   3. Add it to the sections array
 *
 * TO BUILD:
 *   npx tsx spec/render.tsx > intentguard-migration-spec.html
 */

// Section registry — each section is a standalone module
export const sections = [
  '00-hero',
  '01-architecture',
  '02-migration-grid',
  '03-cognitive-rooms',
  '04-tesseract-grid',
  '05-fim-auth',
  '06-trust-debt',
  '07-skills-inventory',
  '08-implementation-plan',
  '09-repo-split',
  '10-debate-notes',
  '11-end-state-vision',
  '12-drift-vs-steering',
  '13-bootstrap-protocol',
  '14-thetasteer-iamfim',
  '15-autonomous-steering',
] as const;

export type SectionId = typeof sections[number];

/**
 * Agent Assignment Map
 *
 * Which Claude Flow agent should edit which section:
 *
 * 00-hero              → Any agent (low risk)
 * 01-architecture      → Architect (medium risk — system topology)
 * 02-migration-grid    → Any agent (status updates)
 * 03-cognitive-rooms   → Architect or Operator
 * 04-tesseract-grid    → Architect
 * 05-fim-auth          → Vault or Architect (HIGH RISK — security)
 * 06-trust-debt        → Any agent (documenting existing)
 * 07-skills-inventory  → Builder (porting skills)
 * 08-implementation-plan → Architect or Operator
 * 09-repo-split        → Architect
 * 10-debate-notes      → Architect (resolving risks)
 * 11-end-state-vision  → Architect (strategic vision)
 * 12-drift-vs-steering → Architect (physics argument)
 * 13-bootstrap-protocol → Operator (execution protocol)
 * 14-thetasteer-iamfim → Architect (connecting categorization to auth)
 */
export const agentAssignments: Record<SectionId, string[]> = {
  '00-hero': ['any'],
  '01-architecture': ['architect'],
  '02-migration-grid': ['any'],
  '03-cognitive-rooms': ['architect', 'operator'],
  '04-tesseract-grid': ['architect'],
  '05-fim-auth': ['vault', 'architect'],
  '06-trust-debt': ['any'],
  '07-skills-inventory': ['builder'],
  '08-implementation-plan': ['architect', 'operator'],
  '09-repo-split': ['architect'],
  '10-debate-notes': ['architect'],
  '11-end-state-vision': ['architect'],
  '12-drift-vs-steering': ['architect'],
  '13-bootstrap-protocol': ['operator'],
  '14-thetasteer-iamfim': ['architect'],
  '15-autonomous-steering': ['architect', 'operator'],
};
