'use client';
import type {RemixReturnSeed} from '@/lib/slipstream-workflow';
import {useRef,useState,type FormEvent} from 'react';
import {recordUsage} from '@/app/usage-tracker';
import {trackTraffic} from '../traffic-tracker';
export default function RemixReturnForm({seed}:{seed?:RemixReturnSeed}={}){
 const submission=useRef<string|null>(null);
 const [parents,setParents]=useState([0]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[receipt,setReceipt]=useState('');
 const nextParent=useRef(1);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  const data=new FormData(event.currentTarget);submission.current??=crypto.randomUUID();setBusy(true);setError('');
  const get=(key:string)=>String(data.get(key)??'');
  const remixReturn={title:get('title'),sourceUrl:get('sourceUrl'),sourceRevision:get('sourceRevision'),buildUrl:get('buildUrl'),parents:parents.map(id=>({sourceUrl:get('parent-source-'+id),revision:get('parent-revision-'+id),credit:get('parent-credit-'+id)})),credits:get('credits'),codeTerms:get('codeTerms'),assetTerms:get('assetTerms'),instructions:get('instructions'),validation:get('validation'),rightsConfirmed:data.get('rightsConfirmed')==='on'};
  try{
   await trackTraffic();const session=await fetch('/api/feedback',{cache:'no-store'});if(!session.ok)throw Error('Could not prepare your submission. Please retry.');
   const response=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({submissionId:submission.current,remixReturn})});
   const result=await response.json() as {error?:string;feedback?:{id:string}};
   if(!response.ok||!result.feedback?.id)throw Error(result.error||'Could not save your brief. Please retry.');setReceipt(result.feedback.id);recordUsage('complete');
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 if(receipt)return <div role="status" className="feedback-success"><span className="eyebrow">SAVED FOR PRIVATE REVIEW</span><h2>Your remix brief is in the inbox.</h2><p>It has not been published or approved. Keep this reference for the curator.</p><small>Reference: <code>{receipt}</code></small><a className="primary" href="/projects">Explore more starting points</a></div>;
 return <form className="feedback-form" onSubmit={submit} onChange={()=>{submission.current=null}}><fieldset disabled={busy}>
  <label>Remix title<input name="title" required maxLength={80}/></label>
  <label>Complete source repository or archive URL<input name="sourceUrl" type="url" required maxLength={300} placeholder="https://…"/></label>
  <label>Your source commit or immutable release<input name="sourceRevision" required maxLength={100} placeholder="Exact commit, archive SHA-256 or immutable release"/></label>
  <label>Playable build or release URL<input name="buildUrl" type="url" required maxLength={300} placeholder="https://…"/></label>
  <h2>Where it began</h2><p>Include each direct parent you adapted. Retain earlier ancestors and notices in your source.</p>
  {parents.map((id,index)=><section className="remix-return-parent" key={id} aria-label={'Parent '+(index+1)}><h3>Parent {index+1}</h3><label>Parent source URL<input name={'parent-source-'+id} type="url" required maxLength={300} defaultValue={id===0?seed?.parent.sourceUrl:undefined}/></label><label>Pinned commit, archive hash or immutable release<input name={'parent-revision-'+id} required maxLength={100} defaultValue={id===0?seed?.parent.revision:undefined}/></label><label>Original creator credit<input name={'parent-credit-'+id} required maxLength={200} defaultValue={id===0?seed?.parent.credit:undefined}/></label>{parents.length>1&&<button type="button" className="text-button" onClick={()=>{setParents(parents.filter(p=>p!==id));submission.current=null}}>Remove parent {index+1}</button>}</section>)}
  {parents.length<4&&<button type="button" className="secondary" onClick={()=>{setParents([...parents,nextParent.current++]);submission.current=null}}>Add another parent</button>}
  <label>Your changes and credits<textarea name="credits" required maxLength={400} rows={3} placeholder="What changed, who made it, and which systems came from each parent"/></label>
  <div className="feedback-columns"><label>Code reuse terms<textarea name="codeTerms" defaultValue={seed?.codeTerms} required maxLength={300} rows={3} placeholder="Licence(s) and locations of notices in the source"/></label><label>Asset reuse terms<textarea name="assetTerms" defaultValue={seed?.assetTerms} required maxLength={300} rows={3} placeholder="Art, audio, fonts and other asset licences; notice locations"/></label></div>
  <label>Reproduce the build and run<textarea name="instructions" required maxLength={800} rows={5} placeholder="Tool versions, dependencies/assets, install/build/run commands. Link to full instructions."/></label>
  <label>What you tested and what remains unverified<textarea name="validation" required maxLength={500} rows={4} placeholder="Actual play/build/test results, device, known issues and untested steps"/></label>
  <label className="remix-return-confirm"><input type="checkbox" name="rightsConfirmed" required/> I may share these references and have recorded the code and asset reuse terms, preserving original credits and notices.</label>
  <small>Keep the complete brief within 3000 characters, including links and headings. Link to full documentation for longer notes.</small>
  {error&&<p className="error" role="alert">{error} Your text is still here.</p>}
  <div className="review-actions"><button type="submit" className="primary">{busy?'Sending…':'Send for private review'}</button><small>Shares the guest feedback allowance: 5 messages per UTC day.</small></div>
 </fieldset></form>;
}
