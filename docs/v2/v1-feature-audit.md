# V1 feature restoration

Reviewed 5 September 2026 against v1 `69fae5f` and the v2 entry point introduced in `62b346a`. The old implementation remains in the tree, but the new entry point imported none of it. This was a product regression for visualisation and AI reporting, beyond the intended replacement of the hydraulic solver.

## Restored on the v2 model

| V1 function | Current implementation |
| --- | --- |
| Interactive 3D bridge, terrain and water | `3D & what-if`, rebuilt from four SI survey sections and complete v2 water-level results. Orbit, pan, zoom and three camera views. No water surface for stale or unsupported results. |
| Animated flow and speed controls | Play/pause and speed controls for illustrative flow markers. They are not a simulated velocity field. |
| 3D screenshots and report image | Download PNG or include the current view in the report and project JSON. Images tied to an old run are excluded from current reports. |
| Energy/hydraulic grade diagram | Water, energy and bridge-free profiles at the actual reach distances, with a section-level results table. |
| What-if controls | Opening width, soffit, blockage, roughness and discharge previews using the v2 worker. Explicit calculate, apply and reset. Project inputs stay intact until apply. |
| Optimiser | Nine-case opening-width or blockage sweep. Every event must be supported and meet the current afflux and freeboard criteria. This reports passing sampled values rather than claiming a continuous optimum. |
| AI assessment / report narrative | Technical or summary draft based on the complete current report; editable text, regeneration, cancellation, model selection, project persistence and HTML/PDF inclusion. Stale drafts are retained but excluded. |
| OpenAI account access | In-app browser login through the official Codex App Server, separate local `auth.json`, automatic Codex credential reuse/refresh and sign-out. No manual token extraction or browser-local credential storage. |
| Rational Method discharge aid | Source-required area, intensity, duration, runoff coefficient and tailwater inputs; creates a flow event with the assumptions in its source record. Correct SI formula uses `Q = C I A / 3.6` for km² and mm/h. |

## Existing replacements retained

Project autosave, complete project JSON, legacy import, survey CSV, external comparison CSV, printable PDF/HTML reports, result CSV, saved alternatives, restore, matched-case comparison, editable criteria and review evidence already exist in v2. They remain the active workflow. Saved alternatives retain full calculation inputs and can be restored; they are not snapshots of every project metadata field.

## Older features still outside the active v2 model

| Feature | Review finding and boundary |
| --- | --- |
| Energy, momentum, Yarnell and WSPRO method selector | The earlier review found these were not four independently validated models. V2 keeps its explicit standard-step solver. Reintroducing the selector requires separately validated implementations. |
| Pressure flow and overtopping | Outside v2's free-surface solver. An unsupported result continues to require an external model. |
| Scour, sediment and hazard classification | V1 used imperial values and assumed scour correction factors. No validated SI adapter or foundation/sediment input contract exists. These were not reconnected to v2 results. |
| Multi-bridge reach solver | V2 represents one crossing with four sections. Multiple crossings require a reach-level input and solver contract. |
| Automatic rainfall lookup and empirical concentration-time tools | The v1 rainfall request could substitute invented intensities on failure. V1 also divided km²-based Rational Method inputs by 360, a factor-of-100 error. The restored helper uses entered, source-recorded rainfall and duration with the corrected conversion. |
| Automatic debris recommendations and regulatory checklist presets | These cannot establish site-specific design allowances or compliance. Enter supported blockage assumptions and project criteria with sources. |
| Native HEC-RAS model import | The old parser did not preserve enough model data. Use exported survey and comparison tables. |
| General AI chat and section-by-section narratives | This restoration provides a report assessment, not a separate persistent general chat or every old narrative template. |
| Full metadata snapshot history and specialised QA memo PDFs | Saved calculation alternatives and full reproducible reports cover the core handover, but do not reproduce these separate v1 interfaces. |

## Authentication design

Both `npm start` and `npm run dev` expose the local account endpoints on the same loopback origin as the UI. Static files are still exportable. The endpoint rejects foreign origins, non-loopback Host headers and mutations without the app's custom header. Credentials and raw upstream errors never enter browser responses or project JSON. The runtime strips inherited OpenAI/Codex environment settings and uses an app-specific Codex home.

Report generation uses a fresh ephemeral thread, read-only sandbox, no approvals, disabled shell, multi-agent, image-file and web-search tools, and the supplied report as untrusted data. The local transport rejects server-initiated interactive tool requests. User changes during generation prevent the returned draft from overwriting a changed assessment. AI text never completes engineering review automatically.

Official references: [Codex App Server](https://learn.chatgpt.com/docs/app-server), [authentication and credential storage](https://learn.chatgpt.com/docs/auth), [configuration](https://learn.chatgpt.com/docs/config-file/config-reference). Package version tested: `@openai/codex` 0.147.0.

## Verification

Automated tests cover SI scene geometry, unsupported water surfaces, hydrology unit conversion, report-image persistence, AI draft import/export, stale exclusion, HTML escaping, review invalidation, local endpoint origin checks, login/logout protocol, cancellation, failed generations and thread isolation.

Verification on 5 September 2026:

- Full suite: 382 tests in 39 files passed. The final local-service changes also passed the six targeted service/transport tests.
- Production build, full TypeScript check, active lint and formatting checks passed.
- Actual Codex 0.147.0 process: initialisation, account status, model list and read-only ephemeral thread creation succeeded without using existing developer credentials.
- Production browser: calculated the worked example, rendered the 3D bridge, previewed 30% blockage, applied the preview, ran nine sweep values and captured a report image. No browser errors were observed; Three.js emitted upstream deprecation warnings.
- Exported HTML contained the embedded PNG and edited AI fixture text, with no script or auth-file reference. The edited draft persisted across reload and service restart.
- AI UI: generated and edited a clearly labelled test fixture response using Playwright request interception. This checks UI integration, not real model output.
- OpenAI login button opened the official OAuth authorisation page. The test login was cancelled without entering credentials.
- Mobile report and AI controls inspected at 390 by 844 pixels. Captures are under `output/playwright` locally.
- Development server returned HTTP 200 and exposed the same local account service.

Live authenticated generation, account authorisation, cached-login reuse after successful sign-in and token refresh still require the user to complete OpenAI sign-in. They are implemented through the official runtime but are not claimed as end-to-end verified here.
