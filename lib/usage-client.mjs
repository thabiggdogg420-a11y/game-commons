// No persistent state, identifiers, cookies, referrers or app content.
export function createUsageSender(send, excluded=false) {
 const attempted=new Set();
 return function record(event) {
  if(excluded||!['landing','start','complete'].includes(event)||attempted.has(event))return;
  attempted.add(event); // Never retry: a lost response may already have counted.
  try { Promise.resolve(send('/api/usage',{method:'POST',credentials:'omit',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json'},body:JSON.stringify({event}),keepalive:true})).catch(()=>{}); } catch {}
 };
}
