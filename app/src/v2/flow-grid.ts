import { readClipboard } from "./clipboard";
import { uid, type Inputs } from "./model";

export function pasteFlowCells(
  flows: Inputs["flows"],
  text: string,
  startRow: number,
  startColumn: number,
): Inputs["flows"] {
  const cells = readClipboard(text);
  if (
    cells[0].join(",").toLowerCase() ===
    "event,discharge_m3s,tailwater_m,source"
  )
    cells.shift();
  if (!cells.length) throw new Error("No flow events found.");
  if (startColumn + cells[0].length > 4)
    throw new Error(
      "Paste up to four columns, starting in the event name: event, discharge, downstream WSEL, source.",
    );
  if (startRow + cells.length > 30)
    throw new Error("An assessment supports up to 30 flow events.");
  const next = structuredClone(flows);
  cells.forEach((values, i) => {
    const index = startRow + i;
    const existing = next[index];
    const row = existing
      ? [
          existing.name,
          String(existing.discharge),
          String(existing.tailwater),
          existing.source,
        ]
      : ["", "", "", ""];
    values.forEach((value, j) => {
      row[startColumn + j] = value;
    });
    if (
      !row[0] ||
      !row[1] ||
      !row[2] ||
      !Number.isFinite(Number(row[1])) ||
      Number(row[1]) <= 0 ||
      Number(row[1]) > 1e6 ||
      !Number.isFinite(Number(row[2]))
    )
      throw new Error(
        `Event row ${index + 1}: enter a name, positive discharge up to 1,000,000 m³/s and a numeric downstream water level.`,
      );
    if (row[0].length > 500 || row[3].length > 20000)
      throw new Error(`Event row ${index + 1}: name or source is too long.`);
    next[index] = {
      id: existing?.id ?? uid(),
      name: row[0],
      discharge: Number(row[1]),
      tailwater: Number(row[2]),
      source: row[3],
      reference: existing?.reference ?? null,
    };
  });
  if (
    new Set(next.map((f) => f.name.trim().toLowerCase())).size !== next.length
  )
    throw new Error(
      "Each event needs a unique name. No pasted changes were applied.",
    );
  return next;
}
