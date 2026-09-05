"use client";
import type { Run } from "../model";
import { fmt } from "../report";
export type SweepRow = { value: number; run: Run | null; error: string };
export function SweepChart({
  rows,
  parameter,
  afflux,
  freeboard,
  disabled,
  onSelect,
}: {
  rows: SweepRow[];
  parameter: string;
  afflux: number;
  freeboard: number;
  disabled: boolean;
  onSelect: (run: Run) => void;
}) {
  if (rows.length < 2) return null;
  const min = rows[0].value,
    max = rows[rows.length - 1].value;
  return (
    <div className="sweep-charts">
      {(["afflux", "freeboard"] as const).map((metric) => {
        const criterion = metric === "afflux" ? afflux : freeboard;
        const values = rows.map((row) =>
          row.run?.results.every((r) => r.status === "ok")
            ? metric === "afflux"
              ? Math.max(...row.run.results.map((r) => r.afflux!))
              : Math.min(...row.run.results.map((r) => r.freeboard!))
            : null,
        );
        const finite = values.filter((v): v is number => v !== null);
        const bottom = Math.min(0, ...finite, criterion),
          top = Math.max(0.01, ...finite, criterion) * 1.12;
        const x = (v: number) => 56 + ((v - min) / (max - min)) * 344;
        const y = (v: number) => 166 - ((v - bottom) / (top - bottom)) * 124;
        let path = "",
          connect = false;
        values.forEach((value, i) => {
          if (value === null) {
            connect = false;
            return;
          }
          path += `${connect ? "L" : "M"}${x(rows[i].value)},${y(value)} `;
          connect = true;
        });
        return (
          <svg
            key={metric}
            viewBox="0 0 430 220"
            role="group"
            aria-label={`${metric === "afflux" ? "Maximum afflux" : "Minimum freeboard"} across all events by ${parameter}`}
          >
            <text x={14} y={19} className="sweep-title">
              {metric === "afflux" ? "Maximum afflux" : "Minimum freeboard"} · m
            </text>
            {[0, 0.5, 1].map((t) => {
              const v = bottom + (top - bottom) * t;
              return (
                <g key={t}>
                  <line x1={56} x2={400} y1={y(v)} y2={y(v)} stroke="#304753" />
                  <text x={48} y={y(v) + 3} textAnchor="end">
                    {fmt(v, 2)}
                  </text>
                </g>
              );
            })}
            <line
              x1={56}
              x2={400}
              y1={y(criterion)}
              y2={y(criterion)}
              stroke="#d6b67b"
              strokeDasharray="4 4"
            />
            <text
              x={400}
              y={y(criterion) - 6}
              textAnchor="end"
              className="sweep-criterion"
            >
              Criterion {fmt(criterion, 2)}
            </text>
            <path d={path} fill="none" stroke="#70c9c5" strokeWidth={2} />
            {rows.map((row, i) => (
              <g key={row.value}>
                {values[i] !== null ? (
                  <circle
                    cx={x(row.value)}
                    cy={y(values[i]!)}
                    r={4}
                    fill="#a9e5dc"
                    stroke="#173c47"
                    strokeWidth={2}
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    aria-disabled={disabled}
                    aria-label={`Preview ${parameter} ${fmt(row.value, 2)}, ${metric} ${fmt(values[i])} metres`}
                    onClick={() => {
                      if (!disabled && row.run) onSelect(row.run);
                    }}
                    onKeyDown={(e) => {
                      if (
                        !disabled &&
                        row.run &&
                        (e.key === "Enter" || e.key === " ")
                      ) {
                        e.preventDefault();
                        onSelect(row.run);
                      }
                    }}
                  >
                    <title>
                      {fmt(row.value, 2)}: {fmt(values[i])} m
                    </title>
                  </circle>
                ) : (
                  <text
                    x={x(row.value)}
                    y={166}
                    textAnchor="middle"
                    fill="#eea89a"
                  >
                    ×<title>Outside model range</title>
                  </text>
                )}
                {(i === 0 ||
                  i === rows.length - 1 ||
                  i === Math.floor(rows.length / 2)) && (
                  <text x={x(row.value)} y={187} textAnchor="middle">
                    {fmt(row.value, 1)}
                  </text>
                )}
              </g>
            ))}
            <text x={228} y={209} textAnchor="middle">
              {parameter === "width" ? "Opening width · m" : "Blockage · %"}
            </text>
          </svg>
        );
      })}
    </div>
  );
}
