# Application

The active product is Bridge Loss Calculator v2. Start with the [root README](../README.md), [v2 operating guide](../docs/v2/workflow.md) and [calculation method](../docs/v2/method.md).

The entry point is `src/app/page.tsx`, which loads `src/v2/workspace.tsx`. All v2 domain and UI code lives in `src/v2`. The old components, store and Imperial engine remain for reference and regression tests. Their local README files describe v1 only.

Run `npm ci`, `npm run build`, then `npm start`. The build writes static files to `out`; the included server listens on localhost port 3000. Set `PORT` to change the port. Calculations need no account. Optional AI assessment uses OpenAI account sign-in through the bundled Codex package. The local server keeps the application's auth cache in `../.blc-local/codex/auth.json`. `npm run dev` includes the same local account service.
