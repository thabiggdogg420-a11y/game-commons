import {prepareTraffic,recordTraffic} from '@/lib/traffic';
import {readBody,response} from '@/lib/http';
import {RepositoryError} from '@/lib/limits';
export const dynamic='force-dynamic';
export async function GET(request:Request){const r=response({ready:true});const cookie=prepareTraffic(request);if(cookie)r.headers.set('Set-Cookie',cookie);return r}
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return response({error:'Use the Game Commons site.'},403);
 if(Number(request.headers.get('content-length'))>2048)return response({error:'Traffic request too large.'},413);
 try{const input=await readBody(request);if(JSON.stringify(input).length>2048)return response({error:'Traffic request too large.'},413);return response(await recordTraffic(request,input))}
 catch(e){return response({error:e instanceof RepositoryError?e.message:'Traffic could not be recorded.'},e instanceof RepositoryError?e.status:503)}
}
