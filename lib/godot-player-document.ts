// Only verified public assets enter this opaque, network-disabled document.
export const godotPlayerDocument=String.raw`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'wasm-unsafe-eval' blob:; style-src 'unsafe-inline'; connect-src 'none'; img-src data: blob:; media-src blob:; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
<title>Isolated Godot player</title><style>html,body{margin:0;height:100%;background:#172126;color:#eff5dd;font:14px system-ui}canvas{display:block;width:100%;height:100%;outline:none}#status{position:absolute;inset:0;display:grid;place-items:center;text-align:center;background:#172126;padding:24px}#status[hidden]{display:none}</style>
<canvas id="canvas" tabindex="0" aria-label="Godot game. Click to focus; use the controls described above the player."></canvas><div id="status" role="status">Waiting for verified game files...</div>
<script>
const status=document.getElementById('status'),canvas=document.getElementById('canvas');
function failure(){status.hidden=false;status.textContent='The isolated game could not start. Reload the player or send feedback.';parent.postMessage({type:'gc-godot-failed'},'*');}
let isolated=true;try{void parent.document;isolated=false;}catch{}canvas.dataset.parentAccess=isolated?'blocked':'allowed';
let started=false;
window.addEventListener('message',async event=>{
 if(event.source!==parent||event.data?.type!=='gc-godot-assets'||started)return;
 started=true;clearInterval(bootTimer);
 if(!isolated){failure();return;}
 try{
  const assets=event.data;
  const files=new Map([['/godot/runtime/4.6/godot.wasm',assets.wasm],[assets.packUrl,assets.pack]]);
  // Godot's preloader gets in-memory files. Unknown requests fail, and CSP
  // independently refuses all actual network access from the iframe.
  window.fetch=async input=>{
   const path=new URL(typeof input==='string'?input:input.url,'https://runtime.invalid/').pathname;
   if(!files.has(path))throw Error('Network request refused');
   return new Response(files.get(path),{headers:{'Content-Type':path.endsWith('.wasm')?'application/wasm':'application/octet-stream'}});
  };
  const script=document.createElement('script');script.textContent=assets.script;document.head.appendChild(script);
  if(typeof Engine==='undefined'){failure();return;}
  const missing=Engine.getMissingFeatures({threads:false});
  if(missing.length){status.textContent='This device cannot run Godot: '+missing.join(', ');parent.postMessage({type:'gc-godot-failed'},'*');return;}
  const engine=new Engine({executable:'/godot/runtime/4.6/godot',mainPack:assets.packUrl,canvas,canvasResizePolicy:2,focusCanvasOnStart:true,persistentPaths:[],ensureCrossOriginIsolationHeaders:false,serviceWorker:null,args:['--audio-driver','Dummy']});
  status.textContent='Starting Godot...';await engine.startGame();status.hidden=true;canvas.focus();parent.postMessage({type:'gc-godot-ready'},'*');
 }catch{failure();}
});
window.addEventListener('error',failure);
const boot=()=>parent.postMessage({type:'gc-godot-boot'},'*');const bootTimer=setInterval(boot,300);boot();
</script></html>`;
