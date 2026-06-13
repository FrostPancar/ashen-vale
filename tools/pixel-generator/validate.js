/** Sanitize and normalize AI-generated sprite rows for Ashen Vale art.js format. */

const VALID = /^[. 0123]*$/;

export function toVarName(name) {
  const base = String(name || 'prop')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  return base || 'PROP';
}

export function sanitizeRows(rows, w, h) {
  const out = [];
  const src = Array.isArray(rows) ? rows : [];
  for (let y = 0; y < h; y++) {
    let row = String(src[y] ?? '')
      .replace(/ /g, '.')
      .replace(/[^.0123]/g, '0');
    if (row.length < w) row = row + '.'.repeat(w - row.length);
    if (row.length > w) row = row.slice(0, w);
    out.push(row);
  }
  return out;
}

export function rowsValid(rows) {
  return Array.isArray(rows) && rows.length > 0 && rows.every(r => VALID.test(r));
}

export function formatJsConst(name, rows, comment) {
  const varName = toVarName(name);
  const lines = [];
  for (let i = 0; i < rows.length; i += 4) {
    const chunk = rows.slice(i, i + 4).map(r => `'${r}'`).join(',');
    lines.push(`  ${chunk}`);
  }
  const note = comment ? ` // ${comment}` : '';
  return `const ${varName} = [${note}\n${lines.join(',\n')},\n];`;
}

export function countPixels(rows) {
  let n = 0;
  for (const row of rows) {
    for (const ch of row) if (ch !== '.' && ch !== ' ') n++;
  }
  return n;
}
