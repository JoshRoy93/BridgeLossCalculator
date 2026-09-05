"use client";
import { useEffect, useRef, useState } from "react";
import { createProject, type Project, type Run, type Workspace } from "./model";
import { parseWorkspace } from "./io";
export const STORAGE_KEY = "blc.workspace.v2";
export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [storageError, setStorageError] = useState("");
  const [saved, setSaved] = useState(false);
  const last = useRef<string | null>(null);
  const blocked = useRef(false);
  const rawRecovery = useRef("");
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        last.current = raw;
        if (raw) {
          rawRecovery.current = raw;
          setWorkspace(parseWorkspace(raw));
        } else {
          const p = createProject(true);
          setWorkspace({
            format: "blc-workspace",
            version: 2,
            projects: [p],
            activeId: p.id,
          });
        }
      } catch (e) {
        blocked.current = true;
        setStorageError(
          `The saved workspace could not be opened. ${e instanceof Error ? e.message : ""} Download a recovery copy before starting a new workspace.`,
        );
        const p = createProject();
        setWorkspace({
          format: "blc-workspace",
          version: 2,
          projects: [p],
          activeId: p.id,
        });
      }
    });
    const changed = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        blocked.current = true;
        setSaved(false);
        setStorageError(
          "Another tab changed this workspace. Download your current project, then reload to open the other tab’s saved version.",
        );
      }
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, []);
  useEffect(() => {
    if (!workspace || blocked.current) return;
    const timer = setTimeout(() => {
      try {
        if (localStorage.getItem(STORAGE_KEY) !== last.current) {
          blocked.current = true;
          throw new Error(
            "Another tab changed the saved workspace. Download your current project and reload.",
          );
        }
        const next = JSON.stringify(workspace);
        localStorage.setItem(STORAGE_KEY, next);
        last.current = next;
        setSaved(true);
        setStorageError("");
      } catch (e) {
        setSaved(false);
        setStorageError(
          `Changes are only in memory. ${e instanceof Error ? e.message : "Browser storage failed."} Download a project backup.`,
        );
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [workspace]);
  useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => {
      if (!saved || document.querySelector('[data-unsaved="true"]')) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [saved]);
  function update(project: Project) {
    setSaved(false);
    setWorkspace((w) =>
      w
        ? {
            ...w,
            projects: w.projects.map((p) =>
              p.id === project.id
                ? { ...project, updated: new Date().toISOString() }
                : p,
            ),
          }
        : w,
    );
  }
  function add(project: Project) {
    if ((workspace?.projects.length ?? 0) >= 30)
      throw new Error(
        "This workspace has 30 projects. Export and remove an old project first.",
      );
    setSaved(false);
    setWorkspace((w) =>
      w
        ? { ...w, projects: [...w.projects, project], activeId: project.id }
        : w,
    );
  }
  function recordRun(id: string, run: Run) {
    setSaved(false);
    setWorkspace((w) =>
      w
        ? {
            ...w,
            projects: w.projects.map((p) =>
              p.id === id
                ? { ...p, run, review: null, updated: new Date().toISOString() }
                : p,
            ),
          }
        : w,
    );
  }
  function select(id: string) {
    setSaved(false);
    setWorkspace((w) => (w ? { ...w, activeId: id } : w));
  }
  function remove(id: string) {
    setSaved(false);
    setWorkspace((w) => {
      if (!w || w.projects.length < 2) return w;
      const projects = w.projects.filter((p) => p.id !== id);
      return {
        ...w,
        projects,
        activeId: w.activeId === id ? projects[0].id : w.activeId,
      };
    });
  }
  function startFresh() {
    try {
      last.current = localStorage.getItem(STORAGE_KEY);
      blocked.current = false;
      const p = createProject();
      setSaved(false);
      setWorkspace({
        format: "blc-workspace",
        version: 2,
        projects: [p],
        activeId: p.id,
      });
    } catch {
      setStorageError(
        "Browser storage is unavailable. Enable storage for this site, or continue with JSON backups.",
      );
    }
  }
  return {
    workspace,
    update,
    recordRun,
    add,
    select,
    remove,
    saved,
    storageError,
    recovery: () => rawRecovery.current,
    startFresh,
  };
}
