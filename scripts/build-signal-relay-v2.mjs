// Focused maintenance of the retained Claude Code remix; no mechanics/generator changes.
import {readFileSync,writeFileSync} from 'node:fs';
const original=new URL('../examples/remixes/signal-garden-relay.html',import.meta.url);
let html=readFileSync(original,'utf8');
function replace(before,after){if(html.split(before).length!==2)throw Error('Unexpected original source: '+before.slice(0,60));html=html.replace(before,after);}
replace('Light the whole grid. Every tile changes itself and its horizontal and vertical neighbours.','Click or tap a tile to flip it and its horizontal and vertical neighbours. Win by turning ALL lights ON; a dark board is not the goal.');
replace('<p>Click or tap','<p id="instructions">Click or tap');
replace('<span>Lit: <output id="lit">0/25</output></span></div><div id="board" role="group" aria-label="Signal grid"></div><div id="status" aria-live="polite"></div>','<span>Lit: <output id="lit">0/25</output></span><span id="goal">Goal: ALL 25 LIGHTS ON</span></div><div id="status" role="status" aria-live="polite" aria-atomic="true"></div><div id="board" role="group" aria-label="Signal grid" aria-describedby="instructions goal"></div>');
replace('.counters{display:flex;gap:18px;justify-content:center;font-weight:700}#status{min-height:1.4em;margin-top:8px;color:#d7f783}', '.counters{display:flex;flex-wrap:wrap;gap:8px 18px;justify-content:center;font-weight:700}#goal{flex-basis:100%;color:#d7f783}#status{min-height:1.4em;margin:8px auto;color:#d7f783;max-width:420px}#status.complete{padding:14px;border:2px solid #d7f783;border-radius:10px;background:#244034;color:#f4f2dc;font-size:20px;font-weight:800}#board.complete{outline:3px solid #d7f783;outline-offset:7px;box-shadow:0 0 24px #d7f755}.tile[aria-disabled="true"]{cursor:default}.tile[aria-disabled="true"]:focus-visible{outline:3px solid white;outline-offset:3px}');
replace("b.disabled=solved;", "b.setAttribute('aria-disabled',String(solved));");
replace("status.textContent=solved?'Garden restored in '+moves+' moves!':'';", "document.getElementById('goal').textContent='Goal: ALL '+cells.length+' LIGHTS ON';status.classList.toggle('complete',solved);board.classList.toggle('complete',solved);status.textContent=solved?'Garden restored — all '+cells.length+' lights on! Solved in '+moves+' moves.':'';");
replace('function move(i){history.push', 'function move(i){if(cells.every(Boolean))return;history.push');
replace('Signal Garden by Game Commons (MIT). Remixed by Claude Code for Captain / Game Commons from Signal Garden v1.</footer>', 'Signal Garden by Game Commons (MIT). Original remix by Claude Code from Signal Garden v1. Goal and victory feedback update by GameCommons dev.</footer>');
replace('Released under the same MIT License as above.', 'Released under the same MIT License as above.\nMaintenance v2 by GameCommons dev: explicit all-lit goal and accessible victory presentation; original puzzle rules retained.');
writeFileSync(new URL('../examples/remixes/signal-garden-relay-v2.html',import.meta.url),html);
console.log('Built Signal Garden Relay maintenance v2; original file unchanged.');
