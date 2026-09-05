# Using v2

1. Open Projects and create an assessment, import a v2 JSON file, or load the worked example. The example's survey and boundary data are synthetic.
2. Enter project reference, location, preparer, vertical datum and assessment purpose.
3. Open Survey sections. Type station and elevation into the coordinate table, paste CSV or spreadsheet cells, or import a CSV file. Values are in metres. Fix highlighted cells, apply the coordinates, then check the drawing and record roughness and survey source. Unapplied coordinates do not enter calculations.
4. Define abutments, soffit, deck, piers, reach lengths and loss coefficients. Check that pier widths fit within the opening and do not overlap.
5. Add named flow events in the table. Each needs discharge, downstream water level and a source. You can paste a block of cells starting at the selected field. The rainfall helper requires entered intensity and source; it does not download or invent rainfall data.
6. Run the assessment. Inspect event results and section energy balances. Resolve validation errors. Unsupported events require another modelling approach.
7. Save the existing case under Alternatives. Change an assumption, run again and inspect the change. Delta values are withheld when event discharge or tailwater differs. Restore a saved alternative to inspect its inputs.
8. Enter external approach water levels directly in Results & checks or import `event,upstream_wsel_m` CSV from Flow events. Match event names, datum and section location. Record the external model version and check in the review evidence.
9. Set project freeboard, afflux and comparison limits with their source. Complete survey, boundary, model, reviewer and conclusion fields. Record review completion when the requirements list is clear. A completed review can document an exceedance; it is not a passing design verdict.
10. Export the report and project JSON together. Print uses the browser's PDF option. The downloaded HTML is a complete report with all survey points and calculation steps. Results CSV is suitable for a calculation schedule.

## Table entry

In the survey table, Enter and the up/down arrow keys move between rows. Tab moves across cells and adds a point after the last elevation. Use the row buttons to insert or remove points. Revert restores the applied survey.

Paste two survey columns into a station cell, or one column into either field. Pasting overwrites cells from the selected row and adds rows when needed. It leaves other rows in place. Import CSV replaces the draft table. A `station,elevation` header is accepted but optional. Both comma-separated CSV and tab-separated spreadsheet data are supported. Stations must increase strictly; the app does not reorder them.

Flow table columns are event, discharge in m³/s, downstream WSEL in metres, and source. Paste starts at the selected cell and can add events. The optional header is `event,discharge_m3s,tailwater_m,source`. Invalid pastes make no changes. Manual edits and valid flow pastes save automatically. On phones, each event uses labelled fields instead of a wide table.

## Saving and recovery

"Saved locally" means the browser accepted the workspace write. It does not mean the project is backed up elsewhere. The app waits 350 ms after a change before saving and warns before leaving with unsaved work.

Download JSON before changing computers, clearing browser data or removing a project. Import creates a separate project and clears review completion. Saved run numbers are recalculated from their recorded inputs.

If storage is full or unavailable, work remains in memory and the app shows an error. Download the current project. If another tab changed the workspace, export this tab's work and reload. If saved data is corrupt, download its recovery copy before starting fresh.

## Legacy files

Use Migrate legacy JSON for old BLC exports. Check every imported assumption, especially the repeated section, adopted roughness, reach lengths and datum. V2 does not accept native HEC-RAS geometry or flow files. Export surveyed coordinates and approach results as CSV instead.

Migration rejects skewed bridges and shaped or sloping soffits because the v2 solver does not support them.
