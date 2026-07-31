#!/usr/bin/env node
// ColorProof report generator: reads ~/.colorproof/result.json, writes + opens report.html
const fs = require('fs');
const os = require('os');
const path = require('path');
const HOME = os.homedir();
const resPath = path.join(HOME, '.colorproof', 'result.json');
const outPath = path.join(HOME, '.colorproof', 'report.html');

let data;
try { data = JSON.parse(fs.readFileSync(resPath, 'utf8')); }
catch (e) { console.error('Could not read result.json:', e.message); process.exit(1); }

const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const cmyk2rgb = (c,m,y,k) => { c/=100;m/=100;y/=100;k/=100; const f=v=>Math.round(255*(1-v)*(1-k)); return `rgb(${f(c)},${f(m)},${f(y)})`; };
function chipColor(col){
  if(col.model==='cmyk'&&col.values) return cmyk2rgb(col.values.c,col.values.m,col.values.y,col.values.k);
  if(col.model==='rgb'&&col.values) return `rgb(${col.values.r},${col.values.g},${col.values.b})`;
  if(col.model==='spot'){ const nm=col.name||''; const m=nm.match(/C=(\d+)\s*M=(\d+)\s*Y=(\d+)\s*K=(\d+)/i);
    if(m) return cmyk2rgb(+m[1],+m[2],+m[3],+m[4]);
    if(/white|paper/i.test(nm)) return '#ffffff'; if(/black/i.test(nm)) return '#1a1a1a'; return '#9aa0a6'; }
  if(col.model==='gray') return '#9aa0a6';
  return '#cccccc';
}
const chip = css => `<span class="chip" style="background:${css}"></span>`;
const stat = (label,val) => `<div class="stat"><div class="num">${esc(val==null?'0':val)}</div><div class="lbl">${esc(label)}</div></div>`;
const badge = st => st==='pass'?'<span class="b ok">PASS</span>': st==='fail'?'<span class="b no">FAIL</span>': (st==='neutral')?'<span class="b nu">neutral</span>': (st==='uncheckable')?'<span class="b nu">needs spec</span>':'';
const isFix = data.mode==='package' && data.action==='fix';
const isProof = data.mode==='package' && data.action==='proof';
const hasStatus = isProof && (data.aiColors||[]).some(c=>c.status);

let body = '';
if (isProof) {
  const c = data.counts||{};
  body += `<div class="stats">${stat('.ai',c.aiFiles)}${stat('.pdf',c.pdfFiles)}${stat('.svg',c.svgFiles)}${stat('.jpg',c.jpgFiles)}${stat('.png',c.pngFiles)}</div>`;
  if (data.expected && data.expected.length) {
    body += `<div class="banner">Checking against: ` + data.expected.map(p=>{
      const css = p.cmyk?cmyk2rgb(...p.cmyk):(p.hex?('#'+p.hex.replace(/^#/,'')):'#9aa0a6');
      const spec = p.cmyk?`CMYK ${p.cmyk.join('/')}`:(p.hex?('#'+p.hex.replace(/^#/,'')):(p.pantone||''));
      return `${chip(css)} <b>${esc(p.name||'')}</b> <span class="mono">${esc(spec)}</span>`;
    }).join(' &nbsp;&nbsp; ') + `</div>`;
  }
  if (data.summary) {
    const s=data.summary;
    body += `<div class="stats">${stat('pass',s.pass)}${stat('fail',s.fail)}${stat('neutral',s.neutral)}${stat('needs spec',s.uncheckable)}</div>`;
  }
  body += `<h2>Vector colors found <span class="sub">(.ai files)</span></h2><table><thead><tr><th></th><th>Color</th><th>Stored as</th>${hasStatus?'<th>Check</th>':''}<th>Files</th><th>Instances</th></tr></thead><tbody>`;
  (data.aiColors||[]).forEach(col=>{
    const label = col.model==='spot'? esc(col.name) : col.model==='cmyk'? `CMYK ${col.values.c}/${col.values.m}/${col.values.y}/${col.values.k}` : col.model==='rgb'? `#${[col.values.r,col.values.g,col.values.b].map(n=>n.toString(16).padStart(2,'0')).join('')}` : esc(col.signature);
    const st = hasStatus ? `<td>${badge(col.status)}${col.match?' <span class="mut">'+esc(col.match)+'</span>':''}</td>` : '';
    body += `<tr><td>${chip(chipColor(col))}</td><td class="mono">${label}</td><td>${esc(col.model)}</td>${st}<td>${col.files}</td><td>${col.instances}</td></tr>`;
  });
  body += `</tbody></table>`;
  body += `<h2>Web colors found <span class="sub">(.svg files)</span></h2><table><thead><tr><th></th><th>Hex</th>${hasStatus?'<th>Check</th>':''}<th>Files</th><th>Instances</th></tr></thead><tbody>`;
  (data.svgColors||[]).forEach(col=>{ const st = hasStatus?`<td>${badge(col.status)}</td>`:''; body += `<tr><td>${chip(col.hex)}</td><td class="mono">${esc(col.hex)}</td>${st}<td>${col.files}</td><td>${col.instances}</td></tr>`; });
  body += `</tbody></table>`;
} else if (isFix) {
  const ai=data.ai||[],pdf=data.pdf||[],svg=data.svg||[],jpg=data.jpg||[],png=data.png||[];
  const changed=ai.filter(a=>(a.instancesChanged>0)||(a.removedSwatches&&a.removedSwatches.length)).length;
  const inst=ai.reduce((s,a)=>s+(a.instancesChanged||0),0);
  body += `<div class="stats">${stat('.ai changed',changed)}${stat('instances',inst)}${stat('.pdf',pdf.length)}${stat('.svg',svg.filter(s=>s.replaced>0).length)}${stat('.jpg',jpg.length)}${stat('.png',png.length)}</div>`;
  if(data.snapshotDir) body += `<div class="banner">Backup snapshot &rarr; <code>${esc(data.snapshotDir)}</code></div>`;
  const okrows = arr => arr.map(r=>`<tr><td class="mono">${esc(r.file)}</td><td>${r.px?r.px+'px':''} ${esc(r.mode||'')}</td><td class="${(r.status==='error')?'bad':'good'}">${esc(r.status||'ok')}</td></tr>`).join('');
  body += `<h2>.ai edits</h2><table><thead><tr><th>File</th><th>Swaps</th><th>Instances</th><th>Removed swatches</th></tr></thead><tbody>`;
  ai.forEach(a=>{ const sw=(a.applied||[]).map(x=>esc(x.swap||x.as)).join(', '); body += `<tr><td class="mono">${esc(a.file)}</td><td>${sw||(a.note||'')}</td><td>${a.instancesChanged||0}</td><td class="mono">${(a.removedSwatches||[]).map(esc).join(', ')}</td></tr>`; });
  body += `</tbody></table>`;
  if(pdf.length){ body += `<h2>.pdf re-exported</h2><table><thead><tr><th>File</th><th>Mode</th><th>Status</th></tr></thead><tbody>${okrows(pdf)}</tbody></table>`; }
  if(svg.length){ body += `<h2>.svg swapped</h2><table><thead><tr><th>File</th><th>Replacements</th><th>Status</th></tr></thead><tbody>${svg.map(s=>`<tr><td class="mono">${esc(s.file)}</td><td>${s.replaced||0}</td><td class="${s.status==='error'?'bad':'good'}">${esc(s.status)}</td></tr>`).join('')}</tbody></table>`; }
  if(jpg.length){ body += `<h2>.jpg re-rendered</h2><table><thead><tr><th>File</th><th>Size</th><th>Status</th></tr></thead><tbody>${okrows(jpg)}</tbody></table>`; }
  if(png.length){ body += `<h2>.png re-rendered</h2><table><thead><tr><th>File</th><th>Size</th><th>Status</th></tr></thead><tbody>${okrows(png)}</tbody></table>`; }
} else {
  body += `<pre class="mono">${esc(JSON.stringify(data,null,2))}</pre>`;
}

const title = isFix ? 'Fix' : isProof ? 'Proof' : (data.mode||'Report');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ColorProof &middot; ${esc(title)}</title>
<style>
:root{--bg:#0f1115;--card:#171a21;--line:#262b36;--txt:#e6e8ec;--mut:#9aa0a6;--accent:#c93837}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--txt);font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.wrap{max-width:980px;margin:0 auto;padding:32px 24px 64px}
header{display:flex;align-items:baseline;gap:12px;border-bottom:1px solid var(--line);padding-bottom:16px;margin-bottom:24px}
h1{font-size:22px;margin:0;letter-spacing:.3px}
.badge{font-size:12px;text-transform:uppercase;letter-spacing:.08em;background:var(--accent);color:#fff;padding:3px 9px;border-radius:999px}
.meta{color:var(--mut);font-size:13px;margin-left:auto;text-align:right}
.stats{display:flex;flex-wrap:wrap;gap:12px;margin:8px 0 20px}
.stat{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 18px;min-width:88px}
.stat .num{font-size:24px;font-weight:600}.stat .lbl{color:var(--mut);font-size:12px;margin-top:2px}
h2{font-size:15px;margin:28px 0 10px;color:var(--txt)}h2 .sub{color:var(--mut);font-weight:400;font-size:13px}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden}
th,td{text-align:left;padding:10px 14px;border-bottom:1px solid var(--line);font-size:14px}
th{color:var(--mut);font-weight:500;font-size:12px;text-transform:uppercase;letter-spacing:.05em}
tr:last-child td{border-bottom:none}
.chip{display:inline-block;width:22px;height:22px;border-radius:6px;border:1px solid rgba(255,255,255,.18);vertical-align:middle}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px}.mut{color:var(--mut);font-size:12px}
.b{font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;letter-spacing:.04em}
.b.ok{background:rgba(95,208,138,.15);color:#5fd08a}.b.no{background:rgba(255,107,107,.15);color:#ff6b6b}.b.nu{background:rgba(154,160,166,.15);color:#9aa0a6}
.good{color:#5fd08a}.bad{color:#ff6b6b}
.banner{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:8px;padding:12px 16px;margin:0 0 20px;font-size:13px;color:var(--mut)}
.banner code,.banner b{color:var(--txt)}
footer{color:var(--mut);font-size:12px;margin-top:32px;border-top:1px solid var(--line);padding-top:16px}
</style></head><body><div class="wrap">
<header><h1>ColorProof</h1><span class="badge">${esc(title)}</span><span class="meta">${esc(data.root||data.folder||'')}<br>${esc(data.generatedAt||'')}</span></header>
${body}
<footer>Read-only proof makes no changes. Fixes edit only the colors you swap; originals are snapshotted to the backup home first.</footer>
</div></body></html>`;

fs.writeFileSync(outPath, html, 'utf8');
console.log(outPath);
