# Bridge Loss Calculator v2

## Purpose

An engineer needs to check how a bridge changes upstream water level, test assumptions, compare the result with an external model, and hand a reviewer the exact inputs and calculation record. That is the useful core of this repository.

V2 is a local engineering assessment workspace for steady, subcritical, free-surface bridge screening. It supports separate surveyed sections, explicit downstream boundaries, a bridge-free comparison, scenarios, project criteria and review evidence. It does not certify a bridge or claim to reproduce HEC-RAS.

## Repository review

Reviewed starting commit `69fae5fe0864b2232409a9c4b2b431c836e4ce0c` on `master`. Work proceeds on `v2`.

| Finding | Evidence | V2 response |
| --- | --- | --- |
| Failed rainfall requests install invented intensities | `app/src/components/hydrology/arr-lookup.tsx`, `generateMockIFD` fallback | Require entered rainfall intensity and source. Never fabricate fetched data. |
| Input edits leave results intact | `app/src/store/project-store.ts`, input update actions | Bind calculations and review to an exact assessment input record. |
| Energy calculation omits the upstream/downstream velocity-head balance | `app/src/engine/methods/energy.ts`, objective function | Replace the active solver with an explicit SI standard-step energy balance. |
| Four named methods do not represent four independent validated models | `wspro.ts` approximation table and correction factors; common pressure-flow dispatch | Publish one inspectable supported method. Keep v1 code for reference only. |
| One survey section stands in for a whole crossing | `ProjectState.crossSection` | Store four individually editable sections in downstream-to-upstream order. |
| Water-level rise across the reach is called bridge loss | `energy.ts`, `totalLoss = usWsel - dsWsel` | Calculate afflux against an otherwise identical run with the bridge removed. Report reach head loss separately. |
| Project JSON omits evidence, scenarios and review state | `app/src/lib/json-io.ts`, `ExportData` | Export a versioned complete assessment document. Recalculate imported inputs. |
| Claims exceed the available evidence | Root README says regulatory-compliant reports and static export; config has no static export | Replace claims with tested behaviour and explicit model limits. |

## Delivery sequence

1. Establish the domain, input contract, decision register and calculation limits.
2. Build an SI calculation engine with geometric integration, standard-step solves, natural baseline and explicit unsupported states. Test against analytical identities and independent expected values.
3. Build a persistent project workspace with project setup, four sections, bridge geometry, flows, validation and source records.
4. Add saved alternatives, external-model comparison, user-defined criteria, review evidence and immutable run records.
5. Produce portable JSON, CSV and self-contained printable reports. Check import failures and stale results.
6. Verify the production build, automated tests and real browser workflows at desktop and mobile sizes. Record the evidence and remaining engineering limits.

## Design direction

Visual thesis: retain v1's dark blue workspace, cyan accents and subtle engineering grid, with readable controls and precise technical drawings. The initial warm white design was replaced after user review.

Content plan: a persistent project rail; an assessment overview with a bridge cross-section as its main visual; focused input editors; results and review alongside their evidence; a report workspace.

Interaction thesis: short workspace transitions, immediate geometry previews and clear saved/run state changes. Respect reduced-motion preferences.

Data entry uses editable tables for survey coordinates and flow events. CSV and spreadsheet paste populate cells; raw CSV is not the manual editor. See [UI refresh decisions and checks](ui-refresh.md).

## Completion criteria

An engineer can create or open a project, enter source-backed geometry and flows, resolve validation errors, run an assessment, inspect its calculation record, save and compare alternatives, record an external comparison, complete review evidence, export a report and reopen the project without losing work. Invalid or unsupported calculations cannot receive a passing assessment. Changes cannot retain current review status.
