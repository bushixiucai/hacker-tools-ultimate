# PRD v0.7 implementation plan

Status: implementation complete; release is gated by GitHub Actions and public Pages verification. The user explicitly authorized autonomous parallel work, GitHub push, and GitHub Pages deployment. [PRD](../../PRD.md) is authoritative.

- [x] Establish independent tool contracts, automatic runtime stages, cancellation, and new-run isolation.
- [x] Preserve original Matrix style, top navigation, cards, and split terminal.
- [x] Implement twelve independent tools and twenty differentiated quick checks.
- [x] Implement public metadata preparation with bounded silent fallback.
- [x] Implement report PNGs, finite replay, and continuous result snapshots.
- [x] Exercise desktop and 320/390/landscape mobile workflows.
- [x] Final lifecycle, media, mobile WebKit, and visual regression checks.
Release delivery: commit scoped project changes, push main, then verify the Actions deployment and public artifact. The repository Actions history and final delivery response record the deployed revision.

Acceptance evidence: [v0.7 acceptance record](../../qa/v0.7-acceptance.md).

Do not use the rejected cross-tool workbench or shared credential chain. No target or run-state sharing across independent tools.

The v0.7 revision removes built-in blocking choices, collapses optional configuration, automatically enters the CMS result, updates process copy and per-tool reveals, and keeps all existing free-play controls. Release remains gated by the browser suite and public artifact verification.
