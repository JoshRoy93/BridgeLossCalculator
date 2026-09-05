import type { Inputs } from "./model";
import { elevationAt, reachStations } from "./scene-geometry";

type Vertex = [number, number, number];
export function approachGeometry(
  inputs: Inputs,
  datum: number,
  centre: number,
) {
  const b = inputs.bridge,
    distances = reachStations(inputs),
    length = distances[3];
  const bridgeZ = (distances[1] + distances[2]) / 2 - length / 2;
  const road: number[] = [],
    shoulders: number[] = [],
    fill: number[] = [],
    markings: number[] = [];
  const joins: { station: number; elevation: number }[] = [];
  const bed = (x: number, z: number) => {
    const distance = z + length / 2;
    const i = distance <= distances[1] ? 0 : distance <= distances[2] ? 1 : 2;
    const t = Math.max(
      0,
      Math.min(
        1,
        (distance - distances[i]) / (distances[i + 1] - distances[i]),
      ),
    );
    return (
      elevationAt(inputs.sections[i].points, x) * (1 - t) +
      elevationAt(inputs.sections[i + 1].points, x) * t
    );
  };
  const quad = (
    array: number[],
    a: Vertex,
    c: Vertex,
    b: Vertex,
    d: Vertex,
  ) => {
    const normalY =
      (c[2] - a[2]) * (b[0] - a[0]) - (c[0] - a[0]) * (b[2] - a[2]);
    if (normalY < 0) array.push(...a, ...b, ...c, ...b, ...d, ...c);
    else array.push(...a, ...c, ...b, ...b, ...c, ...d);
  };
  const roadWidth = Math.max(0.1, b.deckLength - 1.4);
  const deckY = b.deck + 0.0475 - datum;
  quad(
    road,
    [b.left - 1 - centre, deckY, bridgeZ - roadWidth / 2],
    [b.left - 1 - centre, deckY, bridgeZ + roadWidth / 2],
    [b.right + 1 - centre, deckY, bridgeZ - roadWidth / 2],
    [b.right + 1 - centre, deckY, bridgeZ + roadWidth / 2],
  );
  const bounds = [
    Math.max(
      inputs.sections[1].points[0].station,
      inputs.sections[2].points[0].station,
    ),
    Math.min(
      inputs.sections[1].points.at(-1)!.station,
      inputs.sections[2].points.at(-1)!.station,
    ),
  ];
  for (const side of [-1, 1]) {
    const join = side < 0 ? b.left - 1 : b.right + 1,
      end = bounds[side < 0 ? 0 : 1];
    if ((end - join) * side <= 0.01) continue;
    const roadAtJoin = b.deck + 0.0475;
    const roadAtEnd =
      Math.max(
        bed(end, bridgeZ - b.deckLength / 2),
        bed(end, bridgeZ + b.deckLength / 2),
      ) + 0.0475;
    const height = (x: number) => {
      const t = (x - join) / (end - join);
      const ramp = roadAtJoin * (1 - t) + roadAtEnd * t;
      return t < 1e-8
        ? roadAtJoin
        : Math.max(
            ramp,
            bed(x, bridgeZ - b.deckLength / 2) + 0.0475,
            bed(x, bridgeZ + b.deckLength / 2) + 0.0475,
          );
    };
    const v = (x: number, y: number, z: number): Vertex => [
      x - centre,
      y - datum,
      z,
    ];
    const ribbon = (
      array: number[],
      x0: number,
      x1: number,
      z0: number,
      z1: number,
      lift = 0,
    ) =>
      quad(
        array,
        v(x0, height(x0) + lift, z0),
        v(x0, height(x0) + lift, z1),
        v(x1, height(x1) + lift, z0),
        v(x1, height(x1) + lift, z1),
      );
    const segments = 32;
    for (let i = 0; i < segments; i++) {
      const x0 = join + ((end - join) * i) / segments,
        x1 = join + ((end - join) * (i + 1)) / segments;
      ribbon(road, x0, x1, bridgeZ - roadWidth / 2, bridgeZ + roadWidth / 2);
      for (const edge of [-1, 1]) {
        ribbon(
          shoulders,
          x0,
          x1,
          bridgeZ + (edge * roadWidth) / 2,
          bridgeZ + (edge * b.deckLength) / 2,
          -0.012,
        );
        const shoulder = bridgeZ + (edge * b.deckLength) / 2;
        const toe = (x: number) => {
          let z = shoulder + edge * 0.4;
          for (let j = 0; j < 3; j++)
            z = shoulder + edge * Math.max(0.4, (height(x) - bed(x, z)) * 1.5);
          return Math.max(-length / 2, Math.min(length / 2, z));
        };
        const z0 = toe(x0),
          z1 = toe(x1);
        quad(
          fill,
          v(x0, height(x0) - 0.025, shoulder),
          v(x0, bed(x0, z0) + 0.012, z0),
          v(x1, height(x1) - 0.025, shoulder),
          v(x1, bed(x1, z1) + 0.012, z1),
        );
        ribbon(
          markings,
          x0,
          x1,
          bridgeZ + edge * (roadWidth / 2 - 0.12),
          bridgeZ + edge * (roadWidth / 2 - 0.12) + 0.07,
          0.008,
        );
      }
    }
    // Close the fill at the concrete abutment and at the survey boundary.
    for (const x of [join, end])
      quad(
        fill,
        v(x, height(x) - 0.025, bridgeZ - b.deckLength / 2),
        v(x, bed(x, bridgeZ - b.deckLength / 2), bridgeZ - b.deckLength / 2),
        v(x, height(x) - 0.025, bridgeZ + b.deckLength / 2),
        v(x, bed(x, bridgeZ + b.deckLength / 2), bridgeZ + b.deckLength / 2),
      );
    for (
      let x = Math.ceil(Math.min(join, end) / 4) * 4;
      x < Math.max(join, end);
      x += 4
    ) {
      const x0 = Math.max(Math.min(join, end), x),
        x1 = Math.min(Math.max(join, end), x + 1.8);
      if (x1 > x0)
        ribbon(markings, x0, x1, bridgeZ - 0.04, bridgeZ + 0.04, 0.008);
    }
    joins.push({ station: join, elevation: roadAtJoin });
  }
  return { road, shoulders, fill, markings, joins };
}
