export interface ParsedCSV {
  headers: string[];
  rows: string[][];
}

/** Parser CSV robusto: comillas, comas internas, "" escapadas, BOM, CRLF. */
export function parseCSV(text: string): ParsedCSV {
  const clean = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      current.push(field);
      field = '';
    } else if (ch === '\n') {
      current.push(field);
      field = '';
      if (current.some((c) => c.trim() !== '')) rows.push(current);
      current = [];
    } else if (ch === '\r') {
      // ignorar, se procesa en \n
    } else {
      field += ch;
    }
  }
  current.push(field);
  if (current.some((c) => c.trim() !== '')) rows.push(current);
  if (rows.length === 0) return { headers: [], rows: [] };

  const headers = rows[0].map((h) => h.trim());
  return { headers, rows: rows.slice(1) };
}
