/* eslint-disable */
// Minimal markdown → styled HTML converter for ARCHITECTURE.md.
// Handles: #..###### headings, **bold**, *italic*, `code`, ```fences```,
// - lists, | tables |, [text](url), ---, paragraphs.

const fs   = require("fs");
const path = require("path");

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error("usage: node md-to-html.cjs <input.md> <output.html>");
  process.exit(1);
}

const src = fs.readFileSync(inPath, "utf8").replace(/\r\n/g, "\n");
const lines = src.split("\n");

function esc(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function inline(s) {
  // escape first, then apply markdown
  let out = esc(s);
  // inline code
  out = out.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  // bold
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // italic (single * not part of **)
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  // links
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return out;
}

const html = [];
let i = 0;

function flushParagraph(buf) {
  if (!buf.length) return;
  html.push(`<p>${inline(buf.join(" "))}</p>`);
  buf.length = 0;
}

let para = [];

while (i < lines.length) {
  const line = lines[i];

  // fenced code block
  if (/^```/.test(line)) {
    flushParagraph(para);
    i++;
    const code = [];
    while (i < lines.length && !/^```/.test(lines[i])) {
      code.push(lines[i]);
      i++;
    }
    html.push(`<pre><code>${esc(code.join("\n"))}</code></pre>`);
    i++;
    continue;
  }

  // table — current line has `|` and next line is separator
  if (/^\|.*\|$/.test(line) && i + 1 < lines.length && /^\|[-\s|:]+\|$/.test(lines[i + 1])) {
    flushParagraph(para);
    const headerCells = line.slice(1, -1).split("|").map((c) => c.trim());
    i += 2;
    const rows = [];
    while (i < lines.length && /^\|.*\|$/.test(lines[i])) {
      rows.push(lines[i].slice(1, -1).split("|").map((c) => c.trim()));
      i++;
    }
    let t = "<table><thead><tr>";
    for (const c of headerCells) t += `<th>${inline(c)}</th>`;
    t += "</tr></thead><tbody>";
    for (const r of rows) {
      t += "<tr>";
      for (const c of r) t += `<td>${inline(c)}</td>`;
      t += "</tr>";
    }
    t += "</tbody></table>";
    html.push(t);
    continue;
  }

  // heading
  const h = /^(#{1,6})\s+(.*)$/.exec(line);
  if (h) {
    flushParagraph(para);
    html.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
    i++;
    continue;
  }

  // hr
  if (/^---+$/.test(line.trim())) {
    flushParagraph(para);
    html.push("<hr/>");
    i++;
    continue;
  }

  // list
  if (/^\s*[-*]\s+/.test(line)) {
    flushParagraph(para);
    html.push("<ul>");
    while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
      const item = lines[i].replace(/^\s*[-*]\s+/, "");
      html.push(`<li>${inline(item)}</li>`);
      i++;
    }
    html.push("</ul>");
    continue;
  }

  // numbered list
  if (/^\s*\d+\.\s+/.test(line)) {
    flushParagraph(para);
    html.push("<ol>");
    while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
      const item = lines[i].replace(/^\s*\d+\.\s+/, "");
      html.push(`<li>${inline(item)}</li>`);
      i++;
    }
    html.push("</ol>");
    continue;
  }

  // blank line → paragraph break
  if (line.trim() === "") {
    flushParagraph(para);
    i++;
    continue;
  }

  // paragraph accumulator
  para.push(line);
  i++;
}
flushParagraph(para);

const style = `
  @page { size: A4; margin: 18mm 15mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font: 10.5pt/1.55 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1f2937;
  }
  h1 { font-size: 22pt; margin: 0 0 6pt; color: #0f172a; letter-spacing: -0.3pt; }
  h2 { font-size: 15pt; margin: 18pt 0 6pt; color: #0f172a; border-bottom: 1px solid #e5e7eb; padding-bottom: 4pt; }
  h3 { font-size: 12pt; margin: 14pt 0 4pt; color: #334155; }
  h4 { font-size: 11pt; margin: 10pt 0 3pt; color: #475569; }
  p  { margin: 4pt 0; }
  hr { border: 0; border-top: 1px solid #e5e7eb; margin: 14pt 0; }
  a  { color: #2563eb; text-decoration: none; }
  strong { color: #0f172a; }
  code {
    font-family: ui-monospace, "Cascadia Mono", Consolas, Menlo, monospace;
    font-size: 9.2pt;
    background: #f1f5f9;
    padding: 1.5pt 4pt;
    border-radius: 3pt;
    color: #0f172a;
  }
  pre {
    background: #0f172a;
    color: #e2e8f0;
    padding: 10pt 12pt;
    border-radius: 6pt;
    overflow-x: auto;
    page-break-inside: avoid;
  }
  pre code { background: transparent; color: inherit; padding: 0; font-size: 9pt; }
  ul, ol { margin: 4pt 0 6pt 16pt; }
  li { margin: 2pt 0; }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 8pt 0;
    font-size: 9.2pt;
    page-break-inside: auto;
  }
  thead { display: table-header-group; }
  tr    { page-break-inside: avoid; }
  th, td {
    border: 0.5pt solid #cbd5e1;
    padding: 4pt 6pt;
    text-align: left;
    vertical-align: top;
  }
  th { background: #f1f5f9; font-weight: 600; color: #0f172a; }
  tbody tr:nth-child(odd) { background: #fafafa; }
`;

const out = `<!doctype html>
<html><head><meta charset="utf-8"><title>VOLTV — Architecture</title>
<style>${style}</style></head><body>
${html.join("\n")}
</body></html>`;

fs.writeFileSync(outPath, out);
console.log(`wrote ${outPath} (${out.length} bytes)`);
