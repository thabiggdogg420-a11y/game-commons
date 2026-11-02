import type { Game } from "./contracts";
export const starters: (Game & {source: string})[] = [
  {
    "id": "orbital-drift",
    "title": "Orbital Drift",
    "description": "Thread a small spacecraft through a field of falling asteroids. Survive for 45 seconds and collect the highest score.",
    "creator": "Game Commons",
    "genre": "Arcade",
    "tags": [
      "space",
      "survival",
      "dodging",
      "touch",
      "single-player"
    ],
    "controls": "Move the pointer, drag on the canvas, or use Left and Right arrows. Press Start to begin.",
    "license": "MIT",
    "attribution": "Original starter game created with ChatGPT for Game Commons. No external assets.",
    "parentId": null,
    "parentVersion": null,
    "createdAt": "2026-10-19T00:00:00.000Z",
    "updatedAt": "2026-10-19T00:00:00.000Z",
    "latestVersion": 1,
    "starter": true,
    "source": "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Orbital Drift</title><style>*{box-sizing:border-box}body{margin:0;background:#101d28;color:#f4f2dc;font:16px system-ui;text-align:center;padding:18px}h1{font-size:22px;margin:0 0 8px}p{color:#aabcc4;font-size:13px}button{border:0;border-radius:8px;padding:10px 20px;background:#d7f783;color:#17232a;font-weight:700;cursor:pointer}canvas{display:block;width:100%;max-width:600px;margin:12px auto;border-radius:12px;touch-action:none}button:focus-visible{outline:3px solid white;outline-offset:3px}</style></head><body><h1>Orbital Drift</h1><p>Stay clear of the asteroids for 45 seconds.</p><button id=\"start\">Start flight</button><canvas id=\"game\" width=\"600\" height=\"400\" aria-label=\"Asteroid dodging game\"></canvas><div id=\"status\" aria-live=\"polite\">Ready for launch</div><script>\nconst c=document.getElementById('game'),ctx=c.getContext('2d'),status=document.getElementById('status');let x=300,rocks=[],running=false,elapsed=0,prev=0,spawn=0,keys={};\nfunction move(e){const r=c.getBoundingClientRect();x=Math.max(15,Math.min(585,(e.clientX-r.left)*600/r.width))}c.onpointermove=move;c.onpointerdown=e=>{move(e);c.setPointerCapture(e.pointerId)};onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();keys[e.key]=true}};onkeyup=e=>keys[e.key]=false;\ndocument.getElementById('start').onclick=()=>{x=300;rocks=[];elapsed=0;spawn=0;running=true;status.textContent='Flight in progress';document.getElementById('start').textContent='Restart flight'};\nfunction frame(t){let dt=Math.min((t-prev)/1000,.04);prev=t;ctx.fillStyle='#101d28';ctx.fillRect(0,0,600,400);for(let i=0;i<55;i++){ctx.fillStyle=i%3?'#42616e':'#aecbd1';ctx.fillRect((i*137)%600,(i*79+elapsed*18)%400,2,2)}if(running){elapsed+=dt;spawn+=dt;x=Math.max(15,Math.min(585,x+((keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0))*320*dt));if(spawn>.34){rocks.push({x:20+Math.random()*560,y:-20,r:10+Math.random()*13});spawn=0}for(const a of rocks){a.y+=(100+elapsed*2)*dt;if(Math.hypot(x-a.x,350-a.y)<a.r+10){running=false;status.textContent='Collision! Survived '+elapsed.toFixed(1)+' seconds. Try again.'}}rocks=rocks.filter(a=>a.y<440);if(elapsed>=45&&running){running=false;status.textContent='Flight complete! You survived the asteroid field.'}}for(const a of rocks){ctx.fillStyle='#e77d4f';ctx.beginPath();ctx.arc(a.x,a.y,a.r,0,7);ctx.fill();ctx.strokeStyle='#ffb083';ctx.stroke()}ctx.fillStyle='#d7f783';ctx.beginPath();ctx.moveTo(x,335);ctx.lineTo(x-12,367);ctx.lineTo(x,360);ctx.lineTo(x+12,367);ctx.closePath();ctx.fill();ctx.fillStyle='#d7e4e6';ctx.font='14px monospace';ctx.fillText('SURVIVAL '+elapsed.toFixed(1)+' / 45',16,24);requestAnimationFrame(frame)}requestAnimationFrame(frame);\n</script></body></html>"
  },
  {
    "id": "signal-garden",
    "title": "Signal Garden",
    "description": "Restore a darkened signal grid. Each tile flips itself and its four neighbours; light every tile to solve the board.",
    "creator": "Game Commons",
    "genre": "Puzzle",
    "tags": [
      "logic",
      "grid",
      "turn-based",
      "touch",
      "single-player"
    ],
    "controls": "Tap or click tiles. Each move flips that tile and its horizontal and vertical neighbours. Light every tile.",
    "license": "MIT",
    "attribution": "Original starter game created with ChatGPT for Game Commons. No external assets.",
    "parentId": null,
    "parentVersion": null,
    "createdAt": "2026-10-19T00:00:00.000Z",
    "updatedAt": "2026-10-19T00:00:00.000Z",
    "latestVersion": 1,
    "starter": true,
    "source": "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Signal Garden</title><style>*{box-sizing:border-box}body{margin:0;background:#101d28;color:#f4f2dc;font:16px system-ui;text-align:center;padding:18px}h1{font-size:22px;margin:0 0 8px}p{color:#aabcc4;font-size:13px}button{border:0;border-radius:8px;padding:10px 20px;background:#d7f783;color:#17232a;font-weight:700;cursor:pointer}canvas{display:block;width:100%;max-width:600px;margin:12px auto;border-radius:12px;touch-action:none}button:focus-visible{outline:3px solid white;outline-offset:3px}</style></head><body><h1>Signal Garden</h1><p>Light the whole grid. Every tile changes its neighbours.</p><div id=\"board\" style=\"display:grid;grid-template-columns:repeat(5,1fr);gap:9px;max-width:350px;margin:24px auto\"></div><div id=\"status\" aria-live=\"polite\"></div><button id=\"reset\" style=\"margin-top:20px\">New puzzle</button><script>\nlet cells=Array(25).fill(true),moves=0;const board=document.getElementById('board'),status=document.getElementById('status');\nfunction flip(i){const r=Math.floor(i/5),c=i%5;[i,r>0?i-5:-1,r<4?i+5:-1,c>0?i-1:-1,c<4?i+1:-1].filter(n=>n>=0).forEach(n=>cells[n]=!cells[n])}\nfunction draw(){board.replaceChildren();cells.forEach((on,i)=>{let b=document.createElement('button');b.textContent=on?'✦':'·';b.style.cssText='aspect-ratio:1;padding:0;font-size:30px;background:'+(on?'#d7f783':'#263944')+';color:'+(on?'#244034':'#729190');b.setAttribute('aria-label','Tile '+(i+1)+(on?' lit':' dark'));b.onclick=()=>{flip(i);moves++;draw()};board.append(b)});status.textContent=cells.every(Boolean)?'Garden restored in '+moves+' moves!':moves+' moves · '+cells.filter(Boolean).length+'/25 lit'}\nfunction reset(){cells.fill(true);moves=0;for(let i=0;i<12;i++)flip(Math.floor(Math.random()*25));if(cells.every(Boolean))flip(12);draw()}document.getElementById('reset').onclick=reset;reset();\n</script></body></html>"
  },
  {
    "id": "pocket-orchard",
    "title": "Pocket Orchard",
    "description": "Grow a tiny orchard one plot at a time. Plant seeds, watch trees grow, and harvest fruit to reach twenty coins.",
    "creator": "Game Commons",
    "genre": "Simulation",
    "tags": [
      "farming",
      "relaxing",
      "resource-management",
      "touch",
      "single-player"
    ],
    "controls": "Tap an empty plot to plant for 1 coin. After 6 seconds, tap the ripe tree to harvest 3 coins. Reach 20 coins.",
    "license": "MIT",
    "attribution": "Original starter game created with ChatGPT for Game Commons. No external assets.",
    "parentId": null,
    "parentVersion": null,
    "createdAt": "2026-10-19T00:00:00.000Z",
    "updatedAt": "2026-10-19T00:00:00.000Z",
    "latestVersion": 1,
    "starter": true,
    "source": "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Pocket Orchard</title><style>*{box-sizing:border-box}body{margin:0;background:#101d28;color:#f4f2dc;font:16px system-ui;text-align:center;padding:18px}h1{font-size:22px;margin:0 0 8px}p{color:#aabcc4;font-size:13px}button{border:0;border-radius:8px;padding:10px 20px;background:#d7f783;color:#17232a;font-weight:700;cursor:pointer}canvas{display:block;width:100%;max-width:600px;margin:12px auto;border-radius:12px;touch-action:none}button:focus-visible{outline:3px solid white;outline-offset:3px}</style></head><body><h1>Pocket Orchard</h1><p>Plant for 1 coin. Harvest for 3. Grow your way to 20.</p><div id=\"status\" aria-live=\"polite\"></div><div id=\"plots\" style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:10px;max-width:420px;margin:22px auto\"></div><button id=\"reset\">Start over</button><script>\nlet coins=5,plots=Array(12).fill(null),won=false;const root=document.getElementById('plots'),status=document.getElementById('status');\nfunction draw(){root.replaceChildren();plots.forEach((p,i)=>{const ripe=p!==null&&Date.now()-p>=6000;const b=document.createElement('button');b.style.cssText='aspect-ratio:1;padding:4px;background:'+(ripe?'#d7f783':'#263e36')+';color:'+(ripe?'#243a2e':'#cee5bb')+';font-size:26px';b.textContent=p===null?'+':ripe?'●':'♧';b.setAttribute('aria-label','Plot '+(i+1)+(p===null?' empty':ripe?' ready to harvest':' growing'));b.onclick=()=>{if(won)return;if(p===null&&coins>0){coins--;plots[i]=Date.now()}else if(ripe){coins+=3;plots[i]=null}if(coins>=20)won=true;draw()};root.append(b)});status.textContent=won?'Orchard thriving! You earned '+coins+' coins.':'Coins: '+coins+' · '+plots.filter(p=>p!==null).length+' growing'}\ndocument.getElementById('reset').onclick=()=>{coins=5;plots.fill(null);won=false;draw()};setInterval(draw,1000);draw();\n</script></body></html>"
  }
];
