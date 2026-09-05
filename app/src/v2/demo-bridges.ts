import {
  createProject,
  inputKey,
  SECTION_NAMES,
  uid,
  type DemoBasis,
  type DemoSource,
  type DemoValue,
  type Inputs,
  type Project,
} from "./model";

export interface DemoBridge {
  id: string;
  name: string;
  location: string;
  era: string;
  summary: string;
  highlight: string;
  sources: DemoSource[];
  values: DemoValue[];
  limitations: string[];
  inputs: Inputs;
}
const windsorUrl =
  "https://www.transport.nsw.gov.au/sites/default/files/media/documents/rww/projects/01documents/windsor-bridge-replacement/windsor-bridge-hydrological-mitigation-report-nov-2017.pdf";
const breakfastUrl =
  "https://data.brisbane.qld.gov.au/api/datasets/1.0/flood-study-breakfast-creek/attachments/flm_report_breakfast_creek_flood_study_2024_volume_1_of_2_pdf";
const note = (
  field: string,
  value: string,
  kind: DemoValue["kind"],
  explanation: string,
  sourceIds: string[] = [],
): DemoValue => ({ field, value, kind, note: explanation, sourceIds });
const sections = (
  coordinates: [number, number][],
  n: number,
  source: string,
): Inputs["sections"] =>
  SECTION_NAMES.map((name) => ({
    name,
    n,
    source,
    points: coordinates.map(([station, elevation]) => ({ station, elevation })),
  }));

const windsor: DemoBridge = {
  id: "windsor-design",
  name: "Windsor Bridge",
  location: "Hawkesbury River · Greater Sydney, NSW",
  era: "2013 replacement design, published in 2017",
  summary:
    "A reconstruction of the published replacement design, using labelled bed elevations and pier locations. Two rising-limb flow cases are estimated from the report's hydrograph.",
  highlight: "157.6 m deck · four river piers",
  sources: [
    {
      id: "W1",
      title:
        "Transport for NSW · Windsor Bridge Hydrological Mitigation Report",
      url: windsorUrl,
      date: "November 2017; drawing dated 25 July 2013",
      pages: "PDF 48, 51, 61 and 74; drawing DS2012/000155 sheet 3",
    },
  ],
  values: [
    note(
      "Bridge length across the river",
      "157.600 m",
      "published",
      "Overall deck length from the general arrangement drawing. Used as the abutment-to-abutment opening extent.",
      ["W1"],
    ),
    note(
      "Pier stations",
      "31.820, 63.140, 94.460, 125.780 m",
      "derived",
      "Drawing control-line chainages minus abutment A chainage 213.220 m.",
      ["W1"],
    ),
    note(
      "Pier width",
      "4 × 1.85 m",
      "published",
      "Oval pier dimension perpendicular to flow. This model uses constant-width obstructions and omits the 2.4 m pile caps.",
      ["W1"],
    ),
    note(
      "Ground at abutments and piers",
      "7.7, −1.6, −3.0, −3.3, −3.8, 7.9 m AHD",
      "published",
      "Existing surface levels at the six control-line stations in the drawing. Straight segments connect them.",
      ["W1"],
    ),
    note(
      "Soffit limit",
      "7.30 m AHD",
      "derived",
      "Lowest published soffit, applied uniformly. The actual design soffit rises to about 9.3 m AHD; the demo does not reproduce that slope.",
      ["W1"],
    ),
    note(
      "Deck limit",
      "9.960 m AHD",
      "derived",
      "Minimum labelled deck elevation, applied uniformly. The drawing deck rises to 12.002 m AHD.",
      ["W1"],
    ),
    note(
      "Bridge length in flow direction",
      "15.24 m",
      "published",
      "Published deck width used for a perpendicular hydraulic section.",
      ["W1"],
    ),
    note(
      "Early rising limb",
      "≈275 m³/s; ≈1.4 m AHD",
      "estimated",
      "Graphical readings at about 30 h on Figure 5-1. Existing-case upstream stage is adopted as an approximate local downstream boundary. Not a peak or an observed event.",
      ["W1"],
    ),
    note(
      "Later rising limb",
      "≈600 m³/s; ≈3.4 m AHD",
      "estimated",
      "Graphical readings at about 40 h on Figure 5-1, with the same boundary-location assumption. Not an independent validation result.",
      ["W1"],
    ),
    note(
      "Manning roughness",
      "n = 0.030",
      "assumed",
      "Uniform choice at the top of the published river-channel range 0.025–0.030.",
      ["W1"],
    ),
    note(
      "Reach and loss assumptions",
      "50 m each side; Kc 0.3; Ke 0.5; blockage 0%",
      "assumed",
      "Four copies of the reconstructed section. Reach lengths and zero blockage are demo assumptions; loss coefficients are carried over from the report's existing-bridge estimate.",
      ["W1"],
    ),
    note(
      "Outer survey limits",
      "25 m beyond each abutment, at 12 m AHD",
      "assumed",
      "Artificial closure points for the low-flow demonstration. They are not surveyed floodplain levels.",
    ),
  ],
  limitations: [
    "This is the published 2013 design marked not for construction, not an as-built survey of the bridge opened in 2020.",
    "The graded deck/soffit, oval piers, pile caps, floodplain bypass and unsteady flood routing are simplified or omitted.",
    "Only two approximate rising-limb conditions are loaded. Published flood peaks submerge this bridge and require an external model.",
    "Four independent surveyed sections were not available. Project criteria and engineering review remain unset.",
  ],
  inputs: {
    sections: sections(
      [
        [-25, 12],
        [0, 7.7],
        [31.82, -1.6],
        [63.14, -3],
        [94.46, -3.3],
        [125.78, -3.8],
        [157.6, 7.9],
        [182.6, 12],
      ],
      0.03,
      `Published design reconstruction, not as-built. Six labelled control-line bed elevations from drawing DS2012/000155 sheet 3, PDF p74; straight interpolation and two assumed outer closure points. Repeated at four sections; uniform n0.03. ${windsorUrl}`,
    ),
    bridge: {
      left: 0,
      right: 157.6,
      soffit: 7.3,
      deck: 9.96,
      piers: [31.82, 63.14, 94.46, 125.78].map((station) => ({
        station,
        width: 1.85,
      })),
      blockage: 0,
      expansionLength: 50,
      deckLength: 15.24,
      contractionLength: 50,
      contraction: 0.3,
      expansion: 0.5,
    },
    flows: [
      {
        id: "windsor-early",
        name: "Early rising limb · estimated",
        discharge: 275,
        tailwater: 1.4,
        reference: null,
        source: `Graph estimate at ~30 h, Figure 5-1 PDF p61: Q~275 m3/s and existing-case upstream stage~1.4 m AHD. Stage is adopted as an approximate local downstream boundary. Not a peak, observed event or calibration target. ${windsorUrl}`,
      },
      {
        id: "windsor-later",
        name: "Later rising limb · estimated",
        discharge: 600,
        tailwater: 3.4,
        reference: null,
        source: `Graph estimate at ~40 h, Figure 5-1 PDF p61: Q~600 m3/s and existing-case upstream stage~3.4 m AHD. Stage is adopted as an approximate local downstream boundary. Not a peak, observed event or calibration target. ${windsorUrl}`,
      },
    ],
  },
};

const breakfast: DemoBridge = {
  id: "breakfast-creek-road",
  name: "Breakfast Creek Road Bridge",
  location: "Newstead · Brisbane, QLD",
  era: "1958 road bridge · Council's 2024 flood study",
  summary:
    "The three-span road bridge at the mouth of Breakfast Creek. Published structure dimensions and four local flow cases anchor an editable channel reconstruction.",
  highlight: "60.9 m opening · 4.24 m AHD minimum soffit",
  sources: [
    {
      id: "B1",
      title:
        "Brisbane City Council · Breakfast Creek Flood Study 2024, Volume 1",
      url: breakfastUrl,
      date: "2024",
      pages: "PDF 349, 356 and 358; Appendix P, bridge S2 / asset B0310",
    },
  ],
  values: [
    note(
      "Span lengths",
      "18.7 + 23.5 + 18.7 = 60.9 m",
      "published",
      "Three spans in the structure sheet. Span boundaries set the simplified pier stations.",
      ["B1"],
    ),
    note(
      "Piers",
      "2 × 1.1 m; stations 18.7 and 42.2 m",
      "estimated",
      "The sheet gives an approximate 1–1.2 m width range; the model uses its midpoint. Stations sum the listed spans; end/centreline conventions are not supplied.",
      ["B1"],
    ),
    note(
      "Bridge invert",
      "−3.60 m AHD",
      "published",
      "Published structure invert, used as the reconstructed channel's minimum bed elevation.",
      ["B1"],
    ),
    note(
      "Soffit limit",
      "4.24 m AHD",
      "derived",
      "Minimum of the variable soffit, applied uniformly as a free-surface screening limit.",
      ["B1"],
    ),
    note(
      "Overtopping limit",
      "≈5.25 m AHD",
      "derived",
      "Lowest road level at the southern approach. Used in the model's deck-limit field; it is not a measured horizontal bridge deck plane. Approach bypass is not modelled.",
      ["B1"],
    ),
    note(
      "Bridge length in flow direction",
      "25 m",
      "published",
      "Structure length in the direction of flow.",
      ["B1"],
    ),
    note(
      "10% AEP study case",
      "212 m³/s; DS 1.66 m AHD",
      "published",
      "Structure-specific current-catchment/current-climate model table. Published US1.67 m AHD is context, not an equivalent four-section validation target.",
      ["B1"],
    ),
    note(
      "5% AEP study case",
      "276 m³/s; DS 1.77 m AHD",
      "published",
      "Same table; published US1.79 m AHD.",
      ["B1"],
    ),
    note(
      "2% AEP study case",
      "338 m³/s; DS 2.08 m AHD",
      "published",
      "Same table; published US2.11 m AHD.",
      ["B1"],
    ),
    note(
      "1% AEP study case",
      "397 m³/s; DS 2.40 m AHD",
      "published",
      "Same table; published US2.43 m AHD. These are event-summary values, not a verified simultaneous hydrograph sample.",
      ["B1"],
    ),
    note(
      "Cross-section shape",
      "Flat bed between stations 12 and 48.9 m",
      "assumed",
      "The published invert and total width constrain an illustrative trapezoid. Intermediate points, bank levels and the four repeated sections are not survey data.",
    ),
    note(
      "Reach and resistance",
      "35 m each side; n0.030; Kc0.3; Ke0.5; blockage0%",
      "assumed",
      "Uniform roughness, reach lengths, coefficients and zero blockage are demonstration assumptions, not a calibration.",
    ),
  ],
  limitations: [
    "This is the 1958 road bridge, not the Yowoggera pedestrian bridge. The study's complete catchment and adjacent structures are not reproduced.",
    "The invert and bridge dimensions are sourced. The channel shape, bank levels and four repeated sections are assumed.",
    "The 5.25 m AHD limit represents the lowest southern approach, not the physical deck surface. Variable soffit/deck profiles and lateral bypass are not modelled.",
    "Study levels are near the structure at centre-span. The downstream value is adopted at the simplified exit section; upstream values are context, not external-model checks at an equivalent location.",
    "Appendix P describes current catchment and climate conditions for its study era. These cases are not a live flood forecast or the study's future-climate scenarios.",
    "Project criteria and engineering review remain unset.",
  ],
  inputs: {
    sections: sections(
      [
        [-12, 7],
        [0, 5.25],
        [6, 0],
        [12, -3.6],
        [30.45, -3.6],
        [48.9, -3.6],
        [54.9, 0],
        [60.9, 5.25],
        [72.9, 7],
      ],
      0.03,
      `Illustrative trapezoid anchored to published -3.6 m AHD invert and 60.9 m structure width, S2/B0310. Intermediate points, banks, repeated sections and n0.03 are assumptions. BCC2024 Volume1 PDF356. ${breakfastUrl}`,
    ),
    bridge: {
      left: 0,
      right: 60.9,
      soffit: 4.24,
      deck: 5.25,
      piers: [
        { station: 18.7, width: 1.1 },
        { station: 42.2, width: 1.1 },
      ],
      blockage: 0,
      expansionLength: 35,
      deckLength: 25,
      contractionLength: 35,
      contraction: 0.3,
      expansion: 0.5,
    },
    flows: [
      {
        id: "breakfast-10",
        name: "10% AEP · 2024 study",
        discharge: 212,
        tailwater: 1.66,
        reference: null,
        source: `BCC2024 Volume1 PDF358, S2/B0310: Q212 m3/s, DS1.66, US1.67 m AHD. Appendix P current catchment/climate conditions; event-summary pair. DS adopted at simplified exit section; US not an equivalent approach-section reference. ${breakfastUrl}`,
      },
      {
        id: "breakfast-5",
        name: "5% AEP · 2024 study",
        discharge: 276,
        tailwater: 1.77,
        reference: null,
        source: `BCC2024 Volume1 PDF358: Q276 m3/s, DS1.77, US1.79 m AHD. Current catchment/climate event summary. Boundary-location assumption as above. ${breakfastUrl}`,
      },
      {
        id: "breakfast-2",
        name: "2% AEP · 2024 study",
        discharge: 338,
        tailwater: 2.08,
        reference: null,
        source: `BCC2024 Volume1 PDF358: Q338 m3/s, DS2.08, US2.11 m AHD. Current catchment/climate event summary. Boundary-location assumption as above. ${breakfastUrl}`,
      },
      {
        id: "breakfast-1",
        name: "1% AEP · 2024 study",
        discharge: 397,
        tailwater: 2.4,
        reference: null,
        source: `BCC2024 Volume1 PDF358: Q397 m3/s, DS2.40, US2.43 m AHD. Current catchment/climate event summary, not a current forecast or future-climate scenario. Boundary-location assumption as above. ${breakfastUrl}`,
      },
    ],
  },
};

export const DEMO_BRIDGES: readonly DemoBridge[] = [breakfast, windsor];
export function demoBasis(demo: DemoBridge, inputs = demo.inputs): DemoBasis {
  return structuredClone({
    id: demo.id,
    revision: "2026-09-05.1",
    title: demo.name,
    era: demo.era,
    summary: demo.summary,
    inputKey: inputKey(inputs),
    sources: demo.sources,
    values: demo.values,
    limitations: demo.limitations,
  });
}
export function createDemoProject(id: string): Project {
  const demo = DEMO_BRIDGES.find((d) => d.id === id);
  if (!demo) throw new Error("Unknown example bridge.");
  const inputs = structuredClone(demo.inputs);
  inputs.flows.forEach((flow) => {
    flow.id = uid();
  });
  const p: Project = {
    ...createProject(),
    name: demo.name,
    reference: `DEMO-${demo.id.toUpperCase()}`,
    location: demo.location,
    datum: "Australian Height Datum · m AHD",
    purpose: `${demo.summary} Source era: ${demo.era}. Published values and assumptions are recorded in the demo source basis.`,
    inputs,
    demoBasis: demoBasis(demo, inputs),
  };
  p.evidence.survey =
    "Demo reconstruction. Read the source basis for published geometry and assumed section points. No site survey has been checked by the current user.";
  p.evidence.boundary =
    "Demo source cases only. Boundary locations and event limitations are recorded against each flow.";
  p.evidence.model = demo.limitations.join("\n");
  return p;
}
