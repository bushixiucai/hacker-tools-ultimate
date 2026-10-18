import type { ModuleDefinition } from './types';
const entries = import.meta.glob<{ default: ModuleDefinition }>('../features/definitions/*.ts', { eager: true });
export const MODULES: ModuleDefinition[] = Object.values(entries).map(entry => entry.default).sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || a.id.localeCompare(b.id));
const ids = new Set<string>();
const codes = new Set<string>();
for (const definition of MODULES) {
  if (!definition?.id || !definition.code || !definition.name || ids.has(definition.id) || codes.has(definition.code) || typeof definition.execute !== 'function' || typeof definition.validate !== 'function' || !Array.isArray(definition.fields)) throw new Error('Invalid module contract or duplicate module id');
  if (new Set(definition.fields.map(field => field.key)).size !== definition.fields.length) throw new Error(`Duplicate module field: ${definition.id}`);
  ids.add(definition.id); codes.add(definition.code);
}
