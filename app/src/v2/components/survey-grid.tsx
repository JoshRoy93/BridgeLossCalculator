"use client";
import { useId, useRef, useState } from "react";
import { Download, Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import type { Project } from "../model";
import { downloadFile } from "../report";
import {
  pasteSurveyCells,
  readSurveyCells,
  surveyErrors,
  type SurveyRow,
} from "../survey-grid";

export function SurveyGrid({
  project,
  section,
  update,
  notify,
}: {
  project: Project;
  section: number;
  update: (project: Project) => void;
  notify: (message: string) => void;
}) {
  const applied = () =>
    project.inputs.sections[section].points.map(
      (p): SurveyRow => [String(p.station), String(p.elevation)],
    );
  const [rows, setRows] = useState<SurveyRow[]>(applied);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const table = useRef<HTMLTableElement>(null);
  const id = useId();
  const errors = surveyErrors(rows);
  const valid = rows.length >= 3 && Object.keys(errors).length === 0;
  const csv = () =>
    `station,elevation\n${rows.map((r) => r.join(",")).join("\n")}`;
  function change(next: SurveyRow[]) {
    setRows(next);
    setDirty(true);
    setMessage("");
  }
  function focus(row: number, column: number) {
    requestAnimationFrame(() =>
      table.current
        ?.querySelector<HTMLInputElement>(`[data-cell="${row}-${column}"]`)
        ?.focus(),
    );
  }
  function add(after = rows.length - 1) {
    if (rows.length >= 2000) return;
    const next = [...rows];
    next.splice(after + 1, 0, ["", ""]);
    change(next);
    focus(after + 1, 0);
  }
  return (
    <div className="survey-grid" data-unsaved={dirty}>
      <div className="editor-toolbar">
        <div>
          <h3>Survey coordinates</h3>
          <p className="muted">{rows.length} points · metres</p>
        </div>
        <label className="button secondary file-button">
          <Upload size={15} />
          Import CSV
          <input
            aria-label="Import survey CSV"
            type="file"
            accept=".csv,.tsv,text/csv,text/tab-separated-values"
            onChange={async (e) => {
              const input = e.currentTarget,
                file = input.files?.[0];
              if (!file) return;
              try {
                if (file.size > 200000)
                  throw new Error("Survey CSV must be smaller than 200 KB.");
                const cells = readSurveyCells(await file.text());
                if (cells[0].length !== 2)
                  throw new Error("Import two columns: station and elevation.");
                change(cells.map((row) => [row[0], row[1]]));
                setMessage(
                  "File loaded. Review the table, then apply the coordinates.",
                );
              } catch (err) {
                setMessage(
                  err instanceof Error ? err.message : "Could not read CSV.",
                );
              }
              input.value = "";
            }}
          />
        </label>
      </div>
      <p className="grid-help" id={`${id}-help`}>
        Type in the cells, or paste CSV / spreadsheet columns into a station
        cell. Enter moves down; Tab moves across.
      </p>
      <div className="table-scroll grid-scroll">
        <table
          ref={table}
          className="coordinate-table"
          aria-label="Survey coordinates"
          aria-describedby={`${id}-help`}
        >
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">
                Station <small>m</small>
              </th>
              <th scope="col">
                Elevation <small>m</small>
              </th>
              <th scope="col">
                <span className="sr-only">Row actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <th scope="row">{i + 1}</th>
                {row.map((value, j) => (
                  <td key={j}>
                    <input
                      aria-label={`Row ${i + 1} ${j === 0 ? "station" : "elevation"}`}
                      inputMode="decimal"
                      value={value}
                      data-cell={`${i}-${j}`}
                      aria-invalid={!!errors[`${i}-${j}`]}
                      aria-describedby={
                        errors[`${i}-${j}`] ? `${id}-${i}-${j}` : undefined
                      }
                      onChange={(e) => {
                        const next = rows.map((r) => [...r] as SurveyRow);
                        next[i][j] = e.target.value;
                        change(next);
                      }}
                      onPaste={(e) => {
                        const text = e.clipboardData.getData("text");
                        if (!/[\t\r\n,]/.test(text)) return;
                        e.preventDefault();
                        try {
                          const cells = readSurveyCells(text);
                          change(pasteSurveyCells(rows, cells, i, j));
                          setMessage(
                            `${cells.length} rows pasted. Review, then apply the coordinates.`,
                          );
                        } catch (err) {
                          setMessage(
                            err instanceof Error
                              ? err.message
                              : "Paste failed.",
                          );
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.ctrlKey || e.metaKey || e.altKey) return;
                        if (e.key === "Enter" || e.key === "ArrowDown") {
                          e.preventDefault();
                          if (i < rows.length - 1) focus(i + 1, j);
                          else if (e.key === "Enter") add();
                        }
                        if (e.key === "ArrowUp") {
                          e.preventDefault();
                          focus(Math.max(0, i - 1), j);
                        }
                        if (e.key === "Tab") {
                          if (e.shiftKey && (j > 0 || i > 0)) {
                            e.preventDefault();
                            focus(j ? i : i - 1, j ? 0 : 1);
                          } else if (
                            !e.shiftKey &&
                            (j === 0 || i < rows.length - 1)
                          ) {
                            e.preventDefault();
                            focus(j ? i + 1 : i, j ? 0 : 1);
                          } else if (
                            !e.shiftKey &&
                            rows.length < 2000 &&
                            row.every((v) => v.trim())
                          ) {
                            e.preventDefault();
                            add();
                          }
                        }
                      }}
                    />
                    {errors[`${i}-${j}`] && (
                      <span className="cell-error" id={`${id}-${i}-${j}`}>
                        {errors[`${i}-${j}`]}
                      </span>
                    )}
                  </td>
                ))}
                <td className="row-actions">
                  <button
                    className="icon-button"
                    aria-label={`Insert row after ${i + 1}`}
                    title="Insert row below"
                    disabled={rows.length >= 2000}
                    onClick={() => add(i)}
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Remove survey row ${i + 1}`}
                    title="Remove row"
                    disabled={rows.length <= 1}
                    onClick={() =>
                      change(rows.filter((_, index) => index !== i))
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid-row-toolbar">
        <button
          className="button quiet"
          disabled={rows.length >= 2000}
          onClick={() => add()}
        >
          <Plus size={15} />
          Add point
        </button>
        <button
          className="button quiet"
          disabled={!valid}
          onClick={() =>
            downloadFile("survey-coordinates.csv", csv(), "text/csv")
          }
        >
          <Download size={15} />
          Export CSV
        </button>
      </div>
      {message && (
        <p className="grid-message" role="status">
          {message}
        </p>
      )}
      {rows.length < 3 && (
        <p className="cell-error">Enter at least three survey points.</p>
      )}
      <div className="grid-apply inline-actions">
        <button
          className="button primary"
          disabled={!dirty || !valid}
          onClick={() => {
            update({
              ...project,
              inputs: {
                ...project.inputs,
                sections: project.inputs.sections.map((s, i) =>
                  i === section
                    ? {
                        ...s,
                        points: rows.map(([station, elevation]) => ({
                          station: Number(station),
                          elevation: Number(elevation),
                        })),
                      }
                    : s,
                ),
              },
            });
            setDirty(false);
            setMessage("");
            notify(`${rows.length} survey points applied.`);
          }}
        >
          Apply coordinates
        </button>
        {dirty && (
          <button
            className="button quiet"
            onClick={() => {
              setRows(applied());
              setDirty(false);
              setMessage("");
            }}
          >
            <RotateCcw size={14} />
            Revert
          </button>
        )}
        <span className={`grid-state ${dirty ? "pending" : ""}`}>
          {dirty ? "Unapplied edits" : "Coordinates applied"}
        </span>
      </div>
      <p className="muted">
        The drawing and calculation use applied coordinates.
      </p>
    </div>
  );
}
