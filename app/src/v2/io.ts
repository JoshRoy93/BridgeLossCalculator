import { calculate } from "./hydraulics";
import {
  createProject,
  ENGINE_VERSION,
  uid,
  type Inputs,
  type DemoBasis,
  type Project,
  type Run,
  type Workspace,
} from "./model";

function object(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${name} must be an object.`);
  return value as Record<string, unknown>;
}
function string(value: unknown, name: string, limit = 20000): string {
  if (typeof value !== "string" || value.length > limit)
    throw new Error(
      `${name} must be text under ${limit.toLocaleString()} characters.`,
    );
  return value;
}
function number(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error(`${name} must be a finite number.`);
  return value;
}
function array(value: unknown, name: string, limit: number): unknown[] {
  if (!Array.isArray(value) || value.length > limit)
    throw new Error(`${name} must be a list of at most ${limit} items.`);
  return value;
}
export function parseInputs(value: unknown): Inputs {
  const raw = object(value, "Inputs"),
    b = object(raw.bridge, "Bridge");
  const n = (key: string) => number(b[key], `Bridge ${key}`);
  const sections = array(raw.sections, "Sections", 4).map((item, i) => {
    const s = object(item, `Section ${i + 1}`);
    return {
      name: string(s.name, "Section name"),
      n: number(s.n, "Roughness"),
      source: string(s.source, "Survey source"),
      points: array(s.points, "Survey points", 2000).map((item) => {
        const p = object(item, "Point");
        return {
          station: number(p.station, "Station"),
          elevation: number(p.elevation, "Elevation"),
        };
      }),
    };
  });
  if (sections.length !== 4 || sections.some((s) => s.points.length < 3))
    throw new Error(
      "Four sections with at least three points each are required.",
    );
  return {
    sections,
    bridge: {
      left: n("left"),
      right: n("right"),
      soffit: n("soffit"),
      deck: n("deck"),
      blockage: n("blockage"),
      expansionLength: n("expansionLength"),
      deckLength: n("deckLength"),
      contractionLength: n("contractionLength"),
      contraction: n("contraction"),
      expansion: n("expansion"),
      piers: array(b.piers, "Piers", 50).map((item) => {
        const p = object(item, "Pier");
        return {
          station: number(p.station, "Pier station"),
          width: number(p.width, "Pier width"),
        };
      }),
    },
    flows: array(raw.flows, "Flows", 30).map((item) => {
      const f = object(item, "Flow");
      return {
        id: string(f.id, "Event ID"),
        name: string(f.name, "Event name"),
        discharge: number(f.discharge, "Discharge"),
        tailwater: number(f.tailwater, "Tailwater"),
        source: string(f.source, "Flow source"),
        reference:
          f.reference === null
            ? null
            : number(f.reference, "Reference water level"),
      };
    }),
  };
}
function parseRun(raw: unknown): Run | null {
  if (raw === null) return null;
  const r = object(raw, "Run");
  const inputs = parseInputs(r.inputs);
  const run = calculate(inputs);
  if (r.engine !== ENGINE_VERSION) return run;
  // Numbers in a file never replace calculations. Preserve identity for local history.
  return {
    ...run,
    id: string(r.id, "Run ID"),
    date: string(r.date, "Run date"),
  };
}
function parseDemoBasis(value: unknown): DemoBasis {
  const d = object(value, "Demo source basis");
  const sources = array(d.sources, "Demo sources", 20).map((item) => {
    const s = object(item, "Demo source"),
      url = string(s.url, "Source URL", 2000);
    if (
      !/^https?:\/\//i.test(url) ||
      !["https:", "http:"].includes(new URL(url).protocol)
    )
      throw new Error("Demo source links must use HTTP or HTTPS.");
    return {
      id: string(s.id, "Source ID", 100),
      title: string(s.title, "Source title", 500),
      url,
      date: string(s.date, "Source date", 100),
      pages: string(s.pages, "Source pages", 200),
    };
  });
  const ids = new Set(sources.map((s) => s.id));
  if (ids.size !== sources.length)
    throw new Error("Demo source IDs must be unique.");
  return {
    id: string(d.id, "Demo ID", 100),
    revision: string(d.revision, "Demo revision", 100),
    title: string(d.title, "Demo title", 200),
    era: string(d.era, "Demo era", 300),
    summary: string(d.summary, "Demo summary", 4000),
    inputKey: string(d.inputKey, "Demo input basis", 2_000_000),
    sources,
    limitations: array(d.limitations, "Demo limitations", 20).map((l) =>
      string(l, "Limitation", 2000),
    ),
    values: array(d.values, "Demo input notes", 60).map((item) => {
      const v = object(item, "Demo input note");
      if (
        !["published", "derived", "estimated", "assumed"].includes(
          String(v.kind),
        )
      )
        throw new Error("Invalid demo evidence category.");
      const sourceIds = array(v.sourceIds, "Input sources", 20).map((id) =>
        string(id, "Source ID", 100),
      );
      if (sourceIds.some((id) => !ids.has(id)))
        throw new Error("Demo input cites a missing source.");
      return {
        field: string(v.field, "Input field", 300),
        value: string(v.value, "Source value", 2000),
        kind: v.kind as DemoBasis["values"][number]["kind"],
        note: string(v.note, "Input note", 4000),
        sourceIds,
      };
    }),
  };
}
function parseProject(value: unknown): Project {
  const p = object(value, "Project"),
    c = object(p.criteria, "Criteria"),
    e = object(p.evidence, "Evidence");
  const review = p.review === null ? null : object(p.review, "Review");
  return {
    id: string(p.id, "ID"),
    name: string(p.name, "Name"),
    reference: string(p.reference, "Reference"),
    location: string(p.location, "Location"),
    datum: string(p.datum, "Datum"),
    author: string(p.author, "Author"),
    purpose: string(p.purpose, "Purpose"),
    updated: string(p.updated, "Updated"),
    inputs: parseInputs(p.inputs),
    criteria: {
      freeboard: number(c.freeboard, "Freeboard"),
      afflux: number(c.afflux, "Afflux"),
      comparison: number(c.comparison, "Comparison tolerance"),
      source: string(c.source, "Criteria source"),
    },
    evidence: {
      survey: string(e.survey, "Survey evidence"),
      boundary: string(e.boundary, "Boundary evidence"),
      model: string(e.model, "Model evidence"),
      reviewer: string(e.reviewer, "Reviewer"),
      notes: string(e.notes, "Review notes"),
    },
    run: parseRun(p.run),
    ...(p.demoBasis ? { demoBasis: parseDemoBasis(p.demoBasis) } : {}),
    ...(p.sceneImage
      ? {
          sceneImage: (() => {
            const image = object(p.sceneImage, "3D image");
            const dataUrl = string(image.dataUrl, "3D image", 1_500_000);
            if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(dataUrl))
              throw new Error("3D image must be an embedded PNG.");
            return {
              dataUrl,
              key: string(image.key, "3D image basis", 2_000_000),
              caption: string(image.caption, "3D image caption", 500),
            };
          })(),
        }
      : {}),
    ...(p.aiAssessment
      ? {
          aiAssessment: (() => {
            const a = object(p.aiAssessment, "AI assessment");
            if (typeof a.edited !== "boolean")
              throw new Error("AI edited flag must be boolean.");
            return {
              text: string(a.text, "AI assessment", 20000),
              key: string(a.key, "AI basis", 2_000_000),
              date: string(a.date, "AI date"),
              model: string(a.model, "AI model", 200),
              edited: a.edited,
            };
          })(),
        }
      : {}),
    scenarios: array(p.scenarios, "Scenarios", 12).map((item) => {
      const s = object(item, "Scenario"),
        run = parseRun(s.run);
      if (!run) throw new Error("Scenario is missing a run.");
      return {
        id: string(s.id, "Scenario ID"),
        name: string(s.name, "Scenario name"),
        note: string(s.note, "Scenario note"),
        run,
      };
    }),
    review: review
      ? {
          date: string(review.date, "Review date"),
          key: string(review.key, "Review key", 2_000_000),
        }
      : null,
  };
}
export function exportProject(project: Project): string {
  return JSON.stringify(
    { format: "blc-assessment", version: 2, units: "SI", project },
    null,
    2,
  );
}
export function importProject(text: string): Project {
  if (text.length > 32_000_000)
    throw new Error("Project file exceeds the 32 MB limit.");
  const raw = object(JSON.parse(text), "Project file");
  if (
    raw.format !== "blc-assessment" ||
    raw.version !== 2 ||
    raw.units !== "SI"
  )
    throw new Error(
      "Use a BLC v2 SI assessment file. Legacy files need the explicit legacy import option.",
    );
  const project = parseProject(raw.project);
  return {
    ...project,
    id: uid(),
    review: null,
    updated: new Date().toISOString(),
  };
}
export function parseWorkspace(text: string): Workspace {
  if (text.length > 20_000_000)
    throw new Error("Workspace exceeds the 20 MB limit.");
  const raw = object(JSON.parse(text), "Workspace");
  if (raw.format !== "blc-workspace" || raw.version !== 2)
    throw new Error("Unsupported workspace format.");
  const projects = array(raw.projects, "Projects", 30).map(parseProject);
  if (!projects.length) throw new Error("Workspace is empty.");
  if (new Set(projects.map((p) => p.id)).size !== projects.length)
    throw new Error("Workspace has duplicate project IDs.");
  const activeId = string(raw.activeId, "Active project");
  return {
    format: "blc-workspace",
    version: 2,
    projects,
    activeId: projects.some((p) => p.id === activeId)
      ? activeId
      : projects[0].id,
  };
}
export function parseSurvey(
  text: string,
): { station: number; elevation: number }[] {
  const rows = text
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/);
  if (rows.length > 2001) throw new Error("Survey exceeds 2,000 points.");
  const header = rows.shift()?.trim().toLowerCase().replace(/\s/g, "");
  if (header !== "station,elevation")
    throw new Error(
      "Use the header station,elevation. Both columns must be in metres.",
    );
  const points = rows.map((row, i) => {
    const parts = row.split(",").map((v) => v.trim());
    if (
      parts.length !== 2 ||
      parts.some((v) => !v || !Number.isFinite(Number(v)))
    )
      throw new Error(`CSV row ${i + 2}: enter exactly two numeric values.`);
    return { station: Number(parts[0]), elevation: Number(parts[1]) };
  });
  if (points.length < 3) throw new Error("Enter at least three survey points.");
  points.forEach((p, i) => {
    if (i && p.station <= points[i - 1].station)
      throw new Error(`CSV row ${i + 2}: stations must increase strictly.`);
  });
  return points;
}
// RFC 4180 quoting, with spreadsheet-formula protection on text fields.
export const csvCell = (value: string | number | null) => {
  let s = value === null ? "" : String(value);
  if (typeof value === "string" && /^[\s]*[=+\-@]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};
export function parseReferenceCsv(text: string, inputs: Inputs): Inputs {
  const rows = text
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/);
  if (rows.shift()?.trim().toLowerCase() !== "event,upstream_wsel_m")
    throw new Error("Use the header event,upstream_wsel_m.");
  if (!rows.length) throw new Error("No comparison rows found.");
  const next = structuredClone(inputs),
    seen = new Set<string>();
  rows.forEach((row, i) => {
    const match = row.match(/^(?:"((?:[^"]|"")*)"|([^,]*)),\s*([^,]+)\s*$/);
    if (!match)
      throw new Error(
        `Comparison row ${i + 2}: expected event and water level.`,
      );
    const name = (match[1]?.replace(/""/g, '"') ?? match[2]).trim();
    const flow = next.flows.find((f) => f.name === name);
    if (!flow || seen.has(name))
      throw new Error(
        `Comparison row ${i + 2}: unknown or repeated event "${name}".`,
      );
    if (!match[3].trim() || !Number.isFinite(Number(match[3])))
      throw new Error(`Comparison row ${i + 2}: invalid water level.`);
    flow.reference = Number(match[3]);
    seen.add(name);
  });
  return next;
}

export function importLegacy(text: string): Project {
  const raw = object(JSON.parse(text), "Legacy project");
  if (raw.format || ![1, 2].includes(raw.version as number))
    throw new Error("Expected a legacy BLC v1 or v2 JSON export.");
  // V1 exported engine inputs in feet and cfs even when its display was metric.
  const b = object(raw.bridgeGeometry, "Legacy bridge"),
    c = object(raw.coefficients, "Legacy coefficients");
  if (number(b.skewAngle ?? 0, "Skew angle") !== 0)
    throw new Error(
      "This legacy bridge is skewed. V2 requires a straight crossing; use an external model for this geometry.",
    );
  const chord = number(b.lowChordLeft, "Left low chord");
  if (
    number(b.lowChordRight, "Right low chord") !== chord ||
    array(b.lowChordProfile ?? [], "Low chord profile", 2000).some(
      (item) =>
        number(
          object(item, "Low chord point").elevation,
          "Low chord elevation",
        ) !== chord,
    )
  )
    throw new Error(
      "This legacy bridge has a sloping or shaped soffit. V2 requires a horizontal soffit.",
    );
  const legacyFlows = array(raw.flowProfiles, "Legacy flows", 30);
  const firstFlow = legacyFlows.length
    ? object(legacyFlows[0], "First flow")
    : {};
  const p = createProject();
  const points = array(raw.crossSection, "Legacy survey", 2000).map((item) => {
    const point = object(item, "Legacy point");
    return {
      station: number(point.station, "Station") * 0.3048,
      elevation: number(point.elevation, "Elevation") * 0.3048,
      n: number(point.manningsN, "Manning roughness"),
    };
  });
  if (points.length < 3)
    throw new Error("Legacy survey needs at least three points.");
  p.name = "Imported legacy assessment";
  p.purpose =
    "Legacy import converted from internal feet and cfs. One section was copied to all four positions. Confirm reach geometry, uniform roughness, datum, bridge and boundaries before review.";
  p.inputs.sections = p.inputs.sections.map((s) => ({
    ...s,
    points: points.map(({ station, elevation }) => ({ station, elevation })),
    n: points[0].n,
    source:
      "Legacy import. Repeated section; first-point roughness adopted. Requires confirmation.",
  }));
  const n = (key: string) => number(b[key], `Legacy ${key}`);
  p.inputs.bridge = {
    left: n("leftAbutmentStation") * 0.3048,
    right: n("rightAbutmentStation") * 0.3048,
    soffit: Math.min(n("lowChordLeft"), n("lowChordRight")) * 0.3048,
    deck: n("highChord") * 0.3048,
    piers: array(b.piers, "Legacy piers", 50).map((item) => {
      const pier = object(item, "Pier");
      return {
        station: number(pier.station, "Station") * 0.3048,
        width: number(pier.width, "Width") * 0.3048,
      };
    }),
    blockage: number(c.debrisBlockagePct ?? 0, "Blockage"),
    expansionLength:
      number(
        b.expansionLength ?? firstFlow.expansionLength ?? 0,
        "Expansion length",
      ) * 0.3048,
    contractionLength:
      number(
        b.contractionLength ?? firstFlow.contractionLength ?? 0,
        "Contraction length",
      ) * 0.3048,
    deckLength: number(b.deckWidth ?? 0, "Deck length") * 0.3048,
    contraction: number(c.contractionCoeff, "Contraction"),
    expansion: number(c.expansionCoeff, "Expansion"),
  };
  p.inputs.flows = legacyFlows.map((item) => {
    const f = object(item, "Legacy flow");
    return {
      id: uid(),
      name: string(f.name, "Name"),
      discharge: number(f.discharge, "Discharge") * 0.028316846592,
      tailwater: number(f.dsWsel, "Tailwater") * 0.3048,
      source:
        "Legacy import. Confirm event definition and downstream boundary.",
      reference: null,
    };
  });
  p.inputs = parseInputs(p.inputs);
  return p;
}
