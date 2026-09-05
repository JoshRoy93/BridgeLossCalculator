import {
  ENGINE_VERSION,
  inputKey,
  uid,
  type Inputs,
  type Point,
  type Properties,
  type Run,
  type Step,
} from "./model";

export const GRAVITY = 9.80665;
export const TOLERANCE = 0.00001;
export function bedAt(points: Point[], station: number): number {
  if (station <= points[0].station) return points[0].elevation;
  for (let i = 1; i < points.length; i++) {
    if (station <= points[i].station) {
      const a = points[i - 1],
        b = points[i];
      return (
        a.elevation +
        ((b.elevation - a.elevation) * (station - a.station)) /
          (b.station - a.station)
      );
    }
  }
  return points[points.length - 1].elevation;
}

// Integrate submerged portions of the piecewise-linear survey, including slopes.
export function wetted(
  points: Point[],
  level: number,
): { area: number; perimeter: number; topWidth: number } {
  let area = 0,
    perimeter = 0,
    topWidth = 0;
  for (let i = 1; i < points.length; i++) {
    let a = points[i - 1],
      b = points[i];
    if (a.elevation >= level && b.elevation >= level) continue;
    if (a.elevation > level)
      a = {
        station:
          a.station +
          ((b.station - a.station) * (level - a.elevation)) /
            (b.elevation - a.elevation),
        elevation: level,
      };
    if (b.elevation > level)
      b = {
        station:
          a.station +
          ((b.station - a.station) * (level - a.elevation)) /
            (b.elevation - a.elevation),
        elevation: level,
      };
    const dx = b.station - a.station;
    area += (dx * (2 * level - a.elevation - b.elevation)) / 2;
    perimeter += Math.hypot(dx, b.elevation - a.elevation);
    topWidth += dx;
  }
  return { area, perimeter, topWidth };
}

function clip(points: Point[], left: number, right: number): Point[] {
  return [
    { station: left, elevation: bedAt(points, left) },
    ...points.filter((p) => p.station > left && p.station < right),
    { station: right, elevation: bedAt(points, right) },
  ];
}

export function properties(
  inputs: Inputs,
  section: number,
  level: number,
  q: number,
  natural = false,
): Properties {
  const s = inputs.sections[section],
    b = inputs.bridge;
  const opening = !natural && (section === 1 || section === 2);
  const points = opening ? clip(s.points, b.left, b.right) : s.points;
  const g = wetted(points, level);
  if (opening) {
    // Vertical abutment faces. Piers remove the exact submerged ground strip.
    g.perimeter +=
      Math.max(0, level - bedAt(s.points, b.left)) +
      Math.max(0, level - bedAt(s.points, b.right));
    for (const pier of b.piers) {
      const left = pier.station - pier.width / 2,
        right = pier.station + pier.width / 2;
      const occupied = wetted(clip(s.points, left, right), level);
      g.area -= occupied.area;
      g.topWidth -= occupied.topWidth;
      g.perimeter +=
        Math.max(0, level - bedAt(s.points, left)) +
        Math.max(0, level - bedAt(s.points, right)) -
        occupied.perimeter;
    }
    // A uniform area reduction is a sensitivity assumption, not a debris geometry model.
    g.area *= 1 - b.blockage / 100;
    g.topWidth *= 1 - b.blockage / 100;
  }
  const radius = g.perimeter > 0 ? g.area / g.perimeter : 0;
  const conveyance = g.area > 0 ? (g.area * radius ** (2 / 3)) / s.n : 0;
  const velocity = g.area > 0 ? q / g.area : Infinity;
  const froude =
    g.area > 0
      ? velocity / Math.sqrt((GRAVITY * g.area) / g.topWidth)
      : Infinity;
  return {
    ...g,
    conveyance,
    velocity,
    froude,
    energy: level + (velocity * velocity) / (2 * GRAVITY),
  };
}

export function validate(inputs: Inputs): string[] {
  const errors: string[] = [];
  const finite = (n: number) => typeof n === "number" && Number.isFinite(n);
  if (inputs.sections.length !== 4)
    errors.push("Exactly four cross-sections are required.");
  inputs.sections.forEach((s, i) => {
    if (s.points.length < 3 || s.points.length > 2000)
      errors.push(`Section ${i + 1}: enter 3 to 2,000 survey points.`);
    if (!finite(s.n) || s.n < 0.01 || s.n > 0.2)
      errors.push(
        `Section ${i + 1}: Manning roughness must be between 0.01 and 0.2.`,
      );
    s.points.forEach((p, j) => {
      if (
        !finite(p.station) ||
        !finite(p.elevation) ||
        Math.abs(p.station) > 1e7 ||
        Math.abs(p.elevation) > 1e5
      )
        errors.push(
          `Section ${i + 1}, row ${j + 1}: station and elevation must be finite survey values.`,
        );
      if (j && p.station <= s.points[j - 1].station)
        errors.push(
          `Section ${i + 1}, row ${j + 1}: stations must increase strictly. Use a small horizontal offset for a vertical survey face.`,
        );
    });
  });
  const b = inputs.bridge;
  for (const [key, value] of Object.entries(b))
    if (key !== "piers" && !finite(value as number))
      errors.push(`Bridge ${key}: enter a finite number.`);
  if (b.left >= b.right)
    errors.push("Left abutment must be before right abutment.");
  if (b.deck <= b.soffit)
    errors.push("Deck elevation must exceed soffit elevation.");
  if (b.blockage < 0 || b.blockage > 80)
    errors.push("Blockage must be between 0% and 80%.");
  if (
    [b.expansionLength, b.deckLength, b.contractionLength].some(
      (v) => v <= 0 || v > 10000,
    )
  )
    errors.push(
      "Each reach length must be greater than zero and at most 10,000 m.",
    );
  if ([b.contraction, b.expansion].some((v) => v < 0 || v > 1))
    errors.push("Transition coefficients must be between 0 and 1.");
  for (const i of [1, 2]) {
    const points = inputs.sections[i]?.points;
    if (
      points?.length &&
      (b.left < points[0].station ||
        b.right > points[points.length - 1].station)
    )
      errors.push(`Section ${i + 1}: abutments must lie within the survey.`);
    if (
      points?.length &&
      b.soffit <= Math.min(...points.map((p) => p.elevation))
    )
      errors.push(`Section ${i + 1}: soffit must be above the channel bed.`);
  }
  const piers = [...b.piers].sort((a, c) => a.station - c.station);
  piers.forEach((p, i) => {
    if (
      !finite(p.station) ||
      !finite(p.width) ||
      p.width <= 0 ||
      p.station - p.width / 2 <= b.left ||
      p.station + p.width / 2 >= b.right
    )
      errors.push(
        `Pier ${i + 1}: its full positive width must fit within the opening.`,
      );
    if (
      i &&
      p.station - p.width / 2 <= piers[i - 1].station + piers[i - 1].width / 2
    )
      errors.push("Pier widths must not overlap.");
  });
  if (inputs.flows.length === 0 || inputs.flows.length > 30)
    errors.push("Enter between 1 and 30 flow events.");
  const names = new Set<string>();
  const ids = new Set<string>();
  inputs.flows.forEach((f, i) => {
    if (!f.name.trim() || names.has(f.name.trim().toLowerCase()))
      errors.push(`Event ${i + 1}: use a unique event name.`);
    names.add(f.name.trim().toLowerCase());
    if (!f.id || ids.has(f.id))
      errors.push(`Event ${i + 1}: duplicate or missing identifier.`);
    ids.add(f.id);
    if (!finite(f.discharge) || f.discharge <= 0 || f.discharge > 1e6)
      errors.push(
        `Event ${i + 1}: discharge must be above zero and at most 1,000,000 m³/s.`,
      );
    if (!finite(f.tailwater))
      errors.push(`Event ${i + 1}: enter a finite downstream water level.`);
    if (f.reference !== null && !finite(f.reference))
      errors.push(
        `Event ${i + 1}: external water level must be a finite number or blank.`,
      );
  });
  return [...new Set(errors)];
}

class RangeError extends Error {
  constructor(
    message: string,
    public steps: Step[],
  ) {
    super(message);
  }
}
function profile(
  inputs: Inputs,
  q: number,
  tailwater: number,
  natural: boolean,
): Step[] {
  const b = inputs.bridge;
  const steps: Step[] = [];
  const ceiling = (i: number) => {
    const p = inputs.sections[i].points;
    return (
      Math.min(
        p[0].elevation,
        p[p.length - 1].elevation,
        !natural && (i === 1 || i === 2) ? b.soffit : Infinity,
      ) - 1e-6
    );
  };
  if (!natural && tailwater >= b.soffit)
    throw new RangeError(
      tailwater >= b.deck
        ? "Tailwater is above the deck. Overtopping requires an external model."
        : "Tailwater reaches the soffit. Pressure flow requires an external model.",
      steps,
    );
  const first = properties(inputs, 0, tailwater, q, natural);
  if (tailwater >= ceiling(0))
    throw new RangeError(
      "Downstream water level exceeds the surveyed banks.",
      steps,
    );
  if (!Number.isFinite(first.energy) || first.froude >= 0.98)
    throw new RangeError(
      "Downstream flow is dry, critical or supercritical. Use an external model.",
      steps,
    );
  steps.push({
    ...first,
    section: 0,
    wsel: tailwater,
    friction: 0,
    transition: 0,
    residual: 0,
    iterations: 0,
  });
  for (let i = 1; i < 4; i++) {
    const previous = steps[i - 1];
    const length = [b.expansionLength, b.deckLength, b.contractionLength][
      i - 1
    ];
    const coefficient = natural ? 0 : [b.expansion, 0, b.contraction][i - 1];
    const at = (level: number) => {
      const p = properties(inputs, i, level, q, natural);
      const friction =
        length * ((2 * q) / (p.conveyance + previous.conveyance)) ** 2;
      const transition =
        (coefficient * Math.abs(p.velocity ** 2 - previous.velocity ** 2)) /
        (2 * GRAVITY);
      return {
        ...p,
        wsel: level,
        friction,
        transition,
        residual: p.energy - previous.energy - friction - transition,
      };
    };
    const min =
      Math.min(...inputs.sections[i].points.map((p) => p.elevation)) + 1e-5;
    const max = ceiling(i);
    // Scan for the first negative-to-positive residual crossing on the subcritical branch.
    let low: ReturnType<typeof at> | null = null,
      high: ReturnType<typeof at> | null = null;
    for (let j = 0; j <= 600; j++) {
      const candidate = at(min + ((max - min) * j) / 600);
      if (candidate.froude >= 0.98 || !Number.isFinite(candidate.residual))
        continue;
      if (candidate.residual <= 0) low = candidate;
      else if (low) {
        high = candidate;
        break;
      }
    }
    if (!low || !high)
      throw new RangeError(
        `${inputs.sections[i].name}: no subcritical energy balance within the surveyed banks${!natural && (i === 1 || i === 2) ? " and below the soffit" : ""}. Check the boundary and geometry; pressure flow or critical control may require an external model.`,
        steps,
      );
    let result = high,
      iterations = 0;
    for (; iterations < 80; iterations++) {
      result = at((low.wsel + high.wsel) / 2);
      if (Math.abs(result.residual) < TOLERANCE) break;
      if (result.residual < 0) low = result;
      else high = result;
    }
    if (Math.abs(result.residual) >= TOLERANCE)
      throw new RangeError(
        "Energy solver did not converge within its residual tolerance.",
        steps,
      );
    steps.push({ ...result, section: i, iterations: iterations + 1 });
  }
  if (!natural && steps[3].wsel >= b.soffit)
    throw new RangeError(
      "Approach water level reaches the soffit. Check pressure flow in an external model.",
      steps,
    );
  return steps;
}

export function calculate(inputs: Inputs): Run {
  const errors = validate(inputs);
  if (errors.length) throw new Error(errors.join("\n"));
  const results = inputs.flows.map((f) => {
    let bridge: Step[] = [],
      natural: Step[] = [];
    try {
      natural = profile(inputs, f.discharge, f.tailwater, true);
      bridge = profile(inputs, f.discharge, f.tailwater, false);
      return {
        flowId: f.id,
        name: f.name,
        discharge: f.discharge,
        status: "ok" as const,
        reason: "",
        bridge,
        natural,
        afflux: bridge[3].wsel - natural[3].wsel,
        freeboard:
          inputs.bridge.soffit -
          Math.max(...bridge.slice(1).map((s) => s.wsel)),
      };
    } catch (e) {
      // Partial profiles are diagnostic only and never assessed against criteria.
      return {
        flowId: f.id,
        name: f.name,
        discharge: f.discharge,
        status: "unsupported" as const,
        reason: e instanceof Error ? e.message : "Calculation failed.",
        bridge,
        natural,
        afflux: null,
        freeboard: null,
      };
    }
  });
  return {
    id: uid(),
    date: new Date().toISOString(),
    engine: ENGINE_VERSION,
    inputKey: inputKey(inputs),
    inputs: structuredClone(inputs),
    results,
  };
}
