# Adding an independent tool

[PRD v0.6](../PRD.md) is the product contract. Tools share technical components, never credentials, prerequisite results or mutable sessions. The application preserves its original header, home cards, themes and two-column terminal; adding a tool does not introduce a global workbench.

## Register a definition

Create a default-exported `ModuleDefinition` in `app/src/features/definitions/`. The eager Vite registry discovers definitions and orders them by `order`. Use unique `id`, command `code`, and field keys. Registration creates the home card, terminal navigation, parameter form and command entry automatically.

```ts
import type { ModuleDefinition } from '../../core/types';

const definition: ModuleDefinition = {
  id: 'service-inventory', code: 'inventory', order: 20,
  name: 'Service inventory', category: 'Discovery',
  description: 'Inspect service records and save a report.',
  fields: [{ key: 'format', label: 'Format', type: 'select', default: 'text',
    options: [{ value: 'text', label: 'Text' }, { value: 'json', label: 'JSON' }] }],
  validate(params) {
    return ['text', 'json'].includes(params.format) ? {} : { format: 'Choose a report format.' };
  },
  async execute(ctx, params) {
    ctx.phase('Preparing inventory', 15);
    const scope = await ctx.choose('Select inventory scope', [
      { value: 'all', label: 'All services' }, { value: 'web', label: 'Web services' },
    ]);
    await ctx.wait(300);
    const services = ctx.target.services.filter(service => scope === 'all' || [80, 443].includes(service.port));
    const report = params.format === 'json' ? JSON.stringify(services, null, 2)
      : services.map(service => `${service.port} ${service.name} ${service.version}`).join('\n');
    ctx.target.files['/reports/inventory.txt'] = report;
    ctx.target.data.inventory = { scope, count: services.length };
    ctx.log(`REPORT ${services.length} SERVICES`);
    ctx.changed();
    return `Saved ${services.length} service records.`;
  },
};
export default definition;
```

Do not ship unfinished demonstration definitions in the production discovery directory. The runtime tests inject a minimal extension to verify registration-independent execution, choices, graceful stop and cleanup.

## Input and independent state

The application owns one `new Runtime([definition])` per tool. Use `startRun(moduleId, input, params)`: target parsing, required fields, enum checks, defaults and `validate` all complete before state mutation. Errors use `ValidationError.errors`, keyed by field name. A runtime permits one pending task; other tool runtimes continue independently.

Every run creates a fresh target with a unique run ID, deterministic base profile, empty `data` and unmodified business records. The same normalized input yields the same base seed, not a reused mutable target. `Target.data` contains tool-specific state; type that state in the tool implementation. `files` contains only local virtual report text. Neither storage area is shared with another tool. Do not restore a cross-tool resource or credential chain.

The target is required by default. Set `targetRequired: false` for scene-only tools. Optional `continuous`, `autoReveal`, `order` and `view` describe tool behavior. Fields support text, number, select, defaults, descriptions, required flags and `advanced: true` for collapsed advanced configuration. Parameter controls and shell `run <target> --format=json` call the same execution path. Each new run requires a new target entry; the latest five runs and their matching targets are retained as session-only inspection records. Logs retain the latest 1,000 lines, with `task.logOffset` counting discarded lines; shell subscribers use absolute offsets. Replay events retain the latest 500 entries. Continuous tools must also bound their own sample arrays.

## Execution and lifecycle

The context exposes `target`, `task`, `signal`, `log`, `phase`, `wait`, `changed` and `choose`. `wait` and `choose` reject on cancellation. `runtime.choose(taskId, value)` accepts only currently available options; choice events are captured for reports and replay. Always await the choice instead of polling DOM state.

Use `ctx.wait` rather than unmanaged timers. Check the abort signal after asynchronous dependencies before mutating state. Calling `changed`, `log` or `phase` after cancellation throws; cleanup in `finally` may restore local state directly, and only publishes through `changed` when the signal is not aborted.

Continuous executors implement their own state loop, pause behavior and graceful stop. The generic `runtime.stop(taskId)` sets `target.data.stop = true`; a view may also use a typed tool-owned stop flag. `cancel` aborts immediately; `end` cancels only this runtime. No module IDs belong in the generic runtime cleanup path. Restore transient state in `finally` for success, failure and abort.

Switching tools disposes visible resources, not the running executor. Returning mounts the view from retained state. Video, animation, event handlers and timers created by a view must be released by its disposer. Explicitly ending a tool releases execution resources and reveals the ending. Ransom is the documented automatic-ending exception.

## Specialized views

A simple definition can use the generic output. Complex tools declare a `view` key and register the associated renderer through the view registry in `app/src/workbench/views.ts` or its dedicated view registry. Adding a genuinely new visual component may add a renderer registration; it must not add tool-ID branches to the application entry point, router or shell. Follow the actual registry exports in that file.

Render from the current tool runtime, apply changes through `updateTarget`, and return a cleanup function. Keep inactive tasks running without leaving offscreen videos playing. Use `textContent`, form values and DOM APIs for target names, terminal text and editable content. Never inject untrusted strings into HTML or execute replay content.

## Public metadata exception

Simulation executors do not fetch targets, open sockets, access devices, invoke system commands or touch real files. The sole exception is the website preparation adapter in `core/metadata.ts`: bounded, unauthenticated public HTTP(S) reads with `credentials: 'omit'`, short timeout, resource limits and no proxy service. It may parse readable title, description and visual metadata without executing page HTML or scripts. CORS denial, timeout or missing fields silently retain deterministic generated metadata.

Do not claim an unreadable response was parsed. Generated and public fields have internal provenance. The adapter is not a general network permission for other tools. Sharing must remove remote image/icon URLs and use local equivalents; replay never refetches the target.

## Sharing and verification

Finite tools replay necessary inputs, choices and final edits. Camera, typer, traffic and board share a final snapshot plus a short presentation, not an operation recording. Snapshot data must be bounded and validated; no executable code, full video or unbounded logs in URLs. Export and replay keep a readable simulation disclosure.

From `app/`:

```sh
npm run build
node --test tests/runtime.test.mjs
npm run test:e2e
```

Cover atomic invalid starts, causal failure/retry, deterministic base data, fresh-run isolation, independent concurrent tool instances, pending-choice abort, executor cleanup and meaningful configuration changes. Browser checks reject target traffic from simulation tools; website metadata uses explicit allowed/mock reads with failure and timeout coverage. Test 320 px and 390 px widths, landscape, reduced motion, visible disclosure, keyboard exits and actual controls. A build or screenshot alone does not establish interaction quality or deployed acceptance.
