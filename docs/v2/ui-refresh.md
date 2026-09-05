# UI and data-entry refresh

User review on 5 September 2026 asked for the earlier visual style and a practical alternative to editing raw survey CSV.

## Decisions

| Decision | Alternative considered | Reason |
| --- | --- | --- |
| Restore the dark blue palette, cyan controls and subtle grid from v1. | Keep the warm white and sage v2 design. | The user preferred v1's style. Shared colour tokens apply it consistently to navigation, inputs, drawings, tables and feedback. |
| Keep the v2 navigation and workflows. | Restore the entire v1 interface. | The request concerns style and usability. Restoring the old interface would also restore its disconnected editors and incomplete actions. |
| Use editable survey rows with keyboard movement, row insertion/removal and direct spreadsheet paste. | Keep the raw CSV textarea or add a file importer alone. | Manual entry should not require users to maintain delimiters or a header. Import and paste fill the same visible table. |
| Apply valid survey drafts explicitly. | Recalculate geometry after every keystroke. | Empty cells and temporarily unordered stations are normal during editing. The drawing and calculation keep using the last applied survey until the draft is valid and applied. |
| Show cell errors without sorting or repairing survey data. | Sort station values or turn empty cells into zero. | Those shortcuts can conceal missing points or change the supplied survey. |
| Use a desktop flow table with bulk paste and labelled event fields on phones. | Repeat a large form per event at every screen size. | A table makes discharge and boundaries easier to compare. Narrow screens still need readable labels and touch targets. |
| Retain a light report preview. | Render the report itself with the dark workspace palette. | The preview represents the document the engineer will print or hand over. |

## Verification

The production build, TypeScript check and active-app lint passed. All 367 tests passed, including six new data-entry tests covering clipboard formats, column offsets, invalid survey rows, draft/revert behaviour, atomic flow paste and synchronisation after external field updates.

A browser sweep checked the nine core screens at 1440 px and 390 px. No page overflow remained. Result tables scroll within their own containers. The sweep also exercised survey paste, station-order validation, keyboard movement, blank-row handling and revert. Screenshots are under `output/playwright/sweep-*` and `output/playwright/ui-survey-desktop.png`.

The initial sweep found offscreen accessible labels escaping a results table's scroll container. Giving that container its own positioning context corrected the page overflow. The report preview and shared form styling were checked visually at both sizes.

A separate browser session imported a survey CSV, applied it and recovered the same coordinates after reload. It then pasted flow and tailwater values over a previously edited number field, rejected an invalid paste without changing the inputs, ran the assessment and recovered the saved flow after reload.

The final browser pass checked Tab and Shift+Tab across survey rows, pasting over an empty numeric draft, the project library, and the 3D/report screens at both widths. Shared checkbox sizing and hydraulic-chart contrast were corrected. The application reported no console errors in that session. These checks cover the UI; they do not establish the behaviour of external AI generation or the numerical validity of the 3D view.
