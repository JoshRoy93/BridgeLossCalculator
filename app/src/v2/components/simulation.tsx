"use client";
import dynamic from "next/dynamic";
import { Component, useEffect, useState, type ReactNode } from "react";
import {
  Focus,
  Layers,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Download,
  ImagePlus,
  ChevronDown,
} from "lucide-react";
import {
  currentRun,
  inputKey,
  sceneImageKey,
  type Inputs,
  type Project,
  type Run,
} from "../model";
import { validate } from "../hydraulics";
import { runCalculation } from "../run-calculation";
import { fmt } from "../report";
import { reachStations } from "../scene-geometry";
import { NumberField } from "./fields";
import { HydraulicProfile } from "./water-profile";
import { ParameterSweep } from "./parameter-sweep";
import "./simulation.css";

const BridgeScene = dynamic(() => import("./bridge-scene"), {
  ssr: false,
  loading: () => (
    <div className="studio-loading">Preparing the bridge model…</div>
  ),
});
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="studio-loading">
        3D graphics are unavailable. Enable browser hardware acceleration. The
        calculated profile remains available below.
      </div>
    ) : (
      this.props.children
    );
  }
}
function Adjustment({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="studio-adjustment">
      <NumberField
        label={label}
        value={value}
        min={min}
        max={max}
        step="any"
        onChange={onChange}
      />
      <input
        aria-label={`${label} slider`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
export function Simulation({
  project: p,
  update,
  notify,
}: {
  project: Project;
  update: (p: Project) => void;
  notify: (message: string) => void;
}) {
  const [draft, setDraft] = useState<Inputs>(() => structuredClone(p.inputs));
  const [preview, setPreview] = useState<Run | null>(null);
  const [completed, setCompleted] = useState<Run | null>(() => currentRun(p));
  const [transitioning, setTransitioning] = useState(false);
  const [flow, setFlow] = useState(p.inputs.flows[0]?.id ?? "");
  const [playing, setPlaying] = useState(
    () =>
      typeof window !== "undefined" &&
      !(
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? true
      ),
  );
  const [wireframe, setWireframe] = useState(false);
  const [water, setWater] = useState(true);
  const [labels, setLabels] = useState(true);
  const [depthMode, setDepthMode] = useState(false);
  const [view, setView] = useState("bridge");
  const [fit, setFit] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [showBaseline, setShowBaseline] = useState(false);
  const [capture, setCapture] = useState<((url: string) => void) | undefined>();
  const [failure, setFailure] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const [retry, setRetry] = useState(0);
  const [invalidField, setInvalidField] = useState(false);
  const [inputRevision, setInputRevision] = useState(0);
  const [roughness, setRoughness] = useState(1);
  const [discharge, setDischarge] = useState(1);
  const draftKey = inputKey(draft),
    projectKey = inputKey(p.inputs);
  const changed = draftKey !== projectKey;
  const savedRun = currentRun(p);
  const run =
    preview?.inputKey === draftKey ? preview : !changed ? savedRun : null;
  const result = run?.results.find((r) => r.flowId === flow);
  const baseline = savedRun?.results.find((r) => r.flowId === flow);
  const errors = validate(draft);
  const error = failure?.key === draftKey ? failure.message : "";
  const busy = !run && errors.length === 0 && !error;
  const centre = (p.inputs.bridge.left + p.inputs.bridge.right) / 2;
  const openingSections = p.inputs.sections.slice(1, 3);
  const maxWidth = Math.max(
    0.5,
    Math.min(
      ...openingSections.flatMap((s) => [
        centre - (s.points[0]?.station ?? centre),
        (s.points.at(-1)?.station ?? centre) - centre,
      ]),
    ) * 2,
  );
  const minWidth = Math.max(
    0.5,
    ...draft.bridge.piers.map(
      (p) => (Math.abs(p.station - centre) + p.width / 2) * 2 + 0.1,
    ),
  );
  const minSoffit = Math.max(
    p.inputs.bridge.soffit - 3,
    ...openingSections.map(
      (s) => Math.min(...s.points.map((p) => p.elevation)) + 0.1,
    ),
  );
  const minRoughness = Math.max(
    0.1,
    ...p.inputs.sections.map((s) => 0.01 / s.n),
  );
  const maxRoughness = Math.min(3, ...p.inputs.sections.map((s) => 0.2 / s.n));
  const displayRun = showBaseline ? savedRun : (run ?? completed ?? savedRun);
  const displayedInputs = displayRun?.inputs ?? p.inputs;
  const displayedResult = displayRun?.results.find((r) => r.flowId === flow);
  const holding = !showBaseline && !run && !!displayRun;
  const geometryValid =
    validate({
      ...displayedInputs,
      sections: displayedInputs.sections.map((s) => ({ ...s, n: 0.035 })),
      flows: [
        {
          id: "geometry-check",
          name: "Geometry check",
          discharge: 1,
          tailwater: 0,
          source: "",
          reference: null,
        },
      ],
    }).length === 0;
  useEffect(() => {
    const controller = new AbortController();
    if (
      savedRun?.inputKey === inputKey(draft) ||
      preview?.inputKey === inputKey(draft) ||
      validate(draft).length
    ) {
      return;
    }
    const timer = setTimeout(() => {
      runCalculation(draft, controller.signal)
        .then((run) => {
          if (!controller.signal.aborted) {
            setPreview(run);
            setCompleted(run);
          }
        })
        .catch((e) => {
          if (!controller.signal.aborted)
            setFailure({
              key: inputKey(draft),
              message: e instanceof Error ? e.message : "Preview failed.",
            });
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [draft, savedRun, preview, retry]);
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return;
    const change = () => setPlaying(!media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    if (!expanded) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [expanded]);
  function edit(next: Inputs) {
    setShowBaseline(false);
    setFailure(null);
    setDraft(next);
  }
  function bridge(key: keyof Inputs["bridge"], value: number) {
    edit({ ...draft, bridge: { ...draft.bridge, [key]: value } });
  }
  function reset() {
    setInvalidField(false);
    setInputRevision((v) => v + 1);
    setDraft(structuredClone(p.inputs));
    setPreview(null);
    setCompleted(savedRun);
    setRoughness(1);
    setDischarge(1);
    setFailure(null);
    setShowBaseline(false);
  }
  function captureImage(report: boolean) {
    setCapture(() => (dataUrl: string) => {
      if (report) {
        if (dataUrl.length > 1_500_000) {
          notify(
            "This image exceeds the project image limit. Reduce the viewport size and try again.",
          );
          setCapture(undefined);
          return;
        }
        update({
          ...p,
          sceneImage: {
            dataUrl,
            key: sceneImageKey(p),
            caption: `${result!.name} at ${fmt(result!.discharge, 1)} m³/s. ${view} view. Road approaches, finishes and surface motion are illustrative.`,
          },
          review: null,
        });
        notify("3D view added to the report and project backup.");
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "bridge-3d.png";
        a.click();
      }
      setCapture(undefined);
    });
  }
  return (
    <section
      className={`simulation-studio${expanded ? " studio-expanded" : ""}`}
    >
      <header className="studio-heading">
        <div>
          <p className="studio-eyebrow">SPATIAL ANALYSIS</p>
          <h2>Bridge studio</h2>
        </div>
        <p>Explore the crossing. See the effect of a change.</p>
      </header>
      <div className="studio-toolbar">
        <label className="studio-event">
          <span>Flow event</span>
          <select value={flow} onChange={(e) => setFlow(e.target.value)}>
            {draft.flows.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} · {fmt(f.discharge, 1)} m³/s
              </option>
            ))}
          </select>
        </label>
        <div className="studio-views" role="group" aria-label="Camera view">
          {[
            ["perspective", "Site"],
            ["bridge", "Bridge"],
            ["upstream", "Upstream"],
            ["plan", "Plan"],
          ].map(([id, name]) => (
            <button
              key={id}
              aria-pressed={view === id}
              onClick={() => {
                setView(id);
                setFit((v) => v + 1);
              }}
            >
              {name}
            </button>
          ))}
        </div>
        <button
          className="studio-icon"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? "Exit expanded view" : "Expand studio"}
          title={expanded ? "Exit expanded view" : "Expand studio"}
        >
          {expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
        </button>
      </div>
      <div className="studio-body">
        <div className="studio-main">
          <div
            className="studio-metrics"
            aria-live="polite"
            aria-busy={busy && !showBaseline}
          >
            {(["afflux", "freeboard"] as const).map((key) => {
              const value =
                displayedResult?.status === "ok" ? displayedResult[key] : null;
              const delta =
                value != null && baseline?.[key] != null
                  ? value - baseline[key]
                  : null;
              return (
                <div key={key}>
                  <span>{key === "afflux" ? "AFFLUX" : "FREEBOARD"}</span>
                  <strong>
                    {fmt(value)} <small>m</small>
                  </strong>
                  <em>
                    {holding
                      ? "Previous completed result"
                      : transitioning
                        ? "Target result"
                        : !showBaseline && changed && delta != null
                          ? `${delta > 0 ? "+" : ""}${fmt(delta)} m from project`
                          : showBaseline
                            ? "Project baseline"
                            : "Current calculation"}
                  </em>
                </div>
              );
            })}
            <div>
              <span>UPSTREAM WATER LEVEL</span>
              <strong>
                {fmt(
                  displayedResult?.status === "ok"
                    ? displayedResult.bridge[3]?.wsel
                    : null,
                )}{" "}
                <small>m</small>
              </strong>
              <em>
                {displayedResult?.status === "ok"
                  ? `${fmt(displayedResult.discharge, 1)} m³/s discharge`
                  : busy
                    ? "Calculating preview…"
                    : "No supported result"}
              </em>
            </div>
          </div>
          <div
            className="studio-viewport"
            data-transitioning={transitioning}
            data-holding={holding}
          >
            <div
              className="studio-canvas"
              role="img"
              aria-label="Interactive 3D bridge model. Drag to orbit, scroll to zoom, right drag to pan."
            >
              {geometryValid ? (
                <SceneBoundary>
                  <BridgeScene
                    inputs={displayedInputs}
                    result={displayedResult}
                    playing={playing}
                    speed={1}
                    view={view}
                    fit={fit}
                    wireframe={wireframe}
                    water={water}
                    labels={labels}
                    depthMode={depthMode}
                    capture={capture}
                    onTransition={setTransitioning}
                  />
                </SceneBoundary>
              ) : (
                <div className="studio-loading">
                  Resolve the input checks to display the bridge.
                </div>
              )}
            </div>
            <div className="studio-scene-top">
              <span
                className={`studio-status${busy && !showBaseline ? " pending" : ""}`}
                role="status"
              >
                <i />
                {showBaseline
                  ? "PROJECT BASELINE"
                  : busy
                    ? holding
                      ? "CALCULATING · PREVIOUS VIEW"
                      : "CALCULATING PREVIEW"
                    : holding
                      ? "PREVIOUS COMPLETED VIEW"
                      : transitioning
                        ? "TRANSITIONING TO RESULT"
                        : changed
                          ? "WHAT-IF PREVIEW"
                          : "PROJECT VIEW"}
              </span>
              {changed && baseline && (
                <button
                  className="studio-overlay-button"
                  aria-pressed={showBaseline}
                  onClick={() => setShowBaseline(!showBaseline)}
                >
                  {showBaseline ? "Show preview" : "Compare project"}
                </button>
              )}
            </div>
            <div className="studio-scene-bottom">
              <div>
                <button
                  className="studio-overlay-button"
                  onClick={() => setPlaying(!playing)}
                  disabled={displayedResult?.status !== "ok"}
                  aria-label={playing ? "Pause flow" : "Animate flow"}
                >
                  {playing ? <Pause size={14} /> : <Play size={14} />}
                  <span>{playing ? "Pause" : "Animate"}</span>
                </button>
                <button
                  className="studio-overlay-button"
                  onClick={() => setFit((v) => v + 1)}
                  aria-label="Fit model"
                >
                  <Focus size={16} />
                  <span>Fit</span>
                </button>
              </div>
              <span className="studio-orbit-hint">
                Drag to orbit · scroll to zoom
              </span>
            </div>
            {depthMode && water && displayedResult?.status === "ok" && (
              <div className="studio-depth">
                <span>Water depth</span>
                <i />
                <div>
                  <span>0 m</span>
                  <span>5+ m</span>
                </div>
              </div>
            )}
          </div>
          <div className="studio-layerbar">
            <Layers size={15} />
            {[
              ["Water", water, setWater],
              ["Depth colours", depthMode, setDepthMode],
              ["Dimensions", labels, setLabels],
              ["Survey mesh", wireframe, setWireframe],
            ].map(([label, checked, set]) => (
              <label key={String(label)}>
                <input
                  type="checkbox"
                  checked={checked as boolean}
                  onChange={(e) =>
                    (set as (value: boolean) => void)(e.target.checked)
                  }
                />
                {label as string}
              </label>
            ))}
            <span>1:1 vertical scale</span>
          </div>
          {displayedResult?.status === "unsupported" && (
            <p className="notice error" role="status">
              Water surface unavailable: {displayedResult.reason}
            </p>
          )}
          {holding && (
            <p className="studio-note" role="status">
              {busy
                ? "Calculating. Keeping the previous completed view until the new result is ready."
                : "Showing the previous completed view. Resolve the input checks or retry the calculation."}
            </p>
          )}
          {!displayedResult && (
            <p className="studio-note">
              {busy
                ? "Calculating the changed inputs. Water and outcomes appear when the matching result is ready."
                : "No calculated water surface is available for this event."}
            </p>
          )}
        </div>
        <aside
          key={inputRevision}
          className="studio-inspector"
          data-unsaved={changed}
          onInput={(e) =>
            setInvalidField(!!e.currentTarget.querySelector("input:invalid"))
          }
        >
          <div className="studio-inspector-heading">
            <div>
              <p className="studio-eyebrow">LIVE PREVIEW</p>
              <h3>What if?</h3>
            </div>
            <button
              className="studio-icon"
              onClick={reset}
              aria-label="Reset to project"
              title="Reset to project"
            >
              <RotateCcw size={16} />
            </button>
          </div>
          <p className="studio-note">
            Changes calculate automatically. Your project stays saved until you
            apply.
          </p>
          <Adjustment
            label="Opening width · m"
            value={draft.bridge.right - draft.bridge.left}
            min={minWidth}
            max={maxWidth}
            step={0.5}
            onChange={(v) => {
              const mid = (p.inputs.bridge.left + p.inputs.bridge.right) / 2;
              edit({
                ...draft,
                bridge: {
                  ...draft.bridge,
                  left: mid - v / 2,
                  right: mid + v / 2,
                },
              });
            }}
          />
          <Adjustment
            label="Soffit elevation · m"
            value={draft.bridge.soffit}
            min={minSoffit}
            max={p.inputs.bridge.soffit + 5}
            step={0.1}
            onChange={(v) =>
              edit({
                ...draft,
                bridge: {
                  ...draft.bridge,
                  soffit: v,
                  deck: draft.bridge.deck + v - draft.bridge.soffit,
                },
              })
            }
          />
          <Adjustment
            label="Blockage · %"
            value={draft.bridge.blockage}
            min={0}
            max={80}
            step={1}
            onChange={(v) => bridge("blockage", v)}
          />
          <div className="studio-divider" />
          <Adjustment
            label="Roughness multiplier"
            value={roughness}
            min={minRoughness}
            max={maxRoughness}
            step={0.05}
            onChange={(v) => {
              setRoughness(v);
              edit({
                ...draft,
                sections: p.inputs.sections.map((s) => ({ ...s, n: s.n * v })),
              });
            }}
          />
          <Adjustment
            label="Discharge multiplier"
            value={discharge}
            min={0.1}
            max={3}
            step={0.05}
            onChange={(v) => {
              setDischarge(v);
              edit({
                ...draft,
                flows: p.inputs.flows.map((f) => ({
                  ...f,
                  discharge: f.discharge * v,
                })),
              });
            }}
          />
          <p className="studio-note">
            Soffit changes move the deck with it. Discharge changes hold
            downstream tailwater fixed.
          </p>
          <button
            className="button primary full"
            disabled={
              !run ||
              busy ||
              invalidField ||
              errors.length > 0 ||
              (!changed && !!savedRun)
            }
            onClick={() => {
              update({
                ...p,
                inputs: structuredClone(draft),
                run,
                review: null,
              });
              setRoughness(1);
              setDischarge(1);
              setShowBaseline(false);
              notify(
                "Preview applied to the project. Save an alternative to retain this option.",
              );
            }}
          >
            {busy ? "Calculating…" : "Apply to project"}
          </button>
          <p className="studio-apply-note">
            {changed ? "Unsaved what-if changes" : "No changes to apply"}
          </p>
          {error && (
            <div role="alert">
              <p>{error}</p>
              <button
                className="button secondary"
                onClick={() => {
                  setFailure(null);
                  setRetry((v) => v + 1);
                }}
              >
                Retry calculation
              </button>
            </div>
          )}
          {errors.length > 0 && (
            <ul className="input-checks">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </aside>
      </div>
      <div className="studio-foot">
        <p>
          Survey terrain and calculated water levels. Road approaches, finishes
          and surface motion are illustrative.
        </p>
        <div>
          <button
            disabled={!geometryValid || busy || holding || transitioning}
            onClick={() => captureImage(false)}
          >
            <Download size={15} />
            Save image
          </button>
          <button
            disabled={
              changed ||
              !savedRun ||
              result?.status !== "ok" ||
              busy ||
              transitioning
            }
            onClick={() => captureImage(true)}
          >
            <ImagePlus size={15} />
            Include view in report
          </button>
        </div>
      </div>
      {draft.bridge.blockage > 0 && (
        <p className="studio-note">
          Blockage {draft.bridge.blockage}% is a uniform area reduction in the
          calculation. No debris shape is inferred.
        </p>
      )}
      <details className="studio-evidence">
        <summary>
          <div>
            <h3>Hydraulic profile & section results</h3>
            <p>The calculated evidence behind this view</p>
          </div>
          <ChevronDown size={18} />
        </summary>
        {result?.status === "ok" ? (
          <>
            <HydraulicProfile inputs={draft} result={result} />
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Section</th>
                    <th>Distance m</th>
                    <th>Water level m</th>
                    <th>Energy level m</th>
                    <th>Velocity m/s</th>
                    <th>Froude</th>
                  </tr>
                </thead>
                <tbody>
                  {result.bridge.map((s, i) => (
                    <tr key={i}>
                      <td>{draft.sections[i].name}</td>
                      <td>{fmt(reachStations(draft)[i], 1)}</td>
                      <td>{fmt(s.wsel)}</td>
                      <td>{fmt(s.energy)}</td>
                      <td>{fmt(s.velocity)}</td>
                      <td>{fmt(s.froude)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="studio-note">
            A supported calculation is needed to display the profile.
          </p>
        )}
        <p className="studio-note">
          Terrain and water interpolate between four sections. Dense surveys are
          simplified for display only. Surface animation is not a velocity-field
          simulation.
        </p>
      </details>
      <details className="studio-evidence">
        <summary>
          <div>
            <h3>Parameter sweep</h3>
            <p>Compare a range of openings or blockage levels</p>
          </div>
          <ChevronDown size={18} />
        </summary>
        <ParameterSweep
          project={p}
          onSelectCase={(run) => {
            edit(structuredClone(run.inputs));
            setPreview(run);
            setCompleted(run);
            setRoughness(1);
            setDischarge(1);
            notify(
              "Sweep case loaded into the preview. Apply to project to keep it.",
            );
          }}
        />
      </details>
    </section>
  );
}
