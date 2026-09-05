# Breakfast Creek Road Bridge source review

Reviewed 5 September 2026. Use Brisbane City Council's May 2024 study for this demo. The older 2014 study gives materially different geometry and flows. Do not combine the two studies into an apparently current model.

## Source

[Breakfast Creek Flood Study, May 2024, volume 1](https://data.brisbane.qld.gov.au/api/datasets/1.0/flood-study-breakfast-creek/attachments/flm_report_breakfast_creek_flood_study_2024_volume_1_of_2_pdf), published by Brisbane City Council, document control CA23/781388. The 591-page PDF was downloaded and the bridge sheets checked visually. All page numbers below count PDF pages from 1.

The [Council dataset](https://data.brisbane.qld.gov.au/explore/dataset/flood-study-breakfast-creek/information/) provides the reports and flood output grids. The dataset metadata lists CC BY 4.0 and attribution to Brisbane City Council. Retain that attribution for derived data, and check separately identified third-party material before reusing images.

## Bridge geometry

The hydraulic structure reference sheet on PDF page 356 identifies the 1958 road bridge as asset B0310, model structure S2. It is distinct from the neighbouring Breakfast Creek Green Bridge, S1.

| Field | Published 2024 value | Treatment in the demo |
| --- | --- | --- |
| Reference position | GDA94 E 504507, N 6964659 | Published asset location |
| Along-creek position | AMTD 195 m | Published location |
| Span arrangement | 18.7 m + 23.5 m + 18.7 m = 60.9 m | Published span lengths; derived pier positions require an adopted station origin |
| Piers in waterway | Two | Published count |
| Pier width | About 1 to 1.2 m, varies | The demo uses the midpoint, 1.1 m, as a constant estimated width |
| Bridge invert | -3.6 m AHD | Published minimum, not a surveyed cross-section |
| Length in flow direction | 25.0 m | Published length |
| Minimum soffit | 4.24 m AHD, varies | A constant 4.24 m is a conservative screening profile |
| Lowest road overtopping | About 5.25 m AHD, southern approach | Screening limit only; this is not a physical bridge deck plane |
| Average handrail height | 1.05 m | Published context, outside the free-surface calculation |

The sheet cites the 1997 hydraulic structure survey and design drawings. It does not supply a complete station/elevation survey or an independent physical deck elevation. The minimum soffit is the relevant limit for this demo's free-surface calculations.

## Crossing-specific flow inputs

PDF page 358 gives the following S2 structure results. Its notes locate the water levels at centre-span. PDF page 349 says these reference sheets describe current catchment and climate conditions. Avoid mixing them with the future-climate profiles elsewhere in the report.

| AEP | Discharge at structure, m³/s | Downstream peak level, m AHD | Upstream peak level, m AHD | Published difference, m |
| --- | ---: | ---: | ---: | ---: |
| 50% | 92 | 1.55 | 1.56 | 0.00 |
| 20% | 165 | 1.56 | 1.57 | 0.01 |
| 10% | 212 | 1.66 | 1.67 | 0.01 |
| 5% | 276 | 1.77 | 1.79 | 0.02 |
| 2% | 338 | 2.08 | 2.11 | 0.03 |
| 1% | 397 | 2.40 | 2.43 | 0.03 |

The 50% row's rounded levels differ by 0.01 m, while its published difference rounds to 0.00 m. Preserve the source values rather than silently correcting them.

Use the 10%, 5% and 1% rows as source-based teaching cases. Each row summarises model results for an event. The table does not establish that discharge and water-level peaks occur at the same instant. Adopting these as steady inputs is a demo assumption. The published upstream levels can be displayed as study context; they do not validate v2's upstream approach section. The reported difference across the structure is also different from v2's comparison against a separate natural-channel run.

For an unsupported high-water example, the 0.05% row gives 821 m³/s total discharge, 206 m³/s at the structure and a downstream peak level of 5.86 m AHD. The sheet says a 2D structure discharge can include flow over the road. Do not use 821 m³/s as an under-bridge flow or claim a free-surface result for this event.

## What the demo still assumes

The channel shape between the published invert and banks, upstream and downstream sections, reach lengths outside the 25 m structure, uniform Manning's n and loss coefficients remain assumptions. Table 5.1 on PDF pages 94 and 95 lists spatial land-use roughness categories, but does not establish one uniform channel n for this particular transect. Do not label a selected n of 0.03 as a calibrated Council value.

Table 5.6 on PDF page 115 provides HEC-RAS and TUFLOW head-loss comparisons for S2 at flows from 100 to 800 m³/s. It omits the corresponding downstream boundary levels and full geometry, so it cannot independently validate this reconstruction.

## Why the public grids were not used as survey sections

The dataset's [height grid archive](https://data.brisbane.qld.gov.au/api/datasets/1.0/flood-study-breakfast-creek/attachments/1_breakfastcreek_height_19012026_zip) and [depth grid archive](https://data.brisbane.qld.gov.au/api/datasets/1.0/flood-study-breakfast-creek/attachments/2_breakfastcreek_depth_19012026_zip) contain ASCII grids at 2.5 m spacing. Their file names include `AEPCC`, even though the archive names alone do not establish the climate scenario. These grids were inspected only for terrain recovery.

Subtracting depth from water-surface elevation at identical map coordinates recovers a plausible model ground surface. Matching the 1% and 0.05% event derivatives over 11,396 shared cells gave differences no larger than 0.001 m. The two archives have different row and column counts, so alignment used cell coordinates rather than array indices.

That numerical agreement is not enough to adopt hydraulic sections. Candidate transects near the asset coordinate encountered a second strip of low elevations beyond an apparent northern bank. Its relationship to the physical bank, model terrain modifications and the chosen section alignment remains unresolved. The report also documents bathymetry from 2013, 2019, 2020 and 2022, with different bed levels. A derived minimum is not interchangeable with the reference sheet's -3.6 m invert.

The demo therefore uses a declared structure-constrained channel reconstruction. It does not present the trial grid transects as surveyed or verified. The downloaded grids, extraction script and trial profiles remain research output for a later check against the original terrain model and mapped structure geometry.

## Comparison with the older study

The 2014 study's structure sheet used a 61 m span total, -2.81 m invert, 4.46 m centre soffit, 24.37 m flow length and 5.65 m road overtopping level. Its ten-year event used 315.8 m³/s and 1.10 m AHD downstream. The 2024 report changes these values and adds more recent bathymetry and flood modelling. The demo uses the 2024 reference sheet consistently; the older values are retained here only to explain the decision.
