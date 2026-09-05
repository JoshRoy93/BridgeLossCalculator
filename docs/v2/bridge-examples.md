# Real bridge examples

## Scope

Restore the video-backed example chooser using Brisbane and Greater Sydney crossings. Each choice loads a separate editable project, including geometry, flow cases, source references and the assumptions needed by the four-section model.

## Decisions

- Keep the dark blue and cyan workspace style. Bridge tabs switch a shared detail view, with the preview and identity beside the loaded dimensions and flow cases. The earlier two-card chooser hid the useful values below large previews and required a separate selection button, so it has been replaced.
- Use Breakfast Creek Road Bridge and Windsor Bridge. Both have public engineering reports with structure dimensions and hydraulic information. Generic bridges with plausible names were rejected because their inputs cannot be traced.
- Use the current 2024 Brisbane flood study for Breakfast Creek. The 2014 report was useful for finding the structure, but its values have been superseded.
- Use Windsor's published 2013 design, identified by its drawing date. It is not an as-built survey. The old example's deck and soffit levels do not match the published drawing and are replaced.
- Separate published, derived, estimated and assumed values. A complete independent four-section survey was not found in the structure reports. Filling that gap silently would suggest an accuracy the data cannot support.
- Generate the previews from the loaded v2 models. The old Windsor clip shows a truss structure, which does not match the replacement design. Reusing it as footage of that bridge would be misleading. New previews are labelled model animations.
- Make the whole preview clickable for play/pause, with the same action available by keyboard. Videos start still. Switching bridge stops the previous preview.
- Keep the original source record with project JSON and HTML reports. If inputs change, label the record as original example history. Looking up a live catalogue alone would lose the basis of an older saved assessment.
- Leave external comparison targets and the criteria source unset. Published near-bridge levels are not equivalent to this model's approach section. Loading public data cannot complete an engineering review.
- Keep Breakfast Creek's channel reconstruction explicit. Public height/depth grids agree numerically when used to recover model terrain, but trial transects cross an unresolved low strip beyond the northern bank. They need a mapped alignment check before use as hydraulic sections.

## Preview assets

## Gallery layout and interaction

Visual thesis: a compact engineering reference view in the existing dark blue palette, with a single preview and readable values sharing the screen.

Content plan: bridge tabs, preview and identity on the left, dimensions and flow cases on the right, then one load action. Keep the full source record collapsed below for detailed checking. On narrow screens, stack the compact preview above the values and keep the flow table within the page width.

Interaction thesis: the active tab underline slides to the selected bridge, and the preview and values enter together with a short directional fade. The preview responds to hover and keyboard focus. Reduced-motion settings remove the transitions. Arrow keys, Home and End switch tabs without loading a project.

## Preview assets

The two 6.5-second WebM clips in `app/public/demo-bridges` were recorded from the v2 bridge studio at the first loaded flow case: Breakfast Creek at 212 m³/s and Windsor at 275 m³/s. Posters come from the same canvas. Deck finishes and water motion are illustrative; the clips are not site footage or a velocity-field simulation. No report photography was republished.

Detailed source checks: [Brisbane](brisbane-bridge-research.md) and [Windsor](sydney-bridge-research.md).

## Validation

Both demos pass input validation and calculate all six loaded events. Tests cover independent project copies, source-record export/import, unsafe source links, source-history changes and the gallery load action. The full suite passed 401 tests; build, lint and formatting checks passed.

Browser checks covered both video play/pause controls, loading and calculating Windsor, the Breakfast Creek 3D preview, and desktop/mobile gallery layouts. The final gallery check found no page errors or failed requests. At a 390 px viewport, the document remains 390 px wide and the source table scrolls within its container. Screenshots are in `output/playwright/bridge-gallery-desktop.png` and `bridge-gallery-mobile.png`.
