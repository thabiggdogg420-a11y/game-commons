 'use client';
import {useEffect} from 'react';
import {referralPayload} from '@/lib/traffic-referral';
let pending:Promise<boolean>|undefined;let pendingKey="";
export function trackTraffic(){
 if(['/traffic','/feedback/inbox','/moderation'].some(p=>window.location.pathname.startsWith(p)))return Promise.resolve(false);
 let stored:string|null=null;try{stored=sessionStorage.getItem('gc-referral')}catch{}
 const {saved,payload}=referralPayload(window.location.search,document.referrer,stored,Date.now(),window.location.pathname);
 // Capture before the first network await so rapid navigation cannot lose a tag.
 try{if(saved)sessionStorage.setItem('gc-referral',JSON.stringify(saved));else sessionStorage.removeItem('gc-referral')}catch{}
 const key=JSON.stringify([saved?.source,saved?.medium,saved?.campaign,saved?.content,payload.referrer,payload.isTest]);
 if(pending&&pendingKey===key)return pending;
 const previous=pending;pendingKey=key;
 // No full URL, game source, referrer path, account, IP or device details are sent.
 pending=(async()=>{if(previous)await previous;try{const init=await fetch('/api/traffic',{cache:'no-store',signal:AbortSignal.timeout(5000)});if(!init.ok)throw Error();const r=await fetch('/api/traffic',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(5000),keepalive:true,body:JSON.stringify(payload)});if(!r.ok)throw Error();return true}catch{if(pendingKey===key)pending=undefined;return false}})();return pending;
}
export default function TrafficTracker(){useEffect(()=>{void trackTraffic()},[]);return null}
