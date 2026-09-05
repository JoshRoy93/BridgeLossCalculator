"use client";
import { useState } from "react";
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

const pages = [
  { id: "overview", name: "Overview", icon: Activity, group: "Workspace" },
  { id: "project", name: "Project details", icon: MapPin, group: "Define" },
  { id: "geometry", name: "Survey sections", icon: Layers3 },
  { id: "bridge", name: "Bridge & losses", icon: Settings2 },
  { id: "flows", name: "Flow events", icon: Waves },
  { id: "results", name: "Results & checks", icon: Activity, group: "Assess" },
  { id: "scenarios", name: "Alternatives", icon: GitCompareArrows },
  { id: "review", name: "Engineering review", icon: ClipboardCheck },
  { id: "report", name: "Report & export", icon: FileText },
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
    [busy, setBusy] = useState(false);
  const p = workspace?.projects.find((p) => p.id === workspace.activeId);
  function navigate(target: string) {
    const invalid =
      document.querySelector<HTMLInputElement>(".blc input:invalid");
    if (invalid) {
      invalid.reportValidity();
      invalid.focus();
      return;
    }
    if (
      document.querySelector('[data-unsaved="true"]') &&
      !window.confirm(
        "Discard the unapplied survey coordinates? Apply them first to keep them.",
      )
    )
      return;
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
      invalid.reportValidity();
      invalid.focus();
      return;
    }
    if (document.querySelector('[data-unsaved="true"]')) {
      setMessage("Apply the survey coordinates before running the assessment.");
      return;
    }
    const errors = validate(p.inputs);
    setErrors(errors);
    if (errors.length) {
      setMessage("Resolve the input checks below before running.");
      return;
    }
    setBusy(true);
    try {
      const result = await runCalculation(p.inputs);
      recordRun(p.id, result);
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
                <item.icon size={17} />
                <span>{item.name}</span>
                {page === item.id && <i />}
              </button>
            </div>
          ))}
        </nav>
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
            <button
              className="button primary"
              disabled={busy || page === "library"}
              onClick={run}
            >
              <Play size={15} fill="currentColor" />
              {busy ? "Calculating…" : "Run assessment"}
            </button>
          </div>
        </header>
        <main id="main-workspace" tabIndex={-1} className="workspace-content">
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
                  <li key={error}>{error}</li>
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
            {page === "overview" && (
              <Overview project={p} navigate={navigate} />
            )}
            {page === "project" && <ProjectEditor {...props} />}
            {page === "geometry" && <GeometryEditor {...props} />}
            {page === "bridge" && <BridgeEditor {...props} />}
            {page === "flows" && <FlowEditor {...props} />}
            {page === "results" && <Results {...props} />}
            {page === "scenarios" && <Scenarios {...props} />}
            {page === "review" && <Review {...props} />}
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
                    Load worked example
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
