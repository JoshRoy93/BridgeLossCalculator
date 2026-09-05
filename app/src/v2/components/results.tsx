"use client";
import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  Copy,
  FileText,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { reviewIssues, verdict } from "../assessment";
import { resultAdvice, reviewIssuePage } from "../guidance";
import {
  currentReview,
  currentRun,
  reviewKey,
  uid,
  type Project,
  type FlowResult,
} from "../model";
import { exportProject } from "../io";
import {
  downloadFile,
  filename,
  fmt,
  MODEL_LIMITS,
  reportHtml,
  resultCsv,
} from "../report";
import { Empty, Field, NumberField } from "./fields";
import { SectionDrawing } from "./section-drawing";
import { AiAssessment } from "./ai-assessment";

type Props = {
  project: Project;
  update: (p: Project) => void;
  notify: (message: string) => void;
};
export function Badge({ text }: { text: string }) {
  const colour =
    text === "Meets criteria" || text === "Review recorded"
      ? "green"
      : text === "Exceeds criteria" || text === "Outside model range"
        ? "red"
        : "amber";
  return (
    <span className={`status ${colour}`}>
      <span />
      {text}
    </span>
  );
}
export function ResultsTable({
  project: p,
  select,
}: {
  project: Project;
  select?: (id: string) => void;
}) {
  const run = currentRun(p);
  if (!run)
    return (
      <Empty title={p.run ? "Inputs have changed" : "Ready for the first run"}>
        Run the assessment to calculate water levels, afflux and freeboard for
        each event.
      </Empty>
    );
  return (
    <div className="table-scroll">
      <table className="results-table">
        <thead>
          <tr>
            <th>Flow event</th>
            <th>
              Discharge <small>m³/s</small>
            </th>
            <th>
              Upstream <small>m</small>
            </th>
            <th>
              Afflux <small>m</small>
            </th>
            <th>
              Freeboard <small>m</small>
            </th>
            <th>Assessment</th>
            {select && (
              <th>
                <span className="sr-only">Inspect</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {run.results.map((r) => (
            <tr key={r.flowId}>
              <td>
                <strong>{r.name}</strong>
              </td>
              <td>{fmt(r.discharge, 1)}</td>
              <td>{fmt(r.status === "ok" ? r.bridge[3].wsel : null)}</td>
              <td>{fmt(r.afflux)}</td>
              <td>{fmt(r.freeboard)}</td>
              <td>
                <Badge text={verdict(r, p)} />
              </td>
              {select && (
                <td>
                  <button
                    className="icon-button"
                    aria-label={`Inspect ${r.name}`}
                    onClick={() => select(r.flowId)}
                  >
                    <ArrowUpRight size={17} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Overview({
  project: p,
  navigate,
}: {
  project: Project;
  navigate: (page: string) => void;
}) {
  const run = currentRun(p);
  const [event, setEvent] = useState(0);
  const index = Math.min(event, Math.max(0, p.inputs.flows.length - 1));
  const r = run?.results[index];
  const valid = run?.results.filter((r) => r.status === "ok") ?? [];
  const maxAfflux = valid.length
    ? Math.max(...valid.map((r) => r.afflux!))
    : null;
  const minFreeboard = valid.length
    ? Math.min(...valid.map((r) => r.freeboard!))
    : null;
  const exceed = run?.results.filter(
    (r) => verdict(r, p) !== "Meets criteria",
  ).length;
  return (
    <>
      <div className="overview-title">
        <div>
          <span className="eyebrow">Crossing assessment</span>
          <h2>{p.name || "Untitled assessment"}</h2>
          <p>
            {p.location || "Add the crossing location"} <span>·</span>{" "}
            {p.reference || "No project reference"}
          </p>
        </div>
        <Badge
          text={
            currentReview(p)
              ? "Review recorded"
              : run
                ? "Ready to review"
                : p.run
                  ? "Run out of date"
                  : "Not yet calculated"
          }
        />
      </div>
      <div className="metric-strip">
        <div>
          <span>Maximum afflux</span>
          <strong>
            {fmt(maxAfflux)}
            <small>m</small>
          </strong>
          <p>Bridge vs natural reach</p>
        </div>
        <div>
          <span>Minimum freeboard</span>
          <strong>
            {fmt(minFreeboard)}
            <small>m</small>
          </strong>
          <p>Clearance below soffit</p>
        </div>
        <div>
          <span>Flow events</span>
          <strong>
            {p.inputs.flows.length.toString().padStart(2, "0")}
            <small>events</small>
          </strong>
          <p>
            {run
              ? `${valid.length} within model range`
              : "Waiting for calculation"}
          </p>
        </div>
        <div>
          <span>Review attention</span>
          <strong>
            {run ? (exceed ?? 0).toString().padStart(2, "0") : "—"}
          </strong>
          <p>
            {p.criteria.source
              ? "Exceedances or model limits"
              : "Criteria source still required"}
          </p>
        </div>
      </div>
      <div className="overview-main">
        <section className="drawing-panel">
          <div className="drawing-header">
            <div>
              <span className="eyebrow">Section 03</span>
              <h3>Upstream opening</h3>
            </div>
            {p.inputs.flows.length > 0 && (
              <select
                aria-label="Drawing flow event"
                value={index}
                onChange={(e) => setEvent(Number(e.target.value))}
              >
                {p.inputs.flows.map((f, i) => (
                  <option value={i} key={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <SectionDrawing
            inputs={p.inputs}
            water={r?.status === "ok" ? r.bridge[2].wsel : undefined}
            natural={r?.status === "ok" ? r.natural[2].wsel : undefined}
          />
          <div className="drawing-legend">
            <span>
              <i className="water-key" />
              Bridge water level
            </span>
            <span>
              <i className="natural-key" />
              Bridge-free water level
            </span>
            <span>
              {run
                ? "Calculated section geometry"
                : "Geometry preview · run to show water"}
            </span>
          </div>
        </section>
        <aside className="workflow-panel">
          <span className="eyebrow">Reading the results</span>
          <h3>What should I look for?</h3>
          <p>
            Afflux is the extra upstream water level caused by the bridge
            compared with the bridge-free reach.
          </p>
          <p>
            Freeboard is the clearance between the water and the underside of
            the bridge deck.
          </p>
          <p>
            Compare both with your project criteria, then inspect any flagged
            events before recording a conclusion.
          </p>
          <button onClick={() => navigate("review")}>
            <span>
              <strong>Set acceptance criteria</strong>
              <small>Use the limits and source for your project</small>
            </span>
            <ArrowUpRight size={14} />
          </button>
          <button onClick={() => navigate("simulation")}>
            <span>
              <strong>Explore the crossing in 3D</strong>
              <small>Optional geometry and what-if view</small>
            </span>
            <ArrowUpRight size={14} />
          </button>
          <button onClick={() => navigate("scenarios")}>
            <span>
              <strong>Compare alternatives</strong>
              <small>Optional comparison of calculated cases</small>
            </span>
            <ArrowUpRight size={14} />
          </button>
        </aside>
      </div>
      <section className="results-section">
        <div className="editor-toolbar">
          <div>
            <span className="eyebrow">Design events</span>
            <h3>Water levels and clearance</h3>
          </div>
          <button className="button quiet" onClick={() => navigate("results")}>
            View calculation record <ArrowUpRight size={15} />
          </button>
        </div>
        <ResultsTable project={p} />
      </section>
    </>
  );
}
function Trace({
  result: r,
  project: p,
}: {
  result: FlowResult;
  project: Project;
}) {
  const [natural, setNatural] = useState(false);
  const steps = natural ? r.natural : r.bridge;
  return (
    <>
      <div className="editor-toolbar">
        <h3>Energy balance, section by section</h3>
        <select
          aria-label="Calculation case"
          value={natural ? "natural" : "bridge"}
          onChange={(e) => setNatural(e.target.value === "natural")}
        >
          <option value="bridge">Bridge case</option>
          <option value="natural">Bridge-free baseline</option>
        </select>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Section</th>
              <th>WSEL m</th>
              <th>Area m²</th>
              <th>Velocity m/s</th>
              <th>Froude</th>
              <th>Energy m</th>
              <th>Friction m</th>
              <th>Transition m</th>
              <th>Residual m</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((s) => (
              <tr key={s.section}>
                <td>{p.inputs.sections[s.section].name}</td>
                <td>{fmt(s.wsel)}</td>
                <td>{fmt(s.area)}</td>
                <td>{fmt(s.velocity)}</td>
                <td>{fmt(s.froude)}</td>
                <td>{fmt(s.energy)}</td>
                <td>{fmt(s.friction)}</td>
                <td>{fmt(s.transition)}</td>
                <td>{fmt(s.residual, 7)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="formula">
        WSELᵤ + Vᵤ² / 2g = WSELᵈ + Vᵈ² / 2g + h friction + h transition
      </p>
      <p className="muted">
        Subcritical solution · alpha = 1 · mean-conveyance friction · energy
        residual tolerance 0.00001 m. The report includes full section
        properties and iteration counts.
      </p>
    </>
  );
}
export function Results({
  project: p,
  update,
  navigate,
}: Props & { navigate?: (page: string) => void }) {
  const run = currentRun(p);
  const advice = resultAdvice(p);
  const [id, setId] = useState("");
  const r = run?.results.find((r) => r.flowId === id) ?? run?.results[0];
  return (
    <>
      <div className="section-heading">
        <h2>Calculate, inspect, compare</h2>
        <p>
          Every result belongs to a recorded set of inputs. Inspect the balance
          before drawing a conclusion.
        </p>
      </div>
      <ResultsTable project={p} select={setId} />
      {run && (
        <div className="result-advice">
          <strong>{advice.title}</strong>
          <p>{advice.text}</p>
          {navigate && advice.page !== "results" && (
            <button
              className="button secondary"
              onClick={() => navigate(advice.page)}
            >
              {advice.page === "report"
                ? "Prepare report"
                : "Open engineering review"}
              <ArrowUpRight size={15} />
            </button>
          )}
        </div>
      )}
      {run && r && (
        <>
          <div className="detail-header">
            <select
              aria-label="Detailed flow event"
              value={r.flowId}
              onChange={(e) => setId(e.target.value)}
            >
              {run.results.map((r) => (
                <option key={r.flowId} value={r.flowId}>
                  {r.name}
                </option>
              ))}
            </select>
            <Badge text={verdict(r, p)} />
          </div>
          {r.reason && <div className="notice error">{r.reason}</div>}
          {r.status === "ok" && (
            <>
              <div className="comparison-strip">
                <div>
                  <span>Bridge approach WSEL</span>
                  <strong>{fmt(r.bridge[3].wsel)} m</strong>
                </div>
                <div>
                  <span>Natural approach WSEL</span>
                  <strong>{fmt(r.natural[3].wsel)} m</strong>
                </div>
                <div>
                  <span>Bridge afflux</span>
                  <strong>{fmt(r.afflux)} m</strong>
                </div>
              </div>
              <Trace result={r} project={p} />
            </>
          )}
        </>
      )}
      <section className="external-comparison">
        <h3>External model check</h3>
        <p className="muted">
          Enter the approach water level from your HEC-RAS or other model. Match
          discharge, section location and vertical datum. Changes require a new
          run.
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>External WSEL · m</th>
                <th>BLC minus external · m</th>
                <th>Comparison</th>
              </tr>
            </thead>
            <tbody>
              {p.inputs.flows.map((f) => {
                const result = run?.results.find((r) => r.flowId === f.id),
                  delta =
                    result?.status === "ok" && f.reference !== null
                      ? result.bridge[3].wsel - f.reference
                      : null;
                return (
                  <tr key={f.id}>
                    <td>{f.name}</td>
                    <td>
                      <input
                        aria-label={`${f.name} external WSEL`}
                        type="number"
                        step="any"
                        value={f.reference ?? ""}
                        onChange={(e) =>
                          update({
                            ...p,
                            inputs: {
                              ...p.inputs,
                              flows: p.inputs.flows.map((flow) =>
                                flow.id === f.id
                                  ? {
                                      ...flow,
                                      reference:
                                        e.target.value === ""
                                          ? null
                                          : Number(e.target.value),
                                    }
                                  : flow,
                              ),
                            },
                          })
                        }
                      />
                    </td>
                    <td>{fmt(delta)}</td>
                    <td>
                      {delta === null
                        ? "Not compared"
                        : Math.abs(delta) <= p.criteria.comparison
                          ? "Within tolerance"
                          : "Investigate difference"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <details className="helper">
        <summary>Method and supported range</summary>
        <p>{MODEL_LIMITS}</p>
        <p>
          Afflux compares matched bridge and bridge-free runs. It is different
          from total water-level rise along the reach. Similar outputs do not
          establish equivalence with another model.
        </p>
        <a
          href="https://www.hec.usace.army.mil/confluence/rasdocs/rasum/latest/entering-and-editing-geometric-data/bridges-and-culverts/bridge-hydraulic-computations"
          target="_blank"
          rel="noreferrer"
        >
          USACE bridge hydraulic computations ↗
        </a>
      </details>
    </>
  );
}

export function Scenarios({ project: p, update, notify }: Props) {
  const [name, setName] = useState("Existing crossing"),
    [note, setNote] = useState("");
  const run = currentRun(p);
  return (
    <>
      <div className="section-heading">
        <h2>Compare alternatives</h2>
        <p>
          Save a calculated case, change the inputs, then run again. Each saved
          alternative retains its own inputs.
        </p>
      </div>
      <div className="scenario-save">
        <Field label="Alternative name" value={name} onChange={setName} />
        <Field label="What changed and why" value={note} onChange={setNote} />
        <button
          className="button primary"
          disabled={!run || !name.trim() || p.scenarios.length >= 12}
          onClick={() => {
            if (p.scenarios.some((s) => s.name === name.trim())) {
              notify("Use a different alternative name.");
              return;
            }
            update({
              ...p,
              scenarios: [
                ...p.scenarios,
                {
                  id: uid(),
                  name: name.trim(),
                  note,
                  run: structuredClone(run!),
                },
              ],
            });
            notify("Alternative saved with its calculation inputs.");
          }}
        >
          <Copy size={16} />
          Save current case
        </button>
      </div>
      {!run && (
        <div className="notice">
          Run the current inputs before saving an alternative.
        </div>
      )}
      {run && !name.trim() && (
        <p className="notice">Enter an alternative name to save this case.</p>
      )}
      {p.scenarios.length >= 12 && (
        <p className="notice">
          All 12 alternative slots are used. Export a project backup, then
          remove an alternative to save another.
        </p>
      )}
      {!p.scenarios.length && (
        <Empty title="A baseline makes changes useful">
          Save the existing crossing first. Then test a wider opening, different
          roughness or a blockage allowance.
        </Empty>
      )}
      {p.scenarios.map((s) => (
        <section key={s.id} className="scenario">
          <div className="editor-toolbar">
            <div>
              <h3>{s.name}</h3>
              <p>
                {s.note || "No change note recorded"}{" "}
                <span className="muted">
                  · {new Date(s.run.date).toLocaleString("en-AU")}
                </span>
              </p>
            </div>
            <div className="inline-actions">
              <button
                className="button secondary"
                onClick={() => {
                  if (
                    !window.confirm(
                      `Restore "${s.name}"? Current inputs will be replaced. Save them as an alternative first if you need them.`,
                    )
                  )
                    return;
                  update({
                    ...p,
                    inputs: structuredClone(s.run.inputs),
                    run: structuredClone(s.run),
                    review: null,
                  });
                  notify("Alternative restored. Review status cleared.");
                }}
              >
                <RotateCcw size={14} />
                Restore
              </button>
              <button
                className="icon-button"
                aria-label={`Delete ${s.name}`}
                onClick={() => {
                  if (window.confirm(`Delete saved alternative "${s.name}"?`))
                    update({
                      ...p,
                      scenarios: p.scenarios.filter((item) => item.id !== s.id),
                    });
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Saved afflux m</th>
                  <th>Current afflux m</th>
                  <th>Change m</th>
                  <th>Comparison basis</th>
                </tr>
              </thead>
              <tbody>
                {s.run.results.map((r, i) => {
                  const now = run?.results.find((n) => n.name === r.name);
                  const savedFlow = s.run.inputs.flows[i],
                    currentFlow = p.inputs.flows.find((f) => f.name === r.name);
                  const matched =
                    currentFlow?.discharge === savedFlow.discharge &&
                    currentFlow?.tailwater === savedFlow.tailwater;
                  return (
                    <tr key={r.flowId}>
                      <td>{r.name}</td>
                      <td>{fmt(r.afflux)}</td>
                      <td>{fmt(now?.afflux)}</td>
                      <td>
                        {fmt(
                          matched &&
                            r.afflux !== null &&
                            now?.afflux !== null &&
                            now?.afflux !== undefined
                            ? now.afflux - r.afflux
                            : null,
                        )}
                      </td>
                      <td>
                        {!now
                          ? "Run current case"
                          : matched
                            ? "Same flow and tailwater"
                            : "Flow or tailwater differs"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <p className="muted">
        Up to 12 alternatives per project. Restore a case to inspect its full
        survey and bridge geometry. Export project JSON to retain all
        alternatives.
      </p>
    </>
  );
}

export function Review({
  project: p,
  update,
  notify,
  navigate,
}: Props & { navigate?: (page: string) => void }) {
  const issues = reviewIssues(p);
  return (
    <>
      <div className="section-heading">
        <h2>Criteria and engineering review</h2>
        <p>
          Use project-specific acceptance criteria and record the evidence
          behind your conclusion.
        </p>
      </div>
      <div className="editor-layout">
        <section>
          <h3>Project criteria</h3>
          <div className="form-grid three">
            <NumberField
              label="Minimum freeboard · m"
              value={p.criteria.freeboard}
              min={0}
              onChange={(v) =>
                update({ ...p, criteria: { ...p.criteria, freeboard: v } })
              }
            />
            <NumberField
              label="Maximum afflux · m"
              value={p.criteria.afflux}
              min={0}
              onChange={(v) =>
                update({ ...p, criteria: { ...p.criteria, afflux: v } })
              }
            />
            <NumberField
              label="External comparison tolerance · m"
              value={p.criteria.comparison}
              min={0}
              onChange={(v) =>
                update({ ...p, criteria: { ...p.criteria, comparison: v } })
              }
            />
          </div>
          <Field
            label="Criteria source and applicability"
            value={p.criteria.source}
            onChange={(v) =>
              update({ ...p, criteria: { ...p.criteria, source: v } })
            }
            multiline
            hint="Cite the project brief or applicable clause and explain which events it covers. Default numbers are examples, not regulatory limits."
          />
          <h3 className="subheading">Evidence record</h3>
          {(
            [
              { key: "survey", label: "Survey and datum checks" },
              { key: "boundary", label: "Hydrology and downstream boundary" },
              { key: "model", label: "Model suitability and external checks" },
              { key: "reviewer", label: "Reviewer name" },
              { key: "notes", label: "Conclusion and outstanding actions" },
            ] as const
          ).map((item) => (
            <Field
              key={item.key}
              label={item.label}
              value={p.evidence[item.key]}
              multiline={item.key !== "reviewer"}
              onChange={(v) =>
                update({ ...p, evidence: { ...p.evidence, [item.key]: v } })
              }
            />
          ))}
        </section>
        <aside className="context-panel review-panel">
          <span className="eyebrow">Review record</span>
          <h3>
            {currentReview(p)
              ? "Review recorded"
              : "Ready when the evidence is."}
          </h3>
          <p>
            Completing this record does not mean the crossing meets its
            criteria. Record exceedances and actions in the conclusion.
          </p>
          {issues.length > 0 ? (
            <ul>
              {issues.map((issue) => (
                <li key={issue}>
                  {navigate && reviewIssuePage(issue) !== "review" ? (
                    <button
                      className="issue-link"
                      onClick={() => navigate(reviewIssuePage(issue))}
                    >
                      {issue}
                      <ArrowUpRight size={14} />
                    </button>
                  ) : (
                    issue
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>Required fields are complete for the current run.</p>
          )}
          <button
            className="button primary"
            disabled={issues.length > 0 || currentReview(p)}
            onClick={() => {
              const invalid =
                document.querySelector<HTMLInputElement>(".blc input:invalid");
              if (invalid) {
                invalid.reportValidity();
                invalid.focus();
                return;
              }
              update({
                ...p,
                review: { date: new Date().toISOString(), key: reviewKey(p) },
              });
              notify("Review recorded for the current assessment.");
            }}
          >
            <Check size={16} />
            Record review completion
          </button>
          <p className="muted">
            A local attribution, not an authenticated signature. Changes to the
            assessment invalidate this record.
          </p>
        </aside>
      </div>
    </>
  );
}

export function Report({ project: p, update, notify }: Props) {
  const run = currentRun(p);
  const exportReport = (print: boolean) => {
    try {
      const html = reportHtml(p);
      if (print) {
        const tab = window.open("", "_blank");
        if (!tab)
          throw new Error(
            "Allow the report window to open, or download the HTML report.",
          );
        tab.opener = null;
        tab.document.write(html);
        tab.document.close();
        tab.focus();
        tab.print();
      } else downloadFile(`${filename(p)}-report.html`, html, "text/html");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Report export failed.");
    }
  };
  return (
    <>
      <div className="section-heading">
        <h2>Prepare the handover</h2>
        <p>
          Keep the report and project file together so a reviewer can reproduce
          the assessment.
        </p>
      </div>
      <div className="report-layout">
        <section className="report-preview">
          <div className="report-masthead">
            <span>BLC / V2</span>
            <span>ASSESSMENT REPORT</span>
          </div>
          <h2>{p.name}</h2>
          <p>
            {p.reference || "Project reference not set"} ·{" "}
            {p.location || "Location not set"}
          </p>
          <Badge text={currentReview(p) ? "Review recorded" : "Draft report"} />
          <hr />
          <h3>Waterway assessment</h3>
          <ResultsTable project={p} />
          <h3>Assessment purpose</h3>
          <p>{p.purpose || "No purpose recorded."}</p>
          <h3>Engineering conclusion</h3>
          <p>
            {p.evidence.notes ||
              "Complete review evidence and conclusion before handover."}
          </p>
          <p className="report-limit">{MODEL_LIMITS}</p>
        </section>
        <aside className="context-panel">
          <span className="eyebrow">Export package</span>
          <h3>A record you can reopen.</h3>
          {!run && (
            <div className="notice">
              {p.run
                ? "Inputs have changed. Run the assessment again to enable PDF, HTML and CSV exports."
                : "Run the assessment to enable PDF, HTML and CSV exports."}{" "}
              You can download project JSON at any time.
            </div>
          )}
          {run && !currentReview(p) && (
            <p>
              Report export is available now. It will be marked as a draft until
              your engineering review is recorded.
            </p>
          )}
          <p>
            The full report includes sources, criteria, every survey point,
            calculation steps, comparisons, alternatives and review notes.
          </p>
          <button
            className="button primary full"
            disabled={!run}
            onClick={() => exportReport(true)}
          >
            <FileText size={16} />
            Print / save as PDF
          </button>
          <button
            className="button secondary full"
            disabled={!run}
            onClick={() => exportReport(false)}
          >
            <ArrowDownToLine size={16} />
            Download full HTML report
          </button>
          <button
            className="button secondary full"
            disabled={!run}
            onClick={() => {
              try {
                downloadFile(
                  `${filename(p)}-results.csv`,
                  resultCsv(p),
                  "text/csv",
                );
              } catch (e) {
                notify(String(e));
              }
            }}
          >
            <ArrowDownToLine size={16} />
            Download results CSV
          </button>
          <button
            className="button secondary full"
            onClick={() =>
              downloadFile(
                `${filename(p)}.blc.json`,
                exportProject(p),
                "application/json",
              )
            }
          >
            <ArrowDownToLine size={16} />
            Download project JSON
          </button>
          <p className="muted">
            PDF uses your browser print dialogue. HTML reports contain no
            scripts or external assets.
          </p>
          {run && (
            <div className="run-stamp">
              Engine {run.engine}
              <br />
              {new Date(run.date).toLocaleString("en-AU")}
              <br />
              <span>{run.id}</span>
            </div>
          )}
        </aside>
      </div>
      <AiAssessment project={p} update={update} />
    </>
  );
}
