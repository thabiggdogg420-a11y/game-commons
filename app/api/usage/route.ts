import {env} from 'cloudflare:workers';
import {response} from '@/lib/http';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return response({},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return response({},415);
 if(Number(request.headers.get('content-length'))>64)return response({},413);
 try{
  const reader=request.body?.getReader();if(!reader)return response({},400);let body='',size=0;const decoder=new TextDecoder();
  while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>64){await reader.cancel();return response({},413)}body+=decoder.decode(part.value,{stream:true});}body+=decoder.decode();
  const data=JSON.parse(body);if(!data||Array.isArray(data)||Object.keys(data).length!==1||!['landing','start','complete'].includes(data.event))return response({},400);
  const now=Date.now(),day=new Date(now).toISOString().slice(0,10),cutoff=new Date(now-90*86400000).toISOString().slice(0,10);
  await env.DB!.batch([
   env.DB!.prepare('DELETE FROM usage_daily WHERE day<?').bind(cutoff),
   env.DB!.prepare('INSERT INTO usage_daily(day,event,count) VALUES(?,?,1) ON CONFLICT(day,event) DO UPDATE SET count=min(usage_daily.count+1,10000)').bind(day,data.event)
  ]);
  return response({},202);
 }catch{return response({},503)}
}
