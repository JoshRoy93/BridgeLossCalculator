export const ENGINE_VERSION = "2.0.0";
export const SECTION_NAMES = [
  "Downstream exit",
  "Downstream opening",
  "Upstream opening",
  "Upstream approach",
] as const;
export interface Point {
  station: number;
  elevation: number;
}
export interface Section {
  name: string;
  points: Point[];
  n: number;
  source: string;
}
export interface Bridge {
  left: number;
  right: number;
  soffit: number;
  deck: number;
  piers: { station: number; width: number }[];
  blockage: number;
  expansionLength: number;
  deckLength: number;
  contractionLength: number;
  contraction: number;
  expansion: number;
}
export interface Flow {
  id: string;
  name: string;
  discharge: number;
  tailwater: number;
  source: string;
  reference: number | null;
}
export interface Inputs {
  sections: Section[];
  bridge: Bridge;
  flows: Flow[];
}
export interface Criteria {
  freeboard: number;
  afflux: number;
  comparison: number;
  source: string;
}
export interface Evidence {
  survey: string;
  boundary: string;
  model: string;
  reviewer: string;
  notes: string;
}
export interface Properties {
  area: number;
  perimeter: number;
  topWidth: number;
  conveyance: number;
  velocity: number;
  froude: number;
  energy: number;
}
export interface Step extends Properties {
  section: number;
  wsel: number;
  friction: number;
  transition: number;
  residual: number;
  iterations: number;
}
export interface FlowResult {
  flowId: string;
  name: string;
  discharge: number;
  status: "ok" | "unsupported";
  reason: string;
  bridge: Step[];
  natural: Step[];
  afflux: number | null;
  freeboard: number | null;
}
export interface Run {
  id: string;
  date: string;
  engine: string;
  inputKey: string;
  inputs: Inputs;
  results: FlowResult[];
}
export interface Scenario {
  id: string;
  name: string;
  note: string;
  run: Run;
}
export interface Project {
  id: string;
  name: string;
  reference: string;
  location: string;
  datum: string;
  author: string;
  purpose: string;
  updated: string;
  inputs: Inputs;
  criteria: Criteria;
  evidence: Evidence;
  run: Run | null;
  scenarios: Scenario[];
  review: { date: string; key: string } | null;
}
export interface Workspace {
  format: "blc-workspace";
  version: 2;
  projects: Project[];
  activeId: string;
}
export const uid = () => crypto.randomUUID();
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    );
  return value;
}
export const inputKey = (inputs: Inputs) => JSON.stringify(canonical(inputs));
export const reviewKey = (p: Project) =>
  JSON.stringify(
    canonical([
      ENGINE_VERSION,
      p.inputs,
      p.criteria,
      p.evidence,
      p.name,
      p.reference,
      p.location,
      p.datum,
      p.author,
      p.purpose,
      p.run?.id,
    ]),
  );
export const currentRun = (p: Project) =>
  p.run?.engine === ENGINE_VERSION && p.run.inputKey === inputKey(p.inputs)
    ? p.run
    : null;
export const currentReview = (p: Project) =>
  Boolean(currentRun(p) && p.review?.key === reviewKey(p));
export function createProject(example = false): Project {
  const points = [
    { station: 0, elevation: 106 },
    { station: 8, elevation: 104 },
    { station: 14, elevation: 100 },
    { station: 30, elevation: 100 },
    { station: 36, elevation: 104 },
    { station: 44, elevation: 106 },
  ];
  return {
    id: uid(),
    name: example ? "Cedar Creek crossing" : "Untitled assessment",
    reference: example ? "BLC-DEMO-001" : "",
    location: example ? "Illustrative site, Queensland" : "",
    datum: example ? "Local datum, illustrative" : "",
    author: "",
    purpose: example
      ? "Compare the existing crossing with changes to blockage and opening width. All survey and flow data in this example are synthetic."
      : "",
    updated: new Date().toISOString(),
    inputs: {
      sections: SECTION_NAMES.map((name, i) => ({
        name,
        points: points.map((p) => ({
          ...p,
          elevation: p.elevation + [0, 0.04, 0.05, 0.09][i],
        })),
        n: 0.035,
        source: example
          ? "Synthetic demonstration survey. Replace for a real assessment."
          : "",
      })),
      bridge: {
        left: 11,
        right: 33,
        soffit: 104.5,
        deck: 105.3,
        piers: [{ station: 22, width: 0.7 }],
        blockage: 0,
        expansionLength: 40,
        deckLength: 10,
        contractionLength: 40,
        contraction: 0.3,
        expansion: 0.5,
      },
      flows: example
        ? [
            {
              id: uid(),
              name: "10% AEP",
              discharge: 35,
              tailwater: 102,
              source: "Synthetic boundary for demonstration",
              reference: null,
            },
            {
              id: uid(),
              name: "2% AEP",
              discharge: 60,
              tailwater: 102.7,
              source: "Synthetic boundary for demonstration",
              reference: null,
            },
            {
              id: uid(),
              name: "1% AEP",
              discharge: 80,
              tailwater: 103.2,
              source: "Synthetic boundary for demonstration",
              reference: null,
            },
          ]
        : [],
    },
    criteria: { freeboard: 0.3, afflux: 0.3, comparison: 0.1, source: "" },
    evidence: { survey: "", boundary: "", model: "", reviewer: "", notes: "" },
    run: null,
    scenarios: [],
    review: null,
  };
}
