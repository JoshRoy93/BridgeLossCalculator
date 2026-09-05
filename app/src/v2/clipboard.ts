/** Read CSV or tab-separated spreadsheet cells without dropping blank cells. */
export function readClipboard(text: string): string[][] {
  text = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  if (!text.trim()) throw new Error("The clipboard or file is empty.");
  if (text.length > 200000)
    throw new Error("Paste or import less than 200 KB at a time.");
  const delimiter = text.split("\n", 1)[0].includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false,
    closed = false;
  const pushCell = () => {
    row.push(cell.trim());
    cell = "";
    closed = false;
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
        closed = true;
      } else cell += c;
    } else if (c === delimiter) pushCell();
    else if (c === "\n") {
      pushCell();
      rows.push(row);
      row = [];
    } else if (c === '"' && !cell.trim() && !closed) {
      cell = "";
      quoted = true;
    } else if (closed && c.trim())
      throw new Error("Unexpected text after a quoted cell.");
    else if (!closed) cell += c;
  }
  if (quoted) throw new Error("A quoted cell is missing its closing quote.");
  pushCell();
  rows.push(row);
  while (rows.length && rows.at(-1)?.every((value) => !value)) rows.pop();
  if (!rows.length) throw new Error("No data rows found.");
  if (rows.some((r) => r.length !== rows[0].length))
    throw new Error("Each pasted row must have the same number of columns.");
  return rows;
}
