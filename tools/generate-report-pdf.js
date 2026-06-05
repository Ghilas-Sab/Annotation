const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const inputPath = path.join(root, 'RAPPORT_STAGE_V2_ADAPTE.md');
const outputPath = path.join(root, 'RAPPORT_STAGE_V2_ADAPTE.html');

const markdown = fs.readFileSync(inputPath, 'utf8');

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(value) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function box(x, y, w, h, title, text, fill = '#f8fafc', stroke = '#334155') {
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
    <text x="${x + w / 2}" y="${y + 24}" text-anchor="middle" font-size="13" font-weight="700" fill="#0f172a">${escapeHtml(title)}</text>
    <text x="${x + w / 2}" y="${y + 46}" text-anchor="middle" font-size="10.5" fill="#475569">${escapeHtml(text)}</text>
  `;
}

function arrow(x1, y1, x2, y2, label = '') {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2 - 6;
  return `
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#475569" stroke-width="1.4" marker-end="url(#arrow)"/>
    ${label ? `<text x="${midX}" y="${midY}" text-anchor="middle" font-size="9.5" fill="#334155">${escapeHtml(label)}</text>` : ''}
  `;
}

function svg(width, height, inner) {
  return `
    <div class="diagram">
      <svg viewBox="0 0 ${width} ${height}" role="img" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L7,3 z" fill="#475569"/>
          </marker>
        </defs>
        ${inner}
      </svg>
    </div>
  `;
}

function renderDiagram(code) {
  if (code.includes('Planning synthétique du stage')) {
    const rows = [
      ['Analyse besoin', 20, 80, '#dbeafe'],
      ['Architecture', 75, 55, '#e0f2fe'],
      ['UX initial', 75, 75, '#ecfeff'],
      ['Socle technique', 125, 70, '#dcfce7'],
      ['Modules V1', 180, 115, '#bbf7d0'],
      ['Redesign V2', 310, 105, '#fef3c7'],
      ['Assemblage', 330, 125, '#fde68a'],
      ['Tests E2E', 420, 100, '#fee2e2'],
      ['Rapport', 500, 120, '#f3e8ff'],
    ];
    const bars = rows.map((r, i) => {
      const y = 62 + i * 25;
      return `
        <text x="18" y="${y + 13}" font-size="10" fill="#334155">${escapeHtml(r[0])}</text>
        <rect x="${r[1] + 125}" y="${y}" width="${r[2]}" height="15" rx="4" fill="${r[3]}" stroke="#64748b"/>
      `;
    }).join('');
    return svg(760, 310, `
      <text x="380" y="25" text-anchor="middle" font-size="15" font-weight="700">Planning synthétique du stage</text>
      <line x1="145" y1="45" x2="720" y2="45" stroke="#94a3b8"/>
      <text x="145" y="39" font-size="10">01/04</text>
      <text x="270" y="39" font-size="10">15/04</text>
      <text x="395" y="39" font-size="10">01/05</text>
      <text x="520" y="39" font-size="10">15/05</text>
      <text x="650" y="39" font-size="10">01/06</text>
      ${bars}
    `);
  }

  if (code.includes('Contexte système')) {
    return svg(760, 260, `
      <text x="380" y="24" text-anchor="middle" font-size="15" font-weight="700">C4 niveau 1 - Contexte système</text>
      ${box(40, 95, 145, 70, 'Utilisateur', 'Navigateur web', '#eff6ff')}
      ${box(295, 90, 170, 82, 'AnnotaRythm', 'Application annotation vidéo', '#dcfce7')}
      ${box(575, 45, 145, 68, 'FFmpeg', 'Traitements vidéo', '#fef3c7')}
      ${box(575, 150, 145, 68, 'Fichiers locaux', 'Vidéos et exports', '#f1f5f9')}
      ${arrow(185, 130, 295, 130, 'utilise')}
      ${arrow(465, 112, 575, 80, 'exécute')}
      ${arrow(465, 148, 575, 184, 'lit / écrit')}
    `);
  }

  if (code.includes('Conteneurs')) {
    return svg(760, 280, `
      <text x="380" y="24" text-anchor="middle" font-size="15" font-weight="700">C4 niveau 2 - Conteneurs</text>
      ${box(35, 105, 120, 65, 'Utilisateur', 'Interaction', '#eff6ff')}
      ${box(220, 60, 145, 70, 'Frontend React', 'SPA TypeScript', '#dbeafe')}
      ${box(220, 165, 145, 70, 'API FastAPI', 'REST / métier', '#dcfce7')}
      ${box(510, 60, 160, 70, 'Stockage local', 'JSON + vidéos', '#f1f5f9')}
      ${box(510, 165, 160, 70, 'FFmpeg', 'Exports / assemblage', '#fef3c7')}
      ${arrow(155, 138, 220, 95, 'UI')}
      ${arrow(292, 130, 292, 165, 'REST')}
      ${arrow(365, 200, 510, 95, 'persiste')}
      ${arrow(365, 200, 510, 200, 'traite')}
    `);
  }

  if (code.includes('Composants backend')) {
    const comps = [
      ['Projects', 65, 70], ['Videos', 185, 70], ['Annotations', 305, 70], ['Statistics', 445, 70], ['Exports', 565, 70],
      ['Assemblage', 65, 150], ['Video Service', 205, 150], ['Stats Service', 350, 150], ['Job Manager', 495, 150],
      ['JSON Store', 205, 225], ['FFmpeg', 390, 225],
    ];
    return svg(760, 330, `
      <text x="380" y="24" text-anchor="middle" font-size="15" font-weight="700">C4 niveau 3 - Composants backend</text>
      <rect x="30" y="42" width="700" height="248" rx="10" fill="#f8fafc" stroke="#cbd5e1"/>
      ${comps.map(([t, x, y]) => box(x, y, 105, 45, t, '', '#ffffff')).join('')}
      ${arrow(117, 172, 205, 172)}
      ${arrow(310, 172, 390, 247)}
      ${arrow(548, 172, 390, 247)}
      ${arrow(257, 247, 205, 247)}
      <text x="380" y="310" text-anchor="middle" font-size="10.5" fill="#475569">Les routers exposent l'API REST ; les services exécutent la logique métier et les traitements vidéo.</text>
    `);
  }

  if (code.includes('App React')) {
    return svg(760, 320, `
      <text x="380" y="24" text-anchor="middle" font-size="15" font-weight="700">Composants frontend principaux</text>
      ${box(310, 45, 140, 48, 'App React', 'Routes + providers', '#dbeafe')}
      ${box(60, 125, 115, 48, 'Projets', 'CRUD + upload', '#ffffff')}
      ${box(205, 125, 115, 48, 'Annotation', 'lecteur + liste', '#ffffff')}
      ${box(350, 125, 115, 48, 'Statistiques', 'BPM + graphes', '#ffffff')}
      ${box(495, 125, 115, 48, 'Assemblage', 'timeline + export', '#ffffff')}
      ${box(145, 225, 125, 48, 'Stores Zustand', 'état UI', '#ecfeff')}
      ${box(330, 225, 125, 48, 'Clients API', 'REST', '#dcfce7')}
      ${box(515, 225, 125, 48, 'FastAPI', 'backend', '#fef3c7')}
      ${arrow(330, 93, 118, 125)}
      ${arrow(350, 93, 263, 125)}
      ${arrow(390, 93, 408, 125)}
      ${arrow(430, 93, 553, 125)}
      ${arrow(408, 173, 392, 225)}
      ${arrow(455, 249, 515, 249, 'HTTP')}
      ${arrow(263, 173, 208, 225)}
    `);
  }

  if (code.includes('Docker Compose')) {
    return svg(760, 290, `
      <text x="380" y="24" text-anchor="middle" font-size="15" font-weight="700">Déploiement local Docker Compose</text>
      <rect x="30" y="45" width="700" height="210" rx="12" fill="#f8fafc" stroke="#cbd5e1"/>
      <text x="55" y="70" font-size="12" font-weight="700" fill="#334155">Machine locale utilisateur</text>
      ${box(65, 115, 120, 55, 'Navigateur', 'localhost:3000', '#eff6ff')}
      <rect x="250" y="85" width="220" height="110" rx="10" fill="#ffffff" stroke="#94a3b8"/>
      <text x="360" y="107" text-anchor="middle" font-size="12" font-weight="700">Docker Compose</text>
      ${box(275, 125, 75, 45, 'Frontend', 'Nginx', '#dbeafe')}
      ${box(370, 125, 75, 45, 'Backend', 'FastAPI', '#dcfce7')}
      ${box(540, 80, 130, 45, 'db_data', 'projects.json', '#f1f5f9')}
      ${box(540, 145, 130, 45, 'videos_data', 'fichiers vidéo', '#f1f5f9')}
      ${box(540, 210, 130, 35, 'temp', 'exports', '#fef3c7')}
      ${arrow(185, 142, 275, 147)}
      ${arrow(350, 147, 370, 147, 'API')}
      ${arrow(445, 147, 540, 102)}
      ${arrow(445, 147, 540, 167)}
      ${arrow(445, 147, 540, 227)}
    `);
  }

  return `<pre><code>${escapeHtml(code)}</code></pre>`;
}

function parseMarkdown(source) {
  const lines = source.split(/\r?\n/);
  let html = '';
  let i = 0;

  function closeParagraph(buffer) {
    if (buffer.length) {
      html += `<p>${inline(buffer.join(' '))}</p>\n`;
      buffer.length = 0;
    }
  }

  const paragraph = [];
  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      closeParagraph(paragraph);
      const lang = line.slice(3).trim();
      i += 1;
      const code = [];
      while (i < lines.length && !lines[i].startsWith('```')) {
        code.push(lines[i]);
        i += 1;
      }
      if (lang === 'mermaid') html += renderDiagram(code.join('\n'));
      else html += `<pre><code>${escapeHtml(code.join('\n'))}</code></pre>\n`;
      i += 1;
      continue;
    }

    if (!line.trim()) {
      closeParagraph(paragraph);
      i += 1;
      continue;
    }

    if (line.trim() === '---') {
      closeParagraph(paragraph);
      html += '<hr/>\n';
      i += 1;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      closeParagraph(paragraph);
      const level = heading[1].length;
      html += `<h${level}>${inline(heading[2])}</h${level}>\n`;
      i += 1;
      continue;
    }

    if (line.startsWith('> ')) {
      closeParagraph(paragraph);
      html += `<blockquote>${inline(line.slice(2))}</blockquote>\n`;
      i += 1;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      closeParagraph(paragraph);
      html += '<ul>\n';
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        html += `<li>${inline(lines[i].replace(/^\s*[-*]\s+/, ''))}</li>\n`;
        i += 1;
      }
      html += '</ul>\n';
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      closeParagraph(paragraph);
      html += '<ol>\n';
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        html += `<li>${inline(lines[i].replace(/^\s*\d+\.\s+/, ''))}</li>\n`;
        i += 1;
      }
      html += '</ol>\n';
      continue;
    }

    if (line.trim().startsWith('|')) {
      closeParagraph(paragraph);
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].trim());
        i += 1;
      }
      const filtered = rows.filter((row) => !/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(row));
      html += '<table>\n';
      filtered.forEach((row, index) => {
        const cells = row.replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
        html += '<tr>' + cells.map((cell) => index === 0 ? `<th>${inline(cell)}</th>` : `<td>${inline(cell)}</td>`).join('') + '</tr>\n';
      });
      html += '</table>\n';
      continue;
    }

    paragraph.push(line.trim());
    i += 1;
  }
  closeParagraph(paragraph);
  return html;
}

const body = parseMarkdown(markdown);

const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <title>Rapport de stage - AnnotaRythm</title>
  <style>
    @page { size: A4; margin: 16mm 15mm 17mm 15mm; }
    * { box-sizing: border-box; }
    body {
      color: #111827;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10.7pt;
      line-height: 1.44;
      margin: 0;
    }
    h1, h2, h3 { color: #0f172a; line-height: 1.2; page-break-after: avoid; }
    h1 { font-size: 23pt; margin: 0 0 12px; border-bottom: 2px solid #0f172a; padding-bottom: 10px; }
    h2 { font-size: 16pt; margin: 22px 0 9px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; }
    h3 { font-size: 12.5pt; margin: 16px 0 6px; }
    p { margin: 0 0 8px; text-align: justify; }
    ul, ol { margin: 4px 0 10px 20px; padding: 0; }
    li { margin: 2px 0; }
    blockquote { margin: 10px 0; padding: 9px 12px; background: #f8fafc; border-left: 4px solid #64748b; color: #334155; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0 13px; page-break-inside: avoid; font-size: 9.4pt; }
    th, td { border: 1px solid #cbd5e1; padding: 5px 6px; vertical-align: top; }
    th { background: #e2e8f0; text-align: left; color: #0f172a; }
    tr:nth-child(even) td { background: #f8fafc; }
    code { font-family: "DejaVu Sans Mono", Consolas, monospace; font-size: 9pt; background: #f1f5f9; padding: 1px 3px; border-radius: 3px; }
    pre { white-space: pre-wrap; word-break: break-word; background: #0f172a; color: #e2e8f0; padding: 10px; border-radius: 6px; font-size: 8.5pt; page-break-inside: avoid; }
    pre code { background: transparent; color: inherit; padding: 0; }
    hr { border: 0; border-top: 1px solid #cbd5e1; margin: 14px 0; }
    .diagram { margin: 10px 0 14px; page-break-inside: avoid; border: 1px solid #cbd5e1; border-radius: 8px; padding: 5px; background: #ffffff; }
    .diagram svg { width: 100%; height: auto; display: block; }
    strong { color: #0f172a; }
  </style>
</head>
<body>
${body}
</body>
</html>`;

fs.writeFileSync(outputPath, html, 'utf8');
console.log(outputPath);
