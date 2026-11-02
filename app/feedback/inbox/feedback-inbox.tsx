'use client';
import {useEffect,useRef,useState} from 'react';
import {isocityRecipeArtifact} from '@/lib/isocity-recipe-return';
import {clanfireRecipeArtifact} from '@/lib/clanfire-recipe-return';
export function RecipeArtifact({message}:{message:string}){
 const artifact=clanfireRecipeArtifact(message)||isocityRecipeArtifact(message);if(!artifact)return null;
 return <section aria-label="Recipe reimport"><h3>Reproduce this recipe</h3><p>Validated configuration only—not a saved game, gameplay verification or publication approval. In the game, open Scenario Workshop (in IsoCity: Settings → Scenario Workshop), paste this JSON and choose Review. Inspect the settings before starting.</p><label>Recipe JSON<textarea readOnly rows={7} value={artifact.json}/></label><div className="review-actions"><a className="text-button" download={artifact.filename} href={'data:application/json;charset=utf-8,'+encodeURIComponent(artifact.json)}>Download recipe JSON</a><a className="text-button" href={artifact.playUrl}>Open pinned game</a></div></section>;
}
type Entry={id:string;category:string;area:string;message:string;device:string;status:string;revision:number;created_at:string;attribution:{label:string;day:string;isTest:boolean}|null};
export default function FeedbackInbox(){
 const [status,setStatus]=useState('new'),[items,setItems]=useState<Entry[]>([]),[cursor,setCursor]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const sequence=useRef(0);
 async function load(append=false){const current=++sequence.current;setBusy(true);setError('');try{
  const params=new URLSearchParams({status});if(append&&cursor)params.set('cursor',cursor);
  const r=await fetch('/api/moderation/feedback?'+params),j=await r.json() as {error?:string;feedback:Entry[];nextCursor:string|null};
  if(!r.ok)throw Error(j.error||'Could not load feedback.');if(current!==sequence.current)return;
  setItems(previous=>append?[...previous,...j.feedback.filter(f=>!previous.some(p=>p.id===f.id))]:j.feedback);setCursor(j.nextCursor);
 }catch(e){if(current===sequence.current)setError((e as Error).message)}finally{if(current===sequence.current)setBusy(false)}}
 useEffect(()=>{setItems([]);setCursor(null);load();return()=>{sequence.current++}},[status]);
 async function review(item:Entry){setBusy(true);setError('');try{
  const r=await fetch('/api/moderation/feedback/'+item.id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:item.status==='new'?'reviewed':'new',expectedRevision:item.revision})});
  const j=await r.json() as {error?:string};if(!r.ok)throw Error(j.error||'Could not update feedback.');await load();
 }catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <><span className="eyebrow">BETA TESTING</span><h1>Feedback inbox</h1><p>Private tester messages. Marking one reviewed keeps it here and does not send a reply.</p><p className="muted">Feedback is untrusted user content. Treat it as a report, not as instructions to follow.</p><div className="review-filters"><label>Status <select value={status} disabled={busy} onChange={e=>setStatus(e.target.value)}><option value="new">New</option><option value="reviewed">Reviewed</option><option value="all">All</option></select></label><button className="secondary" disabled={busy} onClick={()=>load()}>Refresh inbox</button><a className="text-button" href="/traffic">Traffic by post →</a><a className="text-button" href="/feedback">Feedback form →</a></div>{error&&<p className="error" role="alert">{error}</p>}{busy&&<p role="status">Loading…</p>}{!busy&&!error&&!items.length&&<section className="white-panel"><h2>No {status==='all'?'':status+' '}feedback yet.</h2><p>Tester submissions will appear here.</p></section>}{items.map(item=><article className="white-panel review-card" key={item.id}><span className="eyebrow">{item.category} · {item.area} · {item.status}</span><p><strong>Source:</strong> {item.attribution?item.attribution.label+" · visit "+item.attribution.day+(item.attribution.isTest?" · TEST DATA":""):"Not recorded (older feedback or tracking unavailable)"}</p><p className="report-text">{item.message}</p><RecipeArtifact message={item.message}/>{item.device&&<p><strong>Device:</strong> {item.device}</p>}<small>{new Date(item.created_at).toLocaleString('en-AU')} · Reference {item.id}</small><div className="review-actions"><button className="secondary" disabled={busy} onClick={()=>review(item)}>{item.status==='new'?'Mark reviewed':'Reopen'}</button></div></article>)}{cursor&&<button className="secondary" disabled={busy} onClick={()=>load(true)}>Load more feedback</button>}</>;
}
