# V2 decision register

Each entry records the choice, the alternative and why the choice fits the workflow.

## D01. Replace the active workspace and solver; retain v1 as reference

The Next.js application remains the delivery shell. V2 has its own domain and UI modules. V1 source and tests remain available but the home page does not expose v1 workflows.

Extending the existing store would preserve incompatible units, stale derived state and loosely connected tools. Deleting the old implementation would discard useful comparison material. Separate modules give v2 a clear calculation contract without erasing history.

## D02. Use SI throughout v2

Store and calculate lengths in metres, discharge in cubic metres per second and velocity in metres per second. Every editor states its units. Legacy imports convert Imperial values once at the boundary.

A global unit toggle was the alternative. V1's descriptions already disagree about its internal units, so v2 avoids two editable representations. Imperial projects can migrate through an explicit conversion.

## D03. Use four sections and one energy method

The model steps upstream from exit to downstream opening to upstream opening to approach. Each section has its own survey and a uniform Manning roughness. Use alpha equal to one, mean-conveyance friction and user-entered contraction and expansion coefficients. Solve the energy equation on the subcritical branch.

Reusing the four v1 methods would preserve unverified WSPRO corrections and a deficient energy balance. Implementing all HEC-RAS flow classes would require a much wider validation programme. V2 therefore reports pressure contact, overtopping, critical-flow control and survey exceedance as outside its supported calculation range.

USACE describes bridge energy computations as successive balances across sections and treats flow classes separately. This informs the model structure, but does not establish numerical equivalence with HEC-RAS. [USACE bridge computations](https://www.hec.usace.army.mil/confluence/rasdocs/rasum/latest/entering-and-editing-geometric-data/bridges-and-culverts/bridge-hydraulic-computations).

## D04. Define afflux using a bridge-free baseline

Run the same sections, discharges, roughness, reach lengths and downstream boundary without abutment clipping, piers, debris or bridge transition losses. Afflux is the difference between the two approach water levels.

Subtracting downstream from upstream water level also includes the natural reach gradient. That quantity cannot identify the bridge's effect. V2 displays both water levels and the baseline used.

## D05. Keep storage local and portable

Save named projects in browser storage and provide complete JSON backups. Surface storage failures and never claim a save succeeded when it failed. Imported files create a separate project. Result records include their inputs and engine version; imports recalculate results instead of trusting supplied numbers.

A server, accounts and shared approvals would add deployment and identity requirements that this repository does not have. Local review records are attributed notes, not authenticated signatures. Shared team storage is a separate product decision.

## D06. Make evidence and criteria explicit

Engineers enter freeboard and afflux limits with a source and record survey, boundary, model and review evidence. Criteria results mean only that the supported calculation meets those entered limits. Missing evidence prevents review completion.

Hard-coded jurisdiction presets would imply that a few numbers certify compliance. V2 does not make that claim. Review remains the engineer's responsibility.

## D07. Replace speculative integrations with explicit imports

CSV survey import must report the offending row instead of silently skipping it. External-model CSV uses named events and stated SI units. Rainfall estimates require manually entered intensity, duration and source. Link to the official data provider.

The alternative was to keep guessed ARR API response formats and permissive native HEC-RAS parsing. A partial parser can silently lose model semantics. Native HEC-RAS files are not accepted in v2; use exported section and result tables. The [Bureau of Meteorology](https://www.bom.gov.au/water/designRainfalls/) publishes design rainfall data and explains its relationship with ARR.

## D08. Export deterministic reports without AI

Reports include project data, calculation results, model limits, review notes and source records. Users can print to PDF or download a self-contained HTML report, results CSV and project JSON.

AI-generated narratives and rendered 3D scenes add no necessary evidence to the calculation. The alternative would also introduce API credentials and external requests. V2 uses a geometry-based SVG drawing and editable engineering notes.

## D09. Ship static files and isolate the old API

V2 builds to `app/out`. The local server only reads those static files. The old AI route handlers moved to `src/legacy/api` so they cannot read credentials or receive requests from a deployed v2 site. Their reference tests remain.

Keeping the Next.js server was unnecessary for a local calculation workspace. A static deployment also makes its network boundary easier to inspect. The included server binds to loopback and returns 404 for missing paths.

## D10. Preserve edits while calculations run

The solver runs in a browser worker with a 60-second limit. Completion attaches the run to the matching project without replacing newer inputs. If inputs changed during the calculation, that run is immediately out of date.

Running everything on the UI thread would block interaction for large surveys. Capturing an entire project before an asynchronous run would overwrite edits made while it was running. An input record and a separate run update avoid both problems.

## D11. Preserve recoverable data when storage fails

Browser storage errors remain visible. Corrupt data is available as a recovery download and is not overwritten automatically. Another tab changing the workspace stops autosave in this tab. Starting fresh requires an explicit action in the application.

Silently starting an empty project after a parse error would conceal data loss. Last-write-wins storage would overwrite work in another tab. Browser storage still has quota limits, so JSON backup remains part of the workflow.

## D12. Keep legacy verification separate

The normal lint command checks the active application, v2 tests and static server. `lint:legacy` exposes inherited lint debt separately. Type checking covers the full repository, and the test command runs both legacy and v2 tests.

Reformatting every dormant v1 component would expand this change without improving the delivered application. Three inherited test typing errors were fixed so the full type check can pass. Passing legacy tests does not validate the replacement solver.

## D13. Apply dependency security updates

The inherited dependency audit reported 21 findings. Compatible fixes removed most; Next.js and its matching ESLint configuration were then pinned to 16.3.4, the fixed release identified by npm audit. The resulting audit reported zero findings on 5 September 2026.

Keeping the old version solely to reduce the diff would retain known issues. A forced bulk upgrade was unnecessary. Build, type, lint and test checks cover the selected update.

## D14. Migrate legacy files explicitly

Legacy JSON has its own import action. Its engine values convert from feet and cfs regardless of the saved display-unit preference. The single survey is repeated at four positions, the first survey roughness is adopted, and the imported project explains those assumptions. Review and results start empty.

Automatic migration without a visible warning would imply that a single-section model contains four surveyed sections. Native HEC-RAS files remain unsupported because the old parser did not preserve enough of the hydraulic model to make that promise.

Skewed bridges and non-horizontal soffits are rejected during migration. Silently flattening those shapes would change the problem without the engineer choosing that simplification.
