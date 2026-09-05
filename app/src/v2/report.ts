import { verdict } from "./assessment";
import { csvCell } from "./io";
import {
  currentAssessment,
  currentReview,
  currentRun,
  inputKey,
  sceneImageKey,
  type Project,
} from "./model";
export const MODEL_LIMITS =
  "Steady subcritical free-surface screening using four surveyed sections, uniform roughness per section and velocity-head coefficient 1. Pressure flow, overtopping, critical control, scour, sediment transport, skew and lateral flow are outside this model. Blockage is a uniform open-area sensitivity assumption. Results do not certify structural safety or regulatory compliance.";
export const fmt = (value: number | null | undefined, digits = 3) =>
  value === null || value === undefined || !Number.isFinite(value)
    ? "—"
    : value.toFixed(digits);
export const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function resultCsv(p: Project): string {
  const run = currentRun(p);
  if (!run) throw new Error("Run the current inputs before exporting results.");
  const rows: (string | number | null)[][] = [
    [
      "event",
      "discharge_m3_s",
      "tailwater_m",
      "bridge_approach_wsel_m",
      "natural_approach_wsel_m",
      "afflux_m",
      "freeboard_m",
      "criterion_result",
      "reason",
      "run_id",
      "engine",
    ],
  ];
  run.results.forEach((r, i) =>
    rows.push([
      r.name,
      r.discharge,
      run.inputs.flows[i].tailwater,
      r.status === "ok" ? r.bridge[3].wsel : null,
      r.status === "ok" ? r.natural[3].wsel : null,
      r.afflux,
      r.freeboard,
      verdict(r, p),
      r.reason,
      run.id,
      run.engine,
    ]),
  );
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
export function reportHtml(p: Project): string {
  const run = currentRun(p);
  if (!run) throw new Error("Run the current inputs before creating a report.");
  const h = escapeHtml;
  const table = (headers: string[], rows: (string | number | null)[][]) =>
    `<table><thead><tr>${headers.map((t) => `<th>${h(t)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((v) => `<td>${h(v === null ? "Not available" : String(v))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const paragraphs = (pairs: [string, string][]) =>
    pairs
      .map(
        ([name, text]) =>
          `<h3>${h(name)}</h3><p>${h(text || "Not recorded")}</p>`,
      )
      .join("");
  const b = p.inputs.bridge;
  const ai = currentAssessment(p);
  const scene = p.sceneImage?.key === sceneImageKey(p) ? p.sceneImage : null;
  return `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(p.name)} | BLC assessment</title><style>body{font:14px/1.55 system-ui,sans-serif;color:#203b39;max-width:1050px;margin:40px auto;padding:0 28px}header{border-bottom:3px solid #167a72;padding-bottom:24px}h1{font-size:34px;line-height:1.2}h2{margin-top:36px;font-size:22px;border-bottom:1px solid #c7d4d0;padding-bottom:8px}h3{font-size:14px;margin-bottom:4px}p{white-space:pre-wrap;margin-top:4px}small{color:#52645f}table{border-collapse:collapse;width:100%;font-size:11px;margin:14px 0 24px}th,td{text-align:left;border-bottom:1px solid #d9e2dc;padding:8px;vertical-align:top;overflow-wrap:anywhere}th{background:#edf2ed}.notice{padding:16px;background:#f4f1e6;border-left:3px solid #a67b25}@media print{th,td{padding:6px}body{margin:0;max-width:none;font-size:10pt;padding:0}h2,h3{break-after:avoid}tr,.calculation-case,.survey-group{break-inside:avoid}.calculation-case p{break-after:avoid}thead{display:table-header-group}a{color:inherit}@page{size:A4 landscape;margin:16mm}}</style></head><body>
  <header><small>BRIDGE LOSS CALCULATOR / V2</small><h1>${h(p.name)}</h1><p>${h(p.reference)} · ${h(p.location)}</p><small>Run ${h(run.id)} · Engine ${h(run.engine)} · ${h(run.date)}</small></header>
  <h2>Assessment record</h2>${paragraphs([
    ["Purpose", p.purpose],
    ["Vertical datum", p.datum],
    ["Prepared by", p.author],
    [
      "Review status",
      currentReview(p)
        ? `Review recorded by ${p.evidence.reviewer} on ${p.review!.date}. This is a local attribution, not an authenticated signature.`
        : "Draft. Review has not been completed for this assessment.",
    ],
  ])}
  <div class="notice">${h(MODEL_LIMITS)}</div>
  ${
    p.demoBasis
      ? `<h2>Example source record: ${h(p.demoBasis.title)}</h2><p>${h(p.demoBasis.era)}. ${h(p.demoBasis.summary)}</p><p>${p.demoBasis.inputKey === inputKey(p.inputs) ? "Original example inputs." : "Inputs edited since loading. This record describes the original example and is retained as source history."} Revision ${h(p.demoBasis.revision)}.</p>${table(
          [
            "Input",
            "Original example value",
            "Basis",
            "How it is used",
            "Source",
          ],
          p.demoBasis.values.map((v) => [
            v.field,
            v.value,
            v.kind,
            v.note,
            v.sourceIds.join(", "),
          ]),
        )}<h3>Sources</h3>${p.demoBasis.sources.map((s) => `<p>[${h(s.id)}] ${/^https?:\/\//i.test(s.url) ? `<a href="${h(s.url)}">${h(s.title)}</a>` : h(s.title)}. ${h(s.date)}. ${h(s.pages)}.</p>`).join("")}<h3>Model simplifications</h3><ul>${p.demoBasis.limitations.map((l) => `<li>${h(l)}</li>`).join("")}</ul>`
      : ""
  }
  <h2>Results</h2><p>All values use SI units. Afflux is bridge approach water level minus bridge-free approach water level at the same discharge and downstream boundary.</p>
  ${table(
    [
      "Event",
      "Q m³/s",
      "Tailwater m",
      "Bridge US m",
      "Natural US m",
      "Afflux m",
      "Freeboard m",
      "Assessment",
    ],
    run.results.map((r, i) => [
      r.name,
      r.discharge,
      run.inputs.flows[i].tailwater,
      fmt(r.status === "ok" ? r.bridge[3].wsel : null),
      fmt(r.status === "ok" ? r.natural[3].wsel : null),
      fmt(r.afflux),
      fmt(r.freeboard),
      verdict(r, p),
    ]),
  )}
  ${run.results
    .filter((r) => r.reason)
    .map((r) => `<p class="notice">${h(r.name)}: ${h(r.reason)}</p>`)
    .join("")}
  ${scene ? `<h2>3D bridge view</h2><figure><img style="max-width:100%;max-height:400px" src="${h(scene.dataUrl)}" alt="3D bridge and water surface"><figcaption>${h(scene.caption)}. Interpolated visualisation of four survey sections, not a three-dimensional hydraulic simulation.</figcaption></figure>` : ""}
  <h2>Criteria and external comparison</h2>${paragraphs([["Criteria source", p.criteria.source]])}<p>Minimum freeboard ${fmt(p.criteria.freeboard)} m. Maximum afflux ${fmt(p.criteria.afflux)} m. Comparison tolerance ${fmt(p.criteria.comparison)} m.</p>
  ${table(
    [
      "Event",
      "External US m",
      "BLC minus external m",
      "Flow and boundary source",
    ],
    p.inputs.flows.map((f, i) => [
      f.name,
      fmt(f.reference),
      fmt(
        f.reference !== null && run.results[i].status === "ok"
          ? run.results[i].bridge[3].wsel - f.reference
          : null,
      ),
      f.source,
    ]),
  )}
  <h2>Bridge geometry and loss assumptions</h2>${table(
    ["Parameter", "Value", "Unit"],
    [
      ["Left abutment station", b.left, "m"],
      ["Right abutment station", b.right, "m"],
      ["Soffit elevation", b.soffit, "m"],
      ["Deck elevation", b.deck, "m"],
      ["Opening blockage", b.blockage, "%"],
      ["Expansion reach", b.expansionLength, "m"],
      ["Length through bridge", b.deckLength, "m"],
      ["Contraction reach", b.contractionLength, "m"],
      ["Contraction coefficient", b.contraction, "dimensionless"],
      ["Expansion coefficient", b.expansion, "dimensionless"],
    ],
  )}${table(
    ["Pier", "Station m", "Width m"],
    b.piers.map((pier, i) => [i + 1, pier.station, pier.width]),
  )}
  <h2>Survey sections</h2>${p.inputs.sections
    .map(
      (s, i) =>
        `<section class="survey-group"><h3>${i + 1}. ${h(s.name)}</h3><p>Manning n ${s.n}. Source: ${h(s.source || "Not recorded")}</p>${table(
          ["Station m", "Elevation m"],
          s.points.map((point) => [point.station, point.elevation]),
        )}</section>`,
    )
    .join("")}
  <h2>Calculation record</h2><p>E = WSEL + V² / 2g. Friction loss = L × [2Q / (K upstream + K downstream)]². Transition loss = C × |ΔV²| / 2g. g = 9.80665 m/s². Accepted energy residual &lt; 0.00001 m. Natural case uses no bridge obstructions or transition losses.</p>
  ${run.results
    .map(
      (r) =>
        `<h3>${h(r.name)}</h3>${(["bridge", "natural"] as const)
          .map(
            (key) =>
              `<section class="calculation-case"><p>${key === "bridge" ? "Bridge case" : "Bridge-free baseline"}</p>${table(
                [
                  "Section",
                  "WSEL m",
                  "Area m²",
                  "Perimeter m",
                  "Width m",
                  "K",
                  "V m/s",
                  "Fr",
                  "Energy m",
                  "Friction m",
                  "Transition m",
                  "Residual m",
                  "Iterations",
                ],
                r[key].map((s) => [
                  p.inputs.sections[s.section].name,
                  fmt(s.wsel, 5),
                  fmt(s.area),
                  fmt(s.perimeter),
                  fmt(s.topWidth),
                  fmt(s.conveyance),
                  fmt(s.velocity),
                  fmt(s.froude),
                  fmt(s.energy, 5),
                  fmt(s.friction, 5),
                  fmt(s.transition, 5),
                  fmt(s.residual, 8),
                  s.iterations,
                ]),
              )}</section>`,
          )
          .join("")}`,
    )
    .join("")}
  <h2>Review evidence</h2>${paragraphs([
    ["Survey and datum checks", p.evidence.survey],
    ["Hydrology and downstream boundary", p.evidence.boundary],
    ["Model suitability and external checks", p.evidence.model],
    ["Reviewer", p.evidence.reviewer],
    ["Conclusion and outstanding actions", p.evidence.notes],
  ])}
  <h2>AI report assessment</h2>${ai ? `<p class="notice">AI-generated draft${ai.edited ? ", edited by the preparer" : ""}. Requires engineering review. Model ${h(ai.model)}. Generated ${h(ai.date)}.</p><p>${h(ai.text)}</p>` : `<p>${p.aiAssessment ? "An earlier AI draft was excluded because the assessment changed." : "No AI assessment included."}</p>`}
  <h2>Saved alternatives</h2>${
    p.scenarios
      .map(
        (s) =>
          `<h3>${h(s.name)}</h3><p>${h(s.note)} · Saved run ${h(s.run.date)}</p>${table(
            ["Event", "Afflux m", "Freeboard m", "Status"],
            s.run.results.map((r) => [
              r.name,
              fmt(r.afflux),
              fmt(r.freeboard),
              r.status,
            ]),
          )}`,
      )
      .join("") || "<p>No alternatives saved.</p>"
  }
  <h2>Method reference</h2><p><a href="https://www.hec.usace.army.mil/confluence/rasdocs/rasum/latest/entering-and-editing-geometric-data/bridges-and-culverts/bridge-hydraulic-computations">USACE HEC-RAS bridge hydraulic computations</a>. V2 uses its own limited standard-step implementation. No numerical equivalence with HEC-RAS is claimed. Source data and engineering review remain necessary.</p><footer><small>Export the BLC project JSON alongside this report to retain all scenario inputs and reopen the assessment.</small></footer></body></html>`;
}
export function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const filename = (p: Project) =>
  (p.reference || p.name).replace(/[^a-z0-9_-]/gi, "-").slice(0, 80) ||
  "assessment";
