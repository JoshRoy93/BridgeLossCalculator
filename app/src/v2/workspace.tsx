"use client";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileText,
  FolderOpen,
  GitCompareArrows,
  Layers3,
  MapPin,
  Play,
  Plus,
  Settings2,
  Trash2,
  Waves,
  X,
} from "lucide-react";
import { validate } from "./hydraulics";
import { runCalculation } from "./run-calculation";
import { createProject, currentRun, type Project } from "./model";
import { exportProject, importLegacy, importProject } from "./io";
import { downloadFile, filename } from "./report";
import { useWorkspace } from "./use-workspace";
import {
  BridgeEditor,
  FlowEditor,
  GeometryEditor,
  ProjectEditor,
} from "./components/editors";
import {
  Overview,
  Report,
  Results,
  Review,
  Scenarios,
} from "./components/results";
import "./workspace.css";
import { Simulation } from "./components/simulation";
import { Hydrology } from "./components/hydrology";
import { assessmentSteps, inputIssuePage } from "./guidance";
import { StepActions, WorkflowGuide } from "./components/workflow-guide";
import { DemoGallery, DemoSourceBasis } from "./components/demo-gallery";
import { createDemoProject } from "./demo-bridges";

const pages = [
  { id: "overview", name: "Overview", icon: Activity, group: "Workspace" },
  { id: "examples", name: "Example bridges", icon: BookOpen },
  {
    id: "project",
    name: "Project details",
    icon: MapPin,
    group: "Assessment steps",
  },
  { id: "geometry", name: "Survey sections", icon: Layers3 },
  { id: "bridge", name: "Bridge & losses", icon: Settings2 },
  { id: "flows", name: "Flow events", icon: Waves },
  { id: "results", name: "Results & checks", icon: Activity },
  { id: "review", name: "Engineering review", icon: ClipboardCheck },
  { id: "report", name: "Report & export", icon: FileText },
  {
    id: "hydrology",
    name: "Hydrology helper",
    icon: Waves,
    group: "Optional tools",
  },
  { id: "simulation", name: "3D & what-if", icon: Layers3 },
  { id: "scenarios", name: "Alternatives", icon: GitCompareArrows },
];
export function Workspace() {
  const {
    workspace,
    update,
    recordRun,
    add,
    select,
    remove,
    saved,
    storageError,
    recovery,
    startFresh,
  } = useWorkspace();
  const [page, setPage] = useState("overview"),
    [message, setMessage] = useState(""),
    [errors, setErrors] = useState<string[]>([]),
    [pendingPage, setPendingPage] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const p = workspace?.projects.find((p) => p.id === workspace.activeId);
  useEffect(() => {
    document.getElementById("main-workspace")?.focus({ preventScroll: true });
  }, [page, p?.id]);
  function navigate(target: string) {
    if (target === page) return;
    if (document.querySelector('[data-unsaved="true"]')) {
      setPendingPage(target);
      window.scrollTo({ top: 0 });
      return;
    }
    openPage(target);
  }
  function openPage(target: string) {
    setPendingPage(null);
    setPage(target);
    setMessage("");
    setErrors([]);
    window.scrollTo({ top: 0 });
  }
  function change(project: Project) {
    update(project);
    setErrors([]);
  }
  async function run() {
    if (!p || busy) return;
    const invalid =
      document.querySelector<HTMLInputElement>(".blc input:invalid");
    if (invalid) {
      setMessage(
        "Calculation needs a valid value in the highlighted field. Correct it below. You can still visit other steps.",
      );
      invalid.reportValidity();
      invalid.focus();
      return;
    }
    if (document.querySelector('[data-unsaved="true"]')) {
      setMessage(
        "These edits have not been applied to the project. Use Apply coordinates for survey edits, or Apply to project for what-if inputs. Revert or reset them to calculate the saved inputs.",
      );
      window.scrollTo({ top: 0 });
      return;
    }
    const errors = validate(p.inputs);
    setErrors(errors);
    if (errors.length) {
      setMessage("Resolve the input checks below before running.");
      window.scrollTo({ top: 0 });
      return;
    }
    setBusy(true);
    try {
      const result = await runCalculation(p.inputs);
      recordRun(p.id, result);
      setPage("results");
      window.scrollTo({ top: 0 });
      const unsupported = result.results.filter(
        (r) => r.status !== "ok",
      ).length;
      setMessage(
        unsupported
          ? `Run complete. ${unsupported} event${unsupported === 1 ? "" : "s"} outside the model range. Inspect Results & checks.`
          : `Run complete. ${result.results.length} events calculated and recorded.`,
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Calculation failed.");
    } finally {
      setBusy(false);
    }
  }
  async function readProject(file: File, legacy = false) {
    try {
      if (file.size > 32_000_000)
        throw new Error("Project file must be smaller than 32 MB.");
      const project = legacy
        ? importLegacy(await file.text())
        : importProject(await file.text());
      add(project);
      setPage("project");
      setMessage(
        legacy
          ? project.purpose
          : "Project imported separately. Saved calculations were recomputed; review completion was cleared.",
      );
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Could not read project file.",
      );
    }
  }
  if (!workspace || !p)
    return (
      <div className="blc loading-workspace">
        <Waves size={32} />
        <h1>Bridge Loss Calculator</h1>
        <p>Opening your workspace…</p>
      </div>
    );
  const props = { project: p, update: change, notify: setMessage };
  const inputIssues = validate(p.inputs);
  const active = pages.find((item) => item.id === page);
  return (
    <div className="blc">
      <a className="skip-link" href="#main-workspace">
        Skip to workspace
      </a>
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => navigate("overview")}
          aria-label="Bridge Loss Calculator overview"
        >
          <span className="brand-mark">
            <Waves size={25} />
          </span>
          <span>
            Bridge Loss
            <small>
              CALCULATOR <b>V2</b>
            </small>
          </span>
        </button>
        <button
          className={`project-switch ${page === "library" ? "selected" : ""}`}
          onClick={() => navigate("library")}
        >
          <FolderOpen size={17} />
          <span>
            <small>LOCAL PROJECT</small>
            <strong>{p.name || "Untitled assessment"}</strong>
          </span>
          <ChevronRight size={15} />
        </button>
        <nav aria-label="Assessment navigation">
          {pages.map((item) => (
            <div key={item.id}>
              {item.group && <div className="nav-group">{item.group}</div>}
              <button
                className={page === item.id ? "active" : ""}
                aria-current={page === item.id ? "page" : undefined}
                onClick={() => navigate(item.id)}
              >
                {assessmentSteps.some((step) => step.page === item.id) ? (
                  <span className="nav-step">
                    {assessmentSteps.findIndex(
                      (step) => step.page === item.id,
                    ) + 1}
                  </span>
                ) : (
                  <item.icon size={17} />
                )}
                <span>{item.name}</span>
                {page === item.id && <i />}
              </button>
            </div>
          ))}
        </nav>
        <label className="mobile-step-nav">
          <span>Go to step or tool</span>
          <select
            aria-label="Go to step or tool"
            value={page}
            onChange={(e) => navigate(e.target.value)}
          >
            <option value="overview">Overview</option>
            <option value="examples">Example bridges</option>
            <optgroup label="Assessment steps">
              {assessmentSteps.map((step, i) => (
                <option key={step.page} value={step.page}>
                  {i + 1}. {step.title}
                </option>
              ))}
            </optgroup>
            <optgroup label="Optional tools">
              {pages
                .filter((item) =>
                  ["hydrology", "simulation", "scenarios"].includes(item.id),
                )
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </optgroup>
            <option value="library">Your assessments</option>
          </select>
        </label>
        <div className="sidebar-bottom">
          <BookOpen size={18} />
          <div>
            <strong>Free-surface assessment</strong>
            <p>SI units · four-section energy model</p>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{active?.name ?? "Projects"}</strong>
          </div>
          <div className="top-actions">
            <span className={`save-status ${saved ? "" : "pending"}`}>
              <span />
              {saved ? "Saved locally" : "Unsaved changes"}
            </span>
            <button
              className="button secondary backup"
              onClick={() =>
                downloadFile(
                  `${filename(p)}.blc.json`,
                  exportProject(p),
                  "application/json",
                )
              }
            >
              <ArrowDownToLine size={15} />
              Backup
            </button>
            {page !== "library" && page !== "examples" && (
              <button className="button primary" disabled={busy} onClick={run}>
                <Play size={15} fill="currentColor" />
                {busy ? "Calculating…" : "Run assessment"}
              </button>
            )}
          </div>
        </header>
        <main id="main-workspace" tabIndex={-1} className="workspace-content">
          {pendingPage && (
            <div className="notice draft-notice" role="alert">
              <div>
                <strong>You have unapplied edits on this step</strong>
                <p>
                  Apply or revert them before leaving. Leaving now discards only
                  these drafts; applied project values are kept.
                </p>
              </div>
              <button
                className="button secondary"
                onClick={() => setPendingPage(null)}
              >
                Stay and edit
              </button>
              <button
                className="button quiet"
                onClick={() => openPage(pendingPage)}
              >
                Discard drafts and leave
              </button>
            </div>
          )}
          {storageError && (
            <div className="notice error" role="alert">
              {storageError}
              {recovery() && (
                <button
                  className="button secondary"
                  onClick={() =>
                    downloadFile(
                      "blc-workspace-recovery.json",
                      recovery(),
                      "application/json",
                    )
                  }
                >
                  Download recovery copy
                </button>
              )}
              <button
                className="button secondary"
                onClick={() => {
                  if (
                    !window.confirm(
                      "Start a new workspace and replace the saved browser data? Download the recovery copy and any unsaved project before continuing.",
                    )
                  )
                    return;
                  startFresh();
                  setPage("project");
                }}
              >
                Start fresh workspace
              </button>
            </div>
          )}
          {message && (
            <div className="notice feedback" role="status">
              <span>{message}</span>
              <button
                className="icon-button"
                aria-label="Dismiss notification"
                onClick={() => setMessage("")}
              >
                <X size={15} />
              </button>
            </div>
          )}
          {errors.length > 0 && (
            <div className="notice error" role="alert">
              <strong>Input checks</strong>
              <ul>
                {errors.map((error) => (
                  <li key={error}>
                    <button
                      className="issue-link"
                      onClick={() => navigate(inputIssuePage(error))}
                    >
                      {error}
                      <ChevronRight size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {p.run && !currentRun(p) && page !== "library" && (
            <div className="stale-banner">
              <Activity size={15} />
              Inputs changed. Run again to update results and review status.
            </div>
          )}
          <div className="workspace-page" key={`${p.id}-${page}`}>
            {page === "examples" && (
              <DemoGallery
                load={(id) => {
                  try {
                    add(createDemoProject(id));
                    openPage("overview");
                    setMessage(
                      "Example loaded as a separate assessment. Review its source record, then run the flow cases or explore the 3D model.",
                    );
                  } catch (error) {
                    setMessage(
                      error instanceof Error
                        ? error.message
                        : "Could not load example.",
                    );
                  }
                }}
              />
            )}
            {p.demoBasis &&
              !["library", "examples", "simulation"].includes(page) && (
                <DemoSourceBasis basis={p.demoBasis} inputs={p.inputs} />
              )}
            <WorkflowGuide
              project={p}
              page={page}
              navigate={navigate}
              run={run}
              busy={busy}
              issues={inputIssues}
            />
            {page === "overview" && (
              <Overview project={p} navigate={navigate} />
            )}
            {page === "project" && <ProjectEditor {...props} />}
            {page === "geometry" && <GeometryEditor {...props} />}
            {page === "bridge" && <BridgeEditor {...props} />}
            {page === "flows" && <FlowEditor {...props} />}
            {page === "hydrology" && <Hydrology {...props} />}
            {page === "results" && <Results {...props} navigate={navigate} />}
            {page === "simulation" && <Simulation {...props} />}
            {page === "scenarios" && <Scenarios {...props} />}
            {page === "review" && <Review {...props} navigate={navigate} />}
            {page === "report" && <Report {...props} />}
            {page === "library" && (
              <>
                <div className="section-heading with-action">
                  <div>
                    <span className="eyebrow">Local workspace</span>
                    <h2>Your assessments</h2>
                    <p>
                      Saved in this browser. Import a project file to continue
                      work from another computer.
                    </p>
                  </div>
                  <button
                    className="button primary"
                    onClick={() => {
                      try {
                        add(createProject());
                        setPage("project");
                      } catch (e) {
                        setMessage(String(e));
                      }
                    }}
                  >
                    <Plus size={16} />
                    New assessment
                  </button>
                </div>
                <div className="library-actions">
                  <button
                    className="button secondary"
                    onClick={() => navigate("examples")}
                  >
                    <BookOpen size={16} />
                    Browse bridge examples
                  </button>
                  <label className="button secondary file-button">
                    <FolderOpen size={16} />
                    Open v2 project
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void readProject(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <label className="button quiet file-button">
                    Migrate legacy JSON
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void readProject(file, true);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <button
                    className="button quiet"
                    onClick={() => {
                      try {
                        add(createProject(true));
                        setPage("overview");
                      } catch (e) {
                        setMessage(String(e));
                      }
                    }}
                  >
                    Load synthetic example
                  </button>
                </div>
                <div className="project-list">
                  {workspace.projects.map((project) => (
                    <div className="project-row" key={project.id}>
                      <button
                        onClick={() => {
                          select(project.id);
                          setPage("overview");
                          setErrors([]);
                        }}
                      >
                        <span className="project-symbol">
                          <Waves size={24} />
                        </span>
                        <span>
                          <strong>
                            {project.name || "Untitled assessment"}
                          </strong>
                          <small>
                            {project.reference || "No reference"} ·{" "}
                            {project.inputs.flows.length} events ·{" "}
                            {new Date(project.updated).toLocaleDateString(
                              "en-AU",
                            )}
                          </small>
                        </span>
                        <span className="project-current">
                          {project.id === p.id ? (
                            <Check size={16} />
                          ) : (
                            <ArrowUpRight size={17} />
                          )}
                        </span>
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Delete ${project.name}`}
                        disabled={workspace.projects.length < 2}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete "${project.name}" from this browser? Download its JSON backup first if you need to retain it.`,
                            )
                          )
                            remove(project.id);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="note">
                  Legacy migration converts v1 internal feet and cfs to SI. It
                  repeats the single survey across four sections and requires
                  you to confirm geometry, roughness and boundaries. Native
                  HEC-RAS files are not supported; use exported CSV survey and
                  comparison tables.
                </div>
                <button
                  className="button quiet"
                  onClick={() => navigate("overview")}
                >
                  <ArrowLeft size={15} />
                  Back to assessment
                </button>
              </>
            )}
          </div>
          <StepActions
            project={p}
            page={page}
            navigate={navigate}
            run={run}
            busy={busy}
          />
          <footer className="workspace-footer">
            <span>BLC v2 · Engineering screening</span>
            <span>
              {p.datum || "Vertical datum not set"} · All values in SI
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
