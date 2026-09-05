# Bridge studio rebuild

## Findings

The installed Three.js / React Three Fiber stack is current enough for this work. The previous implementation was a primitive scene: flat boxes, no road detail, untuned shadows, a camera that remounted the canvas, and water topology that crossed supports. What-if edits invalidated the water without automatically calculating a replacement. Raising the soffit could also invert the deck slab.

## Design before implementation

**Visual thesis:** a dark engineering studio with one dominant, softly lit terrain model, restrained cyan water, concrete structure and precise numerical readouts. Survey geometry remains at true scale.

**Content plan:** event and view controls, a large viewport with camera/layer tools, adjacent what-if controls, then expandable hydraulic evidence and parameter sweeps. The viewport and live outcome numbers occupy the first screen.

**Interaction thesis:** changing an input schedules a cancellable calculation after a short debounce. Only a matching result enables Apply. Camera presets move within the existing canvas; orbit and zoom remain available. Motion is subtle and can be paused. Report images retain their link to the applied calculation.

## Implementation plan

1. Add regressions for automatic previews and pier exclusion; repair water clipping and worker cancellation.
2. Replace the scene with survey terrain with exposed edges, detailed bridge, procedural water shading, fitted camera and tuned lighting. Cosmetic road and railing detail is illustrative, not structural design information.
3. Reorganise the workspace as a responsive studio; make what-if changes automatic, maintain deck thickness and reset multipliers on apply.
4. Verify calculation races, unsupported results, camera presets, real WebGL rendering, desktop/mobile layout, capture and application of a preview. Run repository checks.

## Boundaries

The solver is unchanged. Water elevations interpolate the four calculated sections. Surface animation is illustrative and is not CFD. Blockage remains a uniform area reduction, not inferred debris geometry. Surveys are simplified only for visualisation. Road approach grading and finishes are illustrative; the approach fill is not an additional obstruction in the hydraulic model. Texture assets are bundled locally, with no runtime asset-provider requests or new rendering dependencies.

## Completed and verified

- Rebuilt the studio, terrain, bridge detail, procedural water, structural shadows, depth display and camera fitting. Camera presets retain the same WebGL canvas. Paused scenes render on demand; reduced motion disables automatic animation.
- Added automatic previews with a 300 ms debounce, cancellation and stale-result protection. Applying uses only the matching calculation. Soffit adjustments preserve deck thickness; multipliers rebase after applying. Sliders follow the survey extent, pier footprint, roughness limits and 80% blockage limit.
- Added selectable sweep charts for maximum afflux and minimum freeboard across events, with criterion lines and gaps for unsupported cases. Sweep cancellation terminates the active worker.
- Regression coverage checks pier exclusion, complete wet/dry shoreline wedges, cancellation, out-of-order results, automatic calculation, deck thickness and multiplier rebasing.
- The full suite passed 389 tests. The final build (including TypeScript), scoped lint and the 16 directly relevant tests passed after the final changes. Repository-wide formatting also reports concurrently edited files outside this rebuild; the studio files pass their own formatting check.
- Browser verification covered all camera presets, baseline comparison, applying changes, empty inputs, an unsupported 80% blockage case, depth colours, expanded view/Escape, a nine-case sweep and selecting a case. At 390 px, the page had no horizontal overflow. No browser errors or shader compilation errors were observed. React Three Fiber still emits an upstream `THREE.Clock` deprecation warning.
- For the sample 10% AEP event, changing blockage from 0% to 25% changed afflux from 0.012 m to 0.080 m. A 672,418-character PNG was saved with the applied project and report caption.

Local verification images: `output/playwright/studio-desktop-final.png`, `studio-render-final.png` and `studio-mobile.png`. These are ignored working artefacts, not shipped assets.

## Loading, transitions and road connections

The studio now retains the latest completed inputs and results while a new calculation is pending or fails. It labels that view as the previous result. Once a supported result arrives, a 1.2-second eased transition moves the water levels, shoreline and bridge geometry together. A new target starts from the last displayed intermediate frame. Reduced motion skips the interpolation; pausing decorative flow does not stop result transitions. Intermediate frames are visual only and cannot be exported as report images or persisted as calculations. Unsupported results replace the old view after calculation, without inventing an intermediate water level.

Approach roads now meet both ends of the deck at the exact asphalt elevation and extend to the outer survey bounds. Graded shoulders and side fill close the space between the road and terrain. They remain connected while the deck or opening moves. Where a deck already extends beyond the survey, no additional approach is invented beyond that boundary.

The ground now uses grass, exposed soil and river-gravel colour, normal and roughness maps. Grass blends into a darker gravel waterline, and the deck and approaches share asphalt textures. Smoothed rendering normals reduce the hard faceted bank appearance without changing survey elevations. Twelve optimised, locally bundled texture maps total approximately 3.5 MB. Asset provenance and licences are in `app/public/textures/bridge-studio/LICENSE.md` and `sources.json`.

Browser sampling of the textured scene observed no disappearing-water frames during loading, followed by a monotonic rise over approximately 1.2 seconds with decorative flow paused. Interrupted deck movement, opening changes, reduced motion and mobile layout were also checked. Screenshots: `output/playwright/studio-textures-bridge.png` and `studio-textures-site.png`.

Final verification for this update: 410 tests passed across 46 files; production build, TypeScript, scoped lint and formatting passed. The latest textured report PNG was verified in local project storage at 882,814 characters, with the updated road-approach caption. Browser checks found no shader or runtime errors after the material correction.
