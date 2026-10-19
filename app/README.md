# Application

Vite and strict TypeScript, with no runtime library dependencies. See the [repository guide](../README.md), [product requirements](../PRD.md), and [extension contract](../docs/module-authoring.md).

```sh
npm ci
npx playwright install chromium webkit
npm run dev
npm run build
npm run test:core
npm run test:e2e
npx playwright test -c playwright.mobile.config.ts
```

The production application always includes all twelve tools and the twenty quick actions. There is no optional short-action build flag in v0.7. Legacy script content is not the active execution contract.
