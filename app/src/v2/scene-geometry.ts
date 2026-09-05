import type { FlowResult, Inputs, Point } from "./model";

export const reachStations = (inputs: Inputs) => {
  const b = inputs.bridge;
  return [
    0,
    b.expansionLength,
    b.expansionLength + b.deckLength,
    b.expansionLength + b.deckLength + b.contractionLength,
  ];
};
export function elevationAt(points: Point[], station: number): number {
  if (station <= points[0].station) return points[0].elevation;
  if (station >= points[points.length - 1].station)
    return points[points.length - 1].elevation;
  let low = 1,
    high = points.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (points[mid].station < station) low = mid + 1;
    else high = mid;
  }
  const a = points[low - 1],
    b = points[low];
  return (
    a.elevation +
    ((b.elevation - a.elevation) * (station - a.station)) /
      (b.station - a.station)
  );
}
export function wetEdges(points: Point[], level: number): [number, number][] {
  const intervals: [number, number][] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i];
    if (a.elevation >= level && b.elevation >= level) continue;
    const crossing =
      a.station +
      ((b.station - a.station) * (level - a.elevation)) /
        (b.elevation - a.elevation);
    intervals.push([
      a.elevation < level ? a.station : crossing,
      b.elevation < level ? b.station : crossing,
    ]);
  }
  return intervals;
}
export function sceneGeometry(
  inputs: Inputs,
  result?: FlowResult,
  surfaces = true,
) {
  const all = inputs.sections.flatMap((s) => s.points);
  const minX = Math.min(...all.map((p) => p.station));
  const maxX = Math.max(...all.map((p) => p.station));
  const datum = Math.min(...all.map((p) => p.elevation));
  const distances = reachStations(inputs);
  const length = distances[3];
  const centre = (minX + maxX) / 2;
  const surveyStations = [...new Set(all.map((p) => p.station))].sort(
    (a, b) => a - b,
  );
  // Bound visual mesh cost only; hydraulic calculations retain every survey point.
  const sampled =
    surveyStations.length <= 512
      ? surveyStations
      : Array.from(
          { length: 512 },
          (_, i) =>
            surveyStations[Math.round((i * (surveyStations.length - 1)) / 511)],
        );
  const stations = [
    ...new Set([
      ...sampled,
      inputs.bridge.left,
      inputs.bridge.right,
      ...inputs.bridge.piers.flatMap((p) => [
        p.station - p.width / 2,
        p.station + p.width / 2,
      ]),
      ...Array.from({ length: 81 }, (_, i) => minX + ((maxX - minX) * i) / 80),
    ]),
  ]
    .filter((x) => x >= minX && x <= maxX)
    .sort((a, b) => a - b);
  const terrain: number[] = [];
  const vertex = (section: number, x: number) => [
    x - centre,
    elevationAt(inputs.sections[section].points, x) - datum,
    distances[section] - length / 2,
  ];
  if (surfaces)
    for (let i = 0; i < 3; i++)
      for (let j = 1; j < stations.length; j++) {
        const a = vertex(i, stations[j - 1]),
          b = vertex(i, stations[j]);
        const c = vertex(i + 1, stations[j - 1]),
          d = vertex(i + 1, stations[j]);
        terrain.push(...a, ...c, ...b, ...b, ...c, ...d);
      }
  const sides: number[] = [];
  const skirt = (a: number[], b: number[]) => {
    const c = [a[0], -1.8, a[2]],
      d = [b[0], -1.8, b[2]];
    sides.push(...a, ...b, ...c, ...b, ...d, ...c);
  };
  if (surfaces)
    for (let j = 1; j < stations.length; j++) {
      skirt(vertex(0, stations[j - 1]), vertex(0, stations[j]));
      skirt(vertex(3, stations[j]), vertex(3, stations[j - 1]));
    }
  if (surfaces)
    for (let i = 0; i < 3; i++) {
      skirt(vertex(i, minX), vertex(i + 1, minX));
      skirt(vertex(i + 1, maxX), vertex(i, maxX));
    }
  // Clip triangles against depth, retaining shoreline wedges at dry edges.
  const water: number[] = [],
    depths: number[] = [];
  type WetVertex = { p: number[]; depth: number };
  const wetTriangle = (vertices: WetVertex[]) => {
    const clipped: WetVertex[] = [];
    for (let k = 0; k < vertices.length; k++) {
      const a = vertices[k],
        b = vertices[(k + 1) % vertices.length];
      if (a.depth > 0) clipped.push(a);
      if (a.depth > 0 !== b.depth > 0) {
        const t = a.depth / (a.depth - b.depth);
        clipped.push({ p: a.p.map((v, j) => v + (b.p[j] - v) * t), depth: 0 });
      }
    }
    for (let k = 1; k < clipped.length - 1; k++)
      for (const v of [clipped[0], clipped[k], clipped[k + 1]]) {
        water.push(...v.p);
        depths.push(v.depth);
      }
  };
  if (
    result?.status === "ok" &&
    result.bridge.length === 4 &&
    result.bridge.every((s) => Number.isFinite(s.wsel))
  ) {
    for (let i = 0; i < 3; i++) {
      const at = (t: number, x: number): WetVertex => {
        const level =
          result.bridge[i].wsel * (1 - t) + result.bridge[i + 1].wsel * t;
        const bed =
          elevationAt(inputs.sections[i].points, x) * (1 - t) +
          elevationAt(inputs.sections[i + 1].points, x) * t;
        return {
          p: [
            x - centre,
            level - datum + 0.006,
            distances[i] * (1 - t) + distances[i + 1] * t - length / 2,
          ],
          depth: level - bed,
        };
      };
      for (let slice = 0; slice < 32; slice++) {
        for (let j = 1; j < stations.length; j++) {
          const left = stations[j - 1],
            right = stations[j],
            mid = (left + right) / 2;
          if (
            i === 1 &&
            (mid < inputs.bridge.left ||
              mid > inputs.bridge.right ||
              inputs.bridge.piers.some(
                (p) => Math.abs(mid - p.station) < p.width / 2,
              ))
          )
            continue;
          const a = at(slice / 32, left),
            b = at(slice / 32, right);
          const c = at((slice + 1) / 32, left),
            d = at((slice + 1) / 32, right);
          wetTriangle([a, c, b]);
          wetTriangle([b, c, d]);
        }
      }
    }
  }
  return {
    terrain,
    sides,
    water,
    depths,
    datum,
    centre,
    length,
    distances,
    width: maxX - minX,
  };
}
