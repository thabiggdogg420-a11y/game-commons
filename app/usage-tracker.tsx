'use client';
import {useEffect} from 'react';
import {createUsageSender} from '@/lib/usage-client.mjs';
let recorder:((event:string)=>void)|undefined;
export function recordUsage(event:string){
 if(typeof window==='undefined')return;
 const params=new URLSearchParams(location.search);
 if(params.get('gc_test')==='1'||params.get('measurement_test')==='1')return;
 recorder??=createUsageSender(fetch.bind(window),params.get('gc_test')==='1'||params.get('measurement_test')==='1'||/^\/(traffic|feedback\/inbox|moderation)(\/|$)/.test(location.pathname));
 recorder(event);
}
export default function UsageTracker(){useEffect(()=>{
 recordUsage('landing');
 const qa=new URLSearchParams(location.search);const excluded=qa.get('gc_test')==='1'||qa.get('measurement_test')==='1';
 function click(event:MouseEvent){const element=(event.target as Element)?.closest?.('[data-usage],a');if(!element)return;
  if((excluded||/[?&](?:gc_test|measurement_test)=1(?:&|$)/.test(location.search))&&element instanceof HTMLAnchorElement){const url=new URL(element.href,location.href);if(url.origin===location.origin){url.searchParams.set('measurement_test','1');element.href=url.href;}}
  const name=element.getAttribute('data-usage');if(name)recordUsage(name);
  else if(element instanceof HTMLAnchorElement){const url=new URL(element.href,location.href);if(url.origin===location.origin&&(element.hasAttribute('download')||/\.(zip|tar\.gz|exe|dmg)$/.test(url.pathname)||url.searchParams.get('download')==='1'))recordUsage('start');}
 }
 document.addEventListener('click',click,true);return()=>document.removeEventListener('click',click,true);
},[]);return null}
