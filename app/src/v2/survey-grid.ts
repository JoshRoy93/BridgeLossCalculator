import { readClipboard } from "./clipboard";
export type SurveyRow = [string, string];

/** Accept numeric CSV and the tab-separated cells copied by spreadsheets. */
export function readSurveyCells(text: string): string[][] {
  const rows = readClipboard(text);
  if (rows[0].join(",").toLowerCase() === "station,elevation") rows.shift();
  if (!rows.length) throw new Error("No survey coordinates found.");
  if (rows.length > 2000) throw new Error("Survey exceeds 2,000 points.");
  if (rows.some((row) => row.length > 2 || row.length !== rows[0].length))
    throw new Error(
      "Paste one or two consistent columns: station and elevation.",
    );
  if (
    rows.some((row) =>
      row.some((cell) => cell && !Number.isFinite(Number(cell))),
    )
  )
    throw new Error(
      "Survey cells must contain numbers. Use metres and decimal points.",
    );
  return rows;
}

export function pasteSurveyCells(
  rows: SurveyRow[],
  cells: string[][],
  startRow: number,
  startColumn: number,
): SurveyRow[] {
  if (startColumn + cells[0].length > 2)
    throw new Error(
      "Paste two columns into a station cell, or one column into either field.",
    );
  if (startRow + cells.length > 2000)
    throw new Error("Survey exceeds 2,000 points.");
  const next = rows.map((row) => [...row] as SurveyRow);
  cells.forEach((row, i) => {
    next[startRow + i] ??= ["", ""];
    row.forEach((cell, j) => {
      next[startRow + i][startColumn + j] = cell;
    });
  });
  return next;
}

export function surveyErrors(rows: SurveyRow[]): Record<string, string> {
  const errors: Record<string, string> = {};
  rows.forEach((row, i) => {
    row.forEach((value, j) => {
      if (!value.trim() || !Number.isFinite(Number(value)))
        errors[`${i}-${j}`] = "Enter a number.";
    });
    if (
      i &&
      !errors[`${i}-0`] &&
      !errors[`${i - 1}-0`] &&
      Number(row[0]) <= Number(rows[i - 1][0])
    )
      errors[`${i}-0`] = "Station must be greater than the previous row.";
  });
  return errors;
}
