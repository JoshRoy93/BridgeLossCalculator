# Windsor Bridge source review

Reviewed 5 September 2026. Use a reconstruction of the published replacement design for the Sydney example. Keep the design date in its name. It is not an as-built model or a calibrated assessment of the operating bridge.

## Sources and bridge era

- [Transport for NSW, Hydrological Mitigation Report, November 2017](https://www.transport.nsw.gov.au/sites/default/files/media/documents/rww/projects/01documents/windsor-bridge-replacement/windsor-bridge-hydrological-mitigation-report-nov-2017.pdf). Its Appendix B contains Jacobs' *Hydrology and Hydraulics Report*, NB98005-NHY-RP-0052 revision C, dated 2 February 2017. Page references below are PDF pages, counted from 1. The full 101-page file was downloaded and the drawing and hydrographs checked visually.
- [Transport for NSW, Windsor Bridge evaluation report](https://www.transport.nsw.gov.au/system/files/media/documents/2025/windsor-bridge-evaluation-report.pdf), page 3, confirms the replacement bridge opened on 18 May 2020. The publicly hosted design drawings predate construction.

## Published geometry

PDF page 74 is general arrangement drawing DS2012/000155, sheet 3, issue 4, dated 25 July 2013. It is marked "NOT FOR CONSTRUCTION". Its control-line table provides these numbers. Relative station subtracts the first chainage, 213.220 m.

| Location | Chainage, m | Relative station, m | Existing surface, m AHD | Design deck surface, m AHD |
| --- | ---: | ---: | ---: | ---: |
| Abutment A | 213.220 | 0.000 | 7.7 | 12.002 |
| Pier 1 | 245.040 | 31.820 | -1.6 | 11.590 |
| Pier 2 | 276.360 | 63.140 | -3.0 | 11.184 |
| Pier 3 | 307.680 | 94.460 | -3.3 | 10.778 |
| Pier 4 | 339.000 | 125.780 | -3.8 | 10.372 |
| Abutment B | 370.820 | 157.600 | 7.9 | 9.960 |

The drawing specifies five 31.320 m spans and a 157.600 m overall deck length, including end allowances. It labels mean high water springs at 0.7 m AHD and mean low water springs at -0.1 m AHD.

PDF page 48, printed page 7, section 2.3 provides:

| Input | Published value | Application to v2 |
| --- | --- | --- |
| Deck width | 15.24 m | Approximate flow-direction bridge length for a perpendicular section |
| Piers | Four oval piers, 1.85 m perpendicular to flow | Use the drawing's pier stations; retain the shape limitation |
| Pile caps | 2.4 m wide near the upper tidal limit | Constant 1.85 m piers omit the wider caps; disclose this simplification |
| Soffit | About 9.3 m AHD south and 7.3 m AHD north | A constant 7.3 m lower bound is conservative for freeboard, not the actual profile |
| Deck surface | About 12.0 m AHD south and 10.0 m AHD north | Use drawing minimum 9.960 m only as a flat screening limit |

## Flow cases

Figure 5-1 on PDF page 61, printed page 20, plots simultaneous river discharge and water level for the five-year ARI simulation under existing bridge conditions. Enlarged graphical readings give:

| Case | Simulation time | River discharge, m³/s | Water level, m AHD | Evidence status |
| --- | ---: | ---: | ---: | --- |
| Rising limb, early | About 30 h | About 275 | About 1.4 | Graph estimate |
| Rising limb, later | About 40 h | About 600 | About 3.4 | Graph estimate |

These two cases are plausible free-surface teaching inputs. They are points on a modelled hydrograph, not observed floods or annual peak discharges. Using the plotted existing-case upstream water level as a local downstream boundary for the replacement design is a separate assumption. Name that assumption in each imported flow source. Do not add these levels as independent validation results.

The five-year flood peak is outside v2's free-surface method. Table 5-1 on PDF page 60 gives 11.00 m AHD immediately upstream of the existing bridge. Table 6-1 on PDF page 67 gives 11.04 m AHD for the proposed case. Figure 5-1 peaks near 3,400 m³/s, while the accompanying text rounds this to about 3,500 m³/s. Peak discharge and peak stage occur at different times. Do not pair these peaks as a measured steady event. The deck is submerged and floodplain bypass becomes material.

## Remaining assumptions

Table 3-1 on PDF page 51 gives river Manning's n from 0.025 to 0.030. Selecting 0.030 for a uniform demo section is a modelling choice within that published range. Section 3.3.3 on the same page uses contraction and expansion coefficients of 0.3 and 0.5 for the existing bridge's HEC-RAS loss estimate. Carrying those into the replacement demo is an assumption.

The six labelled surface points do not define a complete hydraulic survey. Straight interpolation loses the bank shape visible in the drawing. Any added shape points must be identified as graphical estimates. Repeating one reconstructed section at four calculation locations, assigning approach lengths, omitting floodplain flow, using a flat soffit and representing pile caps as constant-width piers remain explicit simplifications. Neither an as-built survey nor the original model files were obtained. Do not call the demo calibrated, verified against TUFLOW, or suitable for forecasting current Windsor flood levels.
