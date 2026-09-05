"use client";
import { useEffect, useRef, useState } from "react";
import { type Inputs, type Project, type Run, inputKey } from "../model";
import { runCalculation } from "../run-calculation";
import { NumberField } from "./fields";
import { fmt } from "../report";
import { SweepChart } from "./sweep-chart";

export function ParameterSweep({
  project,
  onSelectCase,
}: {
  project: Project;
  onSelectCase: (run: Run) => void;
}) {
  const [parameter, setParameter] = useState("width");
  const [min, setMin] = useState(
    project.inputs.bridge.right - project.inputs.bridge.left,
  );
  const [max, setMax] = useState(min + 8);
  const [rows, setRows] = useState<
    { value: number; run: Run | null; error: string }[]
  >([]);
  const [basis, setBasis] = useState("");
  const [busy, setBusy] = useState(false);
  const stop = useRef(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      stop.current = true;
      controller.current?.abort();
    },
    [],
  );
  const key = inputKey(project.inputs);
  const valid =
    Number.isFinite(min) &&
    Number.isFinite(max) &&
    (parameter === "blockage" ? min >= 0 : min > 0) &&
    max > min &&
    (parameter !== "blockage" || max <= 80);
  async function sweep() {
    setBusy(true);
    setRows([]);
    setBasis(key);
    stop.current = false;
    const job = new AbortController();
    controller.current = job;
    const results: typeof rows = [];
    for (let i = 0; i < 9 && !stop.current; i++) {
      const value = min + ((max - min) * i) / 8;
      const inputs: Inputs = structuredClone(project.inputs);
      if (parameter === "width") {
        const mid = (inputs.bridge.left + inputs.bridge.right) / 2;
        inputs.bridge.left = mid - value / 2;
        inputs.bridge.right = mid + value / 2;
      } else inputs.bridge.blockage = value;
      try {
        results.push({
          value,
          run: await runCalculation(inputs, job.signal),
          error: "",
        });
      } catch (error) {
        if (job.signal.aborted) break;
        results.push({
          value,
          run: null,
          error: error instanceof Error ? error.message : "Calculation failed",
        });
      }
      if (job.signal.aborted) break;
      setRows([...results]);
    }
    setBusy(false);
  }
  const meets = (run: Run) =>
    run.results.every(
      (r) =>
        r.status === "ok" &&
        r.afflux! <= project.criteria.afflux &&
        r.freeboard! >= project.criteria.freeboard,
    );
  const first = rows.find((row) => row.run && meets(row.run));
  return (
    <section className="parameter-sweep">
      <h3>Parameter sweep</h3>
      <p>
        Test nine values against the current freeboard and afflux criteria for
        every flow event. This finds passing sampled cases, not a continuous
        optimum.
      </p>
      <fieldset className="form-grid three" disabled={busy}>
        <label className="field">
          <span>Parameter</span>
          <select
            value={parameter}
            disabled={busy}
            onChange={(e) => {
              setParameter(e.target.value);
              setRows([]);
              setMin(
                e.target.value === "width"
                  ? project.inputs.bridge.right - project.inputs.bridge.left
                  : 0,
              );
              setMax(
                e.target.value === "width"
                  ? project.inputs.bridge.right - project.inputs.bridge.left + 8
                  : 50,
              );
            }}
          >
            <option value="width">Opening width Â· m</option>
            <option value="blockage">Blockage Â· %</option>
          </select>
        </label>
        <NumberField
          label="Sweep minimum"
          value={min}
          min={parameter === "blockage" ? 0 : 0.01}
          onChange={(v) => {
            setMin(v);
            setRows([]);
          }}
        />
        <NumberField
          label="Sweep maximum"
          value={max}
          min={0.01}
          onChange={(v) => {
            setMax(v);
            setRows([]);
          }}
        />
      </fieldset>
      <button
        className="button secondary"
        disabled={busy || !valid || !project.inputs.flows.length}
        onClick={sweep}
      >
        {busy ? `Testing ${rows.length} / 9â€¦` : "Run parameter sweep"}
      </button>
      {busy && (
        <button
          className="button quiet"
          onClick={() => {
            stop.current = true;
          }}
        >
          Cancel sweep
        </button>
      )}
      {rows.length > 0 && (
        <>
          <p className="notice">
            {basis !== key
              ? "Project inputs changed. Repeat the sweep before using a case."
              : first
                ? `First tested passing value: ${fmt(first.value, 2)}. Review its assumptions before applying.`
                : "No tested case meets both criteria for every event."}
          </p>
          <SweepChart
            rows={rows}
            parameter={parameter}
            afflux={project.criteria.afflux}
            freeboard={project.criteria.freeboard}
            disabled={busy || basis !== key}
            onSelect={onSelectCase}
          />
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Tested value</th>
                  <th>Maximum afflux m</th>
                  <th>Minimum freeboard m</th>
                  <th>Result</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const supported = row.run?.results.every(
                    (r) => r.status === "ok",
                  );
                  return (
                    <tr key={row.value}>
                      <td>{fmt(row.value, 2)}</td>
                      <td>
                        {supported
                          ? fmt(
                              Math.max(
                                ...row.run!.results.map((r) => r.afflux!),
                              ),
                            )
                          : "Unavailable"}
                      </td>
                      <td>
                        {supported
                          ? fmt(
                              Math.min(
                                ...row.run!.results.map((r) => r.freeboard!),
                              ),
                            )
                          : "Unavailable"}
                      </td>
                      <td>
                        {row.error ||
                          (!supported
                            ? "Outside model range"
                            : meets(row.run!)
                              ? "Meets criteria"
                              : "Exceeds criteria")}
                      </td>
                      <td>
                        <button
                          className="button quiet"
                          disabled={busy || basis !== key || !row.run}
                          onClick={() => onSelectCase(row.run!)}
                        >
                          Preview case
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
