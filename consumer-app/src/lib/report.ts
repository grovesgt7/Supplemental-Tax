/**
 * Printable report generator.
 *
 * Builds a fully self-contained HTML document (inline styles, no external
 * assets) and opens it in a new tab, where the browser's print dialog lets
 * the user print it or save it as a PDF. Everything stays on-device.
 */

export interface ReportSection {
  title: string;
  /** Label/value rows rendered as a two-column table */
  rows?: [string, string][];
  paragraphs?: string[];
  list?: string[];
  /** Large stat callouts rendered side by side */
  highlights?: { label: string; value: string }[];
}

export interface ReportData {
  title: string;
  subtitle?: string;
  address?: string;
  sections: ReportSection[];
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildReportHTML(data: ReportData): string {
  const esc = escapeHtml;
  const generated = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const sections = data.sections
    .map((s) => {
      const parts: string[] = [`<h2>${esc(s.title)}</h2>`];
      if (s.highlights?.length) {
        parts.push(
          `<div class="highlights">${s.highlights
            .map((h) => `<div class="stat"><span class="stat-label">${esc(h.label)}</span><span class="stat-value">${esc(h.value)}</span></div>`)
            .join('')}</div>`
        );
      }
      if (s.rows?.length) {
        parts.push(
          `<table>${s.rows
            .map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td class="v">${esc(v)}</td></tr>`)
            .join('')}</table>`
        );
      }
      if (s.paragraphs?.length) {
        parts.push(s.paragraphs.map((p) => `<p>${esc(p)}</p>`).join(''));
      }
      if (s.list?.length) {
        parts.push(`<ol>${s.list.map((li) => `<li>${esc(li)}</li>`).join('')}</ol>`);
      }
      return `<section>${parts.join('')}</section>`;
    })
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(data.title)} — MyTaxBill.guide</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
         color: #111827; line-height: 1.55; padding: 40px; max-width: 760px; margin: 0 auto;
         font-size: 14px; }
  header { display: flex; justify-content: space-between; align-items: flex-start;
           border-bottom: 3px solid #1b6ff5; padding-bottom: 16px; margin-bottom: 8px; }
  .brand { font-size: 18px; font-weight: 800; }
  .brand span { color: #1b6ff5; }
  .meta { text-align: right; font-size: 12px; color: #6b7280; }
  h1 { font-size: 24px; font-weight: 800; margin: 20px 0 2px; }
  .subtitle { color: #6b7280; margin-bottom: 8px; }
  .address { font-weight: 600; color: #374151; margin-bottom: 4px; }
  h2 { font-size: 15px; font-weight: 700; margin: 26px 0 10px;
       padding-bottom: 5px; border-bottom: 1px solid #e5e7eb; }
  p { margin: 8px 0; color: #374151; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0; }
  td { padding: 7px 4px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
  td.k { color: #6b7280; width: 55%; }
  td.v { font-weight: 600; text-align: right; }
  ol { margin: 8px 0 8px 20px; color: #374151; }
  li { margin: 6px 0; }
  .highlights { display: flex; gap: 12px; margin: 10px 0; }
  .stat { flex: 1; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; }
  .stat-label { display: block; font-size: 11px; text-transform: uppercase;
                letter-spacing: .04em; color: #6b7280; margin-bottom: 3px; }
  .stat-value { display: block; font-size: 20px; font-weight: 800; }
  footer { margin-top: 36px; padding-top: 14px; border-top: 1px solid #e5e7eb;
           font-size: 11px; color: #9ca3af; }
  .toolbar { position: sticky; top: 0; background: #eef7ff; border: 1px solid #bce0ff;
             border-radius: 10px; padding: 10px 14px; margin-bottom: 18px;
             display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .toolbar button { background: #1b6ff5; color: #fff; border: 0; border-radius: 8px;
                    padding: 9px 18px; font-size: 14px; font-weight: 600; cursor: pointer; }
  @media print {
    body { padding: 0; font-size: 12.5px; }
    .toolbar { display: none; }
    section { break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <span>Use “Save as PDF” in the print dialog to keep a copy.</span>
    <button onclick="window.print()">Print / Save as PDF</button>
  </div>
  <header>
    <div class="brand">MyTaxBill<span>.guide</span></div>
    <div class="meta">Generated ${esc(generated)}<br>Estimates only — verify with your county</div>
  </header>
  <h1>${esc(data.title)}</h1>
  ${data.subtitle ? `<div class="subtitle">${esc(data.subtitle)}</div>` : ''}
  ${data.address ? `<div class="address">${esc(data.address)}</div>` : ''}
  ${sections}
  <footer>
    This report provides educational estimates for California property taxes and is not tax, legal, or
    financial advice. Actual tax rates vary by tax rate area, and actual bills and due dates are determined
    by your county assessor and tax collector. Generated locally in your browser — no data was sent or stored.
  </footer>
</body>
</html>`;
}

export function openPrintReport(data: ReportData): boolean {
  const w = window.open('', '_blank');
  if (!w) return false; // popup blocked
  w.document.write(buildReportHTML(data));
  w.document.close();
  return true;
}
