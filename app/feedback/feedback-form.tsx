'use client';
import {recordUsage} from '@/app/usage-tracker';
import {trackTraffic} from '../traffic-tracker';
import {useRef,useState,type FormEvent} from 'react';
export default function FeedbackForm(){
 const submission=useRef<string|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[receipt,setReceipt]=useState('');
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  const data=new FormData(event.currentTarget);submission.current??=crypto.randomUUID();setBusy(true);setError('');
  try{await trackTraffic();const session=await fetch('/api/feedback',{cache:'no-store'});if(!session.ok)throw Error('Could not prepare feedback. Please retry.');
   const r=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({submissionId:submission.current,category:data.get('category'),area:data.get('area'),message:data.get('message'),device:data.get('device')})});
   const j=await r.json() as {error?:string;feedback?:{id:string}};
   if(!r.ok||!j.feedback?.id)throw Error(j.error||'Could not save feedback. Please retry.');setReceipt(j.feedback.id);recordUsage('complete');
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 if(receipt)return <div role="status" className="feedback-success"><span className="eyebrow">FEEDBACK RECEIVED</span><h2>Thanks for helping us improve.</h2><p>Your message is saved in our private review inbox.</p><small>Reference: <code>{receipt}</code></small><div className="review-actions"><a className="primary" href="/">Back to the games</a><button className="text-button" onClick={()=>{setReceipt('');submission.current=null}}>Send another message</button></div></div>;
 return <form className="feedback-form" onSubmit={submit} onChange={()=>{submission.current=null}}><fieldset disabled={busy}><div className="feedback-columns"><label>What kind of feedback?<select name="category" required><option value="bug">Something is broken</option><option value="confusing">Something is confusing</option><option value="suggestion">I have a suggestion</option><option value="other">Something else</option></select></label><label>Which part of the site?<select name="area" required><option value="general">General experience</option><option value="playing">Playing a game</option><option value="finding">Finding games</option><option value="contributing">Uploading or updating</option><option value="remixing">Remixing and credits</option><option value="assistants">Connecting an assistant</option></select></label></div><label>Your feedback<textarea name="message" rows={7} required minLength={10} maxLength={3000} aria-describedby="feedback-help" placeholder="What were you trying to do? What happened? What would have helped? Include the game title if relevant."/></label><small id="feedback-help">10–3000 characters. For a bug, include the steps that led to it.</small><label>Device and browser <span className="muted">(optional)</span><input name="device" maxLength={200} placeholder="For example: Samsung phone, Chrome" autoComplete="off"/></label>{error&&<p className="error" role="alert">{error} Your text is still here.</p>}<div className="review-actions"><button className="primary" type="submit">{busy?'Sending…':'Send feedback'}</button><small>Up to 5 messages per browser or signed-in account per UTC day.</small></div></fieldset></form>;
}
