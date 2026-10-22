// robot/library.d.ts — C1190: the deployer's own categories → the 144-anchor library openSpec(bulk, targets) reads.
export interface Category { name: string; in_scope: boolean; coord: string; examples: string }
export const MIN_EXAMPLE_CHARS: number;
/** The library JSON text for openSpec(spec, targets). Throws on a category under MIN_EXAMPLE_CHARS, a repeated coord, or an unknown coord. */
export function buildLibrary(categories: Category[]): string;
/** in_scope: admitted, top seed on an in-scope category · flagged: admitted elsewhere · unmeasured: the null test did not admit it. */
export function verdict(card: string | Buffer | object, categories: Category[]): { state: 'in_scope' | 'flagged' | 'unmeasured'; category: string | null };
