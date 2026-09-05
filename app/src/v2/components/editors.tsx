"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { pasteFlowCells } from "../flow-grid";
import { parseReferenceCsv } from "../io";
import { uid, type Project } from "../model";
import { Field, NumberField } from "./fields";
import { SurveyGrid } from "./survey-grid";
import { SectionDrawing } from "./section-drawing";

type Props = {
  project: Project;
  update: (p: Project) => void;
  notify: (message: string) => void;
};
export function ProjectEditor({ project: p, update }: Props) {
  const set = (key: keyof Project, value: string) =>
    update({ ...p, [key]: value });
  return (
    <div className="editor-layout">
      <section>
        <div className="section-heading">
          <h2>Project details</h2>
          <p>
            Identify the crossing and the question this assessment must answer.
          </p>
        </div>
        <div className="form-grid">
          <Field
            label="Project name"
            value={p.name}
            onChange={(v) => set("name", v)}
          />
          <Field
            label="Project reference"
            value={p.reference}
            onChange={(v) => set("reference", v)}
          />
          <Field
            label="Location / watercourse"
            value={p.location}
            onChange={(v) => set("location", v)}
          />
          <Field
            label="Vertical datum"
            value={p.datum}
            onChange={(v) => set("datum", v)}
            hint="All survey and water levels must use this datum."
          />
          <Field
            label="Prepared by"
            value={p.author}
            onChange={(v) => set("author", v)}
          />
        </div>
        <Field
          label="Assessment purpose"
          value={p.purpose}
          onChange={(v) => set("purpose", v)}
          multiline
        />
      </section>
      <aside className="context-panel">
        <span className="eyebrow">Assessment basis</span>
        <h3>Start with the engineering question.</h3>
        <p>
          Record the crossing, datum and expected decision before interpreting a
          result.
        </p>
        <p>
          Projects save in this browser. Download a JSON backup for handover or
          use on another computer.
        </p>
        <div className="note">
          New projects include editable example geometry to show the required
          format. Replace it with surveyed data and record its source.
        </div>
      </aside>
    </div>
  );
}

export function GeometryEditor(props: Props) {
  const { project: p, update } = props;
  const [section, setSection] = useState(0);
  const s = p.inputs.sections[section];
  const patch = (change: Partial<typeof s>) =>
    update({
      ...p,
      inputs: {
        ...p.inputs,
        sections: p.inputs.sections.map((s, i) =>
          i === section ? { ...s, ...change } : s,
        ),
      },
    });
  return (
    <>
      <div className="section-heading">
        <h2>Survey the reach</h2>
        <p>
          Four sections, ordered from downstream to upstream. Stations run left
          to right looking downstream.
        </p>
      </div>
      <div className="section-tabs" role="tablist" aria-label="Survey sections">
        {p.inputs.sections.map((s, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={section === i}
            className={section === i ? "active" : ""}
            onClick={() => {
              if (
                document.querySelector('[data-unsaved="true"]') &&
                !window.confirm(
                  "Discard the unapplied survey coordinates before switching sections?",
                )
              )
                return;
              setSection(i);
            }}
          >
            <span>0{i + 1}</span>
            {s.name}
          </button>
        ))}
      </div>
      <div className="geometry-layout">
        <section className="drawing-panel">
          <div className="drawing-header">
            <span className="eyebrow">{s.name}</span>
            <span>{s.points.length} points · SI</span>
          </div>
          <SectionDrawing inputs={p.inputs} section={section} />
          <div className="form-grid section-settings">
            <NumberField
              label="Manning roughness n"
              value={s.n}
              min={0.01}
              max={0.2}
              step={0.001}
              onChange={(v) => patch({ n: v })}
              hint="One uniform roughness per section."
            />
            <Field
              label="Survey source / date"
              value={s.source}
              onChange={(v) => patch({ source: v })}
              multiline
            />
          </div>
        </section>
        <section className="survey-editor">
          <SurveyGrid key={`${p.id}-${section}`} {...props} section={section} />
        </section>
      </div>
    </>
  );
}
export function BridgeEditor({ project: p, update }: Props) {
  const b = p.inputs.bridge;
  const patch = (change: Partial<typeof b>) =>
    update({ ...p, inputs: { ...p.inputs, bridge: { ...b, ...change } } });
  return (
    <>
      <div className="section-heading">
        <h2>Define the opening</h2>
        <p>
          A straight, horizontal-soffit bridge. Opening geometry applies at both
          bridge sections.
        </p>
      </div>
      <div className="bridge-layout">
        <section>
          <div className="form-grid">
            <NumberField
              label="Left abutment station · m"
              value={b.left}
              onChange={(v) => patch({ left: v })}
            />
            <NumberField
              label="Right abutment station · m"
              value={b.right}
              onChange={(v) => patch({ right: v })}
            />
            <NumberField
              label="Soffit elevation · m"
              value={b.soffit}
              onChange={(v) => patch({ soffit: v })}
            />
            <NumberField
              label="Deck elevation · m"
              value={b.deck}
              onChange={(v) => patch({ deck: v })}
            />
          </div>
          <div className="editor-toolbar">
            <h3>Piers</h3>
            <button
              className="button quiet"
              disabled={b.piers.length >= 50}
              onClick={() =>
                patch({
                  piers: [
                    ...b.piers,
                    { station: (b.left + b.right) / 2, width: 0.6 },
                  ],
                })
              }
            >
              <Plus size={16} />
              Add pier
            </button>
          </div>
          {b.piers.length === 0 && (
            <p className="muted">Clear span. No piers in the opening.</p>
          )}
          {b.piers.map((pier, i) => (
            <div className="pier-row" key={i}>
              <NumberField
                label={`Pier ${i + 1} station · m`}
                value={pier.station}
                onChange={(v) =>
                  patch({
                    piers: b.piers.map((p, j) =>
                      j === i ? { ...p, station: v } : p,
                    ),
                  })
                }
              />
              <NumberField
                label={`Pier ${i + 1} width · m`}
                value={pier.width}
                min={0.01}
                onChange={(v) =>
                  patch({
                    piers: b.piers.map((p, j) =>
                      j === i ? { ...p, width: v } : p,
                    ),
                  })
                }
              />
              <button
                className="icon-button"
                aria-label={`Remove pier ${i + 1}`}
                onClick={() =>
                  patch({ piers: b.piers.filter((_, j) => j !== i) })
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <h3 className="subheading">Reach lengths and losses</h3>
          <div className="form-grid">
            <NumberField
              label="Expansion reach · m"
              value={b.expansionLength}
              min={0.01}
              max={10000}
              onChange={(v) => patch({ expansionLength: v })}
            />
            <NumberField
              label="Length through bridge · m"
              value={b.deckLength}
              min={0.01}
              max={10000}
              onChange={(v) => patch({ deckLength: v })}
            />
            <NumberField
              label="Contraction reach · m"
              value={b.contractionLength}
              min={0.01}
              max={10000}
              onChange={(v) => patch({ contractionLength: v })}
            />
            <NumberField
              label="Contraction coefficient"
              value={b.contraction}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => patch({ contraction: v })}
            />
            <NumberField
              label="Expansion coefficient"
              value={b.expansion}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => patch({ expansion: v })}
            />
            <NumberField
              label="Opening blockage · %"
              value={b.blockage}
              min={0}
              max={80}
              step={1}
              onChange={(v) => patch({ blockage: v })}
            />
          </div>
        </section>
        <aside>
          <div className="drawing-panel">
            <SectionDrawing inputs={p.inputs} compact />
          </div>
          <div className="context-panel">
            <span className="eyebrow">Model assumptions</span>
            <p>
              Abutments and piers remove submerged area and add wetted
              perimeter. The solver uses the actual ground profile at each
              opening section.
            </p>
            <p>
              Blockage reduces open area uniformly. Use it to test sensitivity,
              then assess actual debris geometry in a suitable external model.
            </p>
            <p>
              Skew, arches, sloping soffits and floodplain bypass require an
              external model.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
function RainfallHelper({ project: p, update, notify }: Props) {
  const [area, setArea] = useState(1),
    [intensity, setIntensity] = useState(50),
    [coefficient, setCoefficient] = useState(0.5),
    [duration, setDuration] = useState(60),
    [tailwater, setTailwater] = useState(102),
    [name, setName] = useState("Rainfall estimate"),
    [source, setSource] = useState("");
  const q = (coefficient * intensity * area) / 3.6;
  const valid =
    source.trim() &&
    name.trim() &&
    area > 0 &&
    intensity > 0 &&
    duration > 0 &&
    coefficient > 0 &&
    coefficient <= 1 &&
    p.inputs.flows.length < 30;
  return (
    <details className="helper">
      <summary>Estimate a flow from rainfall</summary>
      <p>
        Rational-method screening: Q = C × i × A / 3.6. Enter intensity at a
        duration consistent with the catchment response. This helper does not
        select a design duration or establish flood frequency.
      </p>
      <a
        href="https://www.bom.gov.au/water/designRainfalls/"
        target="_blank"
        rel="noreferrer"
      >
        Open Bureau of Meteorology design rainfall data ↗
      </a>
      <div className="form-grid three">
        <NumberField
          label="Catchment area · km²"
          value={area}
          onChange={setArea}
          min={0.0001}
        />
        <NumberField
          label="Intensity · mm/h"
          value={intensity}
          onChange={setIntensity}
          min={0.001}
        />
        <NumberField
          label="Runoff coefficient C"
          value={coefficient}
          onChange={setCoefficient}
          min={0.001}
          max={1}
        />
        <NumberField
          label="Duration · minutes"
          value={duration}
          onChange={setDuration}
          min={0.001}
        />
        <NumberField
          label="Downstream water level · m"
          value={tailwater}
          onChange={setTailwater}
        />
        <Field label="Event name" value={name} onChange={setName} />
      </div>
      <Field
        label="Rainfall source and suitability notes"
        value={source}
        onChange={setSource}
      />
      <div className="inline-actions">
        <strong>{q.toFixed(3)} m³/s</strong>
        <button
          className="button secondary"
          disabled={!valid}
          onClick={() => {
            const invalid =
              document.querySelector<HTMLInputElement>(".blc input:invalid");
            if (invalid) {
              invalid.reportValidity();
              invalid.focus();
              return;
            }
            if (
              p.inputs.flows.some(
                (f) =>
                  f.name.trim().toLowerCase() === name.trim().toLowerCase(),
              )
            ) {
              notify("Choose a unique event name.");
              return;
            }
            update({
              ...p,
              inputs: {
                ...p.inputs,
                flows: [
                  ...p.inputs.flows,
                  {
                    id: uid(),
                    name: name.trim(),
                    discharge: q,
                    tailwater,
                    reference: null,
                    source: `${source}. Rational estimate: C=${coefficient}, intensity=${intensity} mm/h, area=${area} km², duration=${duration} min. Tailwater entered manually; verify source.`,
                  },
                ],
              },
            });
            notify(
              "Rainfall estimate added. Check its downstream boundary before running.",
            );
          }}
        >
          Add estimate as event
        </button>
      </div>
    </details>
  );
}
export function FlowEditor(props: Props) {
  const { project: p, update, notify } = props;
  const [pasteVersion, setPasteVersion] = useState(0);
  const patch = (
    id: string,
    change: Partial<(typeof p.inputs.flows)[number]>,
  ) =>
    update({
      ...p,
      inputs: {
        ...p.inputs,
        flows: p.inputs.flows.map((f) =>
          f.id === id ? { ...f, ...change } : f,
        ),
      },
    });
  return (
    <>
      <div className="section-heading with-action">
        <div>
          <h2>Flow events and boundaries</h2>
          <p>
            Enter discharge and a downstream water level for each event, in the
            project datum.
          </p>
        </div>
        <button
          className="button secondary"
          disabled={p.inputs.flows.length >= 30}
          onClick={() =>
            update({
              ...p,
              inputs: {
                ...p.inputs,
                flows: [
                  ...p.inputs.flows,
                  {
                    id: uid(),
                    name: `Event ${p.inputs.flows.length + 1}`,
                    discharge: 35,
                    tailwater: 102,
                    source: "",
                    reference: null,
                  },
                ],
              },
            })
          }
        >
          <Plus size={16} />
          Add event
        </button>
      </div>
      {p.inputs.flows.length === 0 && (
        <div className="empty-state">
          <h3>No flow events yet</h3>
          <p>Add a design event or calculate a rainfall estimate below.</p>
        </div>
      )}
      {p.inputs.flows.length > 0 && (
        <>
          <p className="grid-help">
            Paste CSV or spreadsheet cells into the table. Column order: event,
            discharge, downstream WSEL, source. Extra rows become new events.
          </p>
          <div className="table-scroll flow-table-scroll">
            <table
              className="flow-table"
              aria-label="Flow events and boundaries"
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                const target = (e.target as HTMLElement).closest<HTMLElement>(
                  "[data-flow-cell]",
                );
                const field = target?.dataset.flowCell?.split("-").map(Number);
                if (!field || !/[\t\r\n,]/.test(text)) return;
                // A comma in a source note is ordinary text, not a table paste.
                if (field[1] === 3 && !/[\t\r\n]/.test(text)) return;
                e.preventDefault();
                try {
                  const flows = pasteFlowCells(
                    p.inputs.flows,
                    text,
                    field[0],
                    field[1],
                  );
                  update({ ...p, inputs: { ...p.inputs, flows } });
                  setPasteVersion((version) => version + 1);
                  notify(
                    "Pasted flow events saved. Check the sources and boundaries before running.",
                  );
                } catch (err) {
                  notify(
                    err instanceof Error
                      ? err.message
                      : "Could not paste events.",
                  );
                }
              }}
            >
              <thead>
                <tr>
                  <th scope="col">Event</th>
                  <th scope="col">
                    Discharge <small>m³/s</small>
                  </th>
                  <th scope="col">
                    Downstream WSEL <small>m</small>
                  </th>
                  <th scope="col">Flow and boundary source</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {p.inputs.flows.map((f, i) => (
                  <tr key={f.id}>
                    <td data-flow-cell={`${i}-0`}>
                      <Field
                        label={`Event ${i + 1} name`}
                        value={f.name}
                        onChange={(v) => patch(f.id, { name: v })}
                      />
                    </td>
                    <td data-flow-cell={`${i}-1`}>
                      <NumberField
                        label={`${f.name} discharge · m³/s`}
                        value={f.discharge}
                        resetKey={pasteVersion}
                        min={0.001}
                        max={1e6}
                        onChange={(v) => patch(f.id, { discharge: v })}
                      />
                    </td>
                    <td data-flow-cell={`${i}-2`}>
                      <NumberField
                        label={`${f.name} downstream WSEL · m`}
                        value={f.tailwater}
                        resetKey={pasteVersion}
                        onChange={(v) => patch(f.id, { tailwater: v })}
                      />
                    </td>
                    <td data-flow-cell={`${i}-3`}>
                      <Field
                        label={`${f.name} flow and boundary source`}
                        value={f.source}
                        multiline
                        onChange={(v) => patch(f.id, { source: v })}
                        placeholder="Model, event definition and tailwater source"
                      />
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`Remove ${f.name}`}
                        title={`Remove ${f.name}`}
                        onClick={() =>
                          update({
                            ...p,
                            inputs: {
                              ...p.inputs,
                              flows: p.inputs.flows.filter(
                                (flow) => flow.id !== f.id,
                              ),
                            },
                          })
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <RainfallHelper {...props} />
      <details className="helper">
        <summary>Import external water levels for comparison</summary>
        <p>
          CSV columns: event,upstream_wsel_m. Event names must match exactly.
          Values must represent the approach section in the same datum.
        </p>
        <label className="button secondary file-button">
          Read comparison CSV
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                if (file.size > 100000)
                  throw new Error(
                    "Comparison CSV must be smaller than 100 KB.",
                  );
                update({
                  ...p,
                  inputs: parseReferenceCsv(await file.text(), p.inputs),
                });
                notify(
                  "External levels imported. Re-run to include them in the assessment record.",
                );
              } catch (e) {
                notify(
                  e instanceof Error ? e.message : "Comparison import failed.",
                );
              }
            }}
          />
        </label>
      </details>
    </>
  );
}
