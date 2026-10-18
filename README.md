# Hacker Toolbox

A browser-based simulation toolkit with twelve independent workflows, realistic operational text, and an explicit final reveal. The original Matrix visual identity, top navigation, tool cards, and split terminal layout are preserved.

[Product requirements (Chinese)](PRD.md) · [Module authoring](docs/module-authoring.md) · [Live site](https://bushixiucai.github.io/hacker-tools-ultimate/)

## Tools

Website takeover, port scanning, credential auditing, camera access, satellite tracking, ransomware alert, traffic panel, WiFi analysis, keyboard-driven terminal, phone control, fictional wallet search, and attack/defense situational awareness. The homepage also contains twenty short, individually configured checks.

All scanning, authentication, device, filesystem, wireless, wallet, and traffic activity is generated inside the page. No real attack or device operation is performed. Only website preparation may attempt bounded, credential-free reads of public metadata when browser CORS permits it. It silently uses deterministic generated material otherwise. No proxy or metadata backend is used.

Each tool owns its own runtime and recent reports. Switching tools keeps their work alive; a new run requires a new target. All run data is held in page memory and disappears on refresh. Theme and sound preferences are stored locally. No analytics or telemetry are included.

## Development

```sh
cd app
npm ci
npx playwright install chromium webkit
npm run dev
npm run typecheck
npm run test:core
npm run test:e2e
npx playwright test -c playwright.mobile.config.ts
```

`npm run test:e2e` builds the production artifact, runs core lifecycle tests, desktop/mobile browser flows, and the twenty quick checks. The network-boundary checker permits the reviewed public-metadata adapter only; simulated modules cannot make target requests.

## Sharing

Reports export as PNG images or versioned, compressed URL-fragment links without a backend. Finite workflows replay their key decisions and results before revealing the simulation. Continuous tools share a frozen result and a short presentation. Replay never reads the original target again, and unavailable source imagery is replaced by bundled material.

## Architecture

- `app/src/core/`: contracts, isolated runtime, deterministic profiles, registry, public metadata adapter.
- `app/src/features/definitions/`: independent tool parameters and execution flows.
- `app/src/workbench/`: terminal, specialized renderers, reports, quick checks, and responsive surfaces.
- `app/public/media/`: offline footage, generated photos, world outline, and provenance notes.
- `app/tests/`, `app/e2e/`, `app/e2e-gags/`: lifecycle, interaction, mobile, sharing, and boundary tests.
- `scripts/`, `prototype/`, `docs/PRD*`: legacy content and prototypes retained for reference; the active application uses the v0.6 definitions.

A module is discovered through its definition; it does not require editing the application shell or task scheduler. Complex views register separately. Code comments and extension examples use English; product copy uses Chinese with technical English where appropriate.

## GitHub Pages

The GitHub Actions workflow builds, checks, and tests the exact artifact before deploying it. Static output uses relative paths and hash routes, so the repository subpath works without a server. Security policy is declared in the HTML because GitHub Pages does not apply `_headers` files.

Generated-media provenance is documented under `app/public/media/`. No real camera, phone, location, local file, private key, or financial account is accessed.
