# V2 release verification

Verified locally on Windows on 5 September 2026, using Node.js 22.22.0 and the production static build served at `http://127.0.0.1:4173`.

## Automated checks

| Check | Result |
| --- | --- |
| Existing reference suite | 339 tests passed |
| V2 suite | 22 tests passed |
| Full suite | 361 tests across 35 files passed |
| TypeScript | Passed across application and tests |
| ESLint | Passed for active v2, App Router files, v2 tests and server |
| Prettier | Passed for v2 source and tests |
| Production build | Passed with Next.js 16.3.4; only static page routes emitted |
| Dependency audit after updates | Zero findings |
| Whitespace check | `git diff --check` passed |

V2 tests cover analytical triangular-channel geometry, SI conveyance and Froude scaling, analytical normal flow in a sloped prismatic channel, each step's energy residual, bridge-free zero afflux, dry and unsupported boundaries, invalid input rejection, stale results, full project round-trips, untrusted saved numbers, review invalidation, engine-version changes, strict CSV parsing, report escaping, CSV formula protection, legacy unit conversion, persistence, corrupt storage, quota failure, concurrent tabs and edits made during a run.

Legacy API error tests deliberately emit their mocked failure messages. Those handlers are not deployed. The test runner also reports a future Vite configuration-loader warning; it does not affect the passing suite or production build.

## Browser checks

Used Chromium through Playwright against the production files, not a mocked provider.

- Loaded the worked example, ran three events and inspected the geometry drawing and results.
- Entered the preparer and saved the existing crossing as an alternative.
- Changed blockage from 0% to 20%. Results became out of date immediately and the changed input survived reload.
- Ran the browser worker. At matched flow and tailwater, the displayed 1% AEP afflux changed from 0.022 m to 0.093 m. This checks the example workflow, not real-site accuracy.
- Completed explicitly labelled test criteria and review evidence. The review action remained disabled until the required fields were present.
- Downloaded full report HTML, results CSV and project JSON through their actual controls.
- Reopened the JSON through the file picker. Inputs and the saved alternative remained available; imported review completion was cleared.
- Entered a malformed survey row. The UI reported its row number and blocked a run with unapplied coordinates. Applied a valid change, observed stale results, then reran successfully.
- Entered an external 1% AEP approach level of 103.35 m. After rerunning, the comparison showed about -0.009 m and was within the entered 0.1 m tolerance.
- Checked the overview and report at 390 px width. The document width remained 390 px; wide tables scroll within their containers.
- The checked browser session reported no console errors or warnings and no external service requests. All recorded requests were static application assets.
- The local server returned 200 for `/`, 404 for a missing page and the removed AI endpoint, and 403 for an encoded path traversal attempt.

## Report rendering

Downloaded the actual HTML report and printed it with Chromium. Rendered the PDF pages with PyMuPDF and inspected their layout. Tables fit the landscape A4 page; calculation cases and survey sections have print grouping rules to keep headings with their data. The report includes every survey point, geometry units, run identity, engine version, evidence and model limits.

Local verification artifacts are under `output/playwright` and `output/pdf`. They are intentionally ignored by Git. They contain synthetic demonstration data.

## What these checks do not establish

This release is ready for the documented local screening workflow. It has not been calibrated against an independently prepared HEC-RAS benchmark suite or validated for regulatory certification. The example is synthetic. Pressure flow, overtopping, scour and the other exclusions in the method document remain outside the solver's scope.

Review records are local attributions, not authenticated approvals. Browser storage is not shared team storage. No remote deployment or organisational approval was performed.
