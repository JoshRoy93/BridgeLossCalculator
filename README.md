# Bridge Loss Calculator v2

A local workspace for bridge waterway screening and engineering review. Enter four survey sections and design flows, calculate bridge afflux against a bridge-free reach, compare alternatives, record evidence and export a reproducible assessment.

V2 replaces the active v1 interface and calculation path. Work is on branch `v2`. The repository review, plan and key choices are in [the v2 plan](docs/v2/plan.md) and [decision register](docs/v2/decisions.md).

## Run it

Use Node.js 22.22 or later.

```powershell
cd app
npm ci
npm run build
npm start
```

Open http://127.0.0.1:3000. To use a different port, set `PORT` before starting. `npm run dev` starts the development server.

The production build is in `app/out`. It can be hosted on a static HTTPS host. No database, account, API key or external service is required. The included production server binds to localhost. Missing paths return 404.

## The assessment workflow

- Create a named project with its purpose, location, datum and preparer.
- Enter or import four separate survey sections in SI units. Preview and apply CSV coordinates before calculation.
- Define the bridge opening, piers, reach lengths, roughness and loss assumptions.
- Add flow events with explicit downstream boundaries and source records.
- Calculate water levels and inspect section energy balances. Afflux compares the bridge case with the same reach without bridge obstructions.
- Save calculated alternatives, edit assumptions and compare changes at matched flow and tailwater.
- Enter external model results, set project criteria and record engineering review evidence.
- Download complete project JSON, results CSV and a self-contained HTML report. Print the report to PDF using the browser.

Projects autosave in the current browser. Download JSON for backup and handover. The worked example uses synthetic data and says so in its source records. See the [operating guide](docs/v2/workflow.md).

## Model boundary

The v2 solver supports steady, subcritical free-surface flow through a straight bridge with a horizontal soffit. It uses uniform roughness per section and a velocity-head coefficient of one. It reports unsupported cases when the downstream boundary, surveyed banks, soffit or critical-flow limit prevents a valid solution.

Pressure flow, overtopping, scour, sediment transport, skew, arches, floodplain bypass and unsteady flow require an external model. V2 does not certify bridge safety, establish regulatory compliance or claim numerical equivalence with HEC-RAS. [Calculation method and verification limits](docs/v2/method.md).

Native HEC-RAS files are not accepted. Import exported survey and comparison CSV tables instead. Legacy BLC JSON has a separate migration action that converts its internal feet and cfs to SI and explains the assumptions requiring review.

## Verification

```powershell
cd app
npm test
npm run typecheck
npm run lint
npm run format:check
npm run build
```

`npm test` includes the existing v1 reference tests and the new v2 tests. Normal lint covers the active application. `npm run lint:legacy` checks dormant v1 code separately. See [release verification](docs/v2/verification.md) for the recorded results and browser checks.

## Source map

| Path | Purpose |
| --- | --- |
| `app/src/v2/model.ts` | Assessment, run, alternative and review contracts |
| `app/src/v2/hydraulics.ts` | SI geometry and standard-step energy solver |
| `app/src/v2/io.ts` | Validated project, survey, comparison and legacy imports |
| `app/src/v2/use-workspace.ts` | Local persistence, recovery and concurrent-tab handling |
| `app/src/v2/components` | Editors, drawings, results, review and export |
| `app/src/v2/report.ts` | Deterministic reports and CSV |
| `app/tests/v2` | Numerical, lifecycle, import and storage tests |
| `app/src/legacy` | Unrouted v1 API reference code |
| `docs/v2` | Review, plan, decisions, method, operating guide and verification |

The remaining v1 component, engine and store folders are reference material. They are not imported by the v2 entry point. Earlier design documents under `docs/superpowers` describe v1 and are not the current product contract.

This is a private project. All rights reserved.
