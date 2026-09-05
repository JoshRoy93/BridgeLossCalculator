import type { FlowResult, Inputs } from "../model";
import { reachStations } from "../scene-geometry";
import { fmt } from "../report";

export function HydraulicProfile({
  inputs,
  result,
}: {
  inputs: Inputs;
  result: FlowResult;
}) {
  if (result.status !== "ok") return null;
  const distances = reachStations(inputs);
  const ground = inputs.sections.map((s) =>
    Math.min(...s.points.map((p) => p.elevation)),
  );
  const low = Math.min(...ground) - 0.2;
  const high =
    Math.max(inputs.bridge.deck, ...result.bridge.map((s) => s.energy)) + 0.5;
  const x = (i: number) => 75 + (distances[i] / distances[3]) * 770;
  const y = (value: number) => 270 - ((value - low) / (high - low)) * 230;
  const points = (values: number[]) =>
    values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  return (
    <section className="hydraulic-profile">
      <h3>Longitudinal water and energy profile</h3>
      <p className="muted">
        Downstream exit at left, upstream approach at right. Flow travels right
        to left. Elevations use the project datum.
      </p>
      <svg
        viewBox="0 0 900 325"
        role="img"
        aria-label={`Water and energy levels for ${result.name}`}
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const level = low + ((high - low) * i) / 4;
          return (
            <g key={i}>
              <line
                x1={75}
                x2={845}
                y1={y(level)}
                y2={y(level)}
                stroke="#dce3dd"
              />
              <text x={65} y={y(level) + 4} textAnchor="end" fontSize={12}>
                {fmt(level, 2)} m
              </text>
            </g>
          );
        })}
        <polygon
          points={`${x(0)},270 ${points(ground)} ${x(3)},270`}
          fill="var(--drawing-ground)"
        />
        <polyline
          points={points(ground)}
          stroke="var(--drawing-outline)"
          fill="none"
          strokeWidth={2}
        />
        <rect
          x={x(1)}
          y={y(inputs.bridge.deck)}
          width={x(2) - x(1)}
          height={y(inputs.bridge.soffit) - y(inputs.bridge.deck)}
          fill="var(--drawing-structure)"
        />
        <polyline
          points={points(result.natural.map((s) => s.wsel))}
          stroke="var(--muted)"
          strokeDasharray="4 4"
          fill="none"
          strokeWidth={2}
        />
        <polyline
          points={points(result.bridge.map((s) => s.wsel))}
          stroke="var(--drawing-water)"
          fill="none"
          strokeWidth={3}
        />
        <polyline
          points={points(result.bridge.map((s) => s.energy))}
          stroke="var(--warning)"
          strokeDasharray="7 4"
          fill="none"
          strokeWidth={2}
        />
        {distances.map((d, i) => (
          <g key={i}>
            <line
              x1={x(i)}
              x2={x(i)}
              y1={40}
              y2={280}
              stroke="#abbcaf"
              strokeDasharray="2 5"
            />
            <text x={x(i)} y={299} textAnchor="middle" fontSize={12}>
              Section {i + 1}
            </text>
            <text x={x(i)} y={316} textAnchor="middle" fontSize={11}>
              {fmt(d, 1)} m
            </text>
          </g>
        ))}
      </svg>
      <p className="profile-legend">
        <span>Water level</span>
        <span>Energy level</span>
        <span>Bridge-free water level</span>
      </p>
    </section>
  );
}
