import {checkGithub,githubRepo} from '@/lib/github-project';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!githubRepo(id))return Response.json({error:'Reviewed project not found.'},{status:404});
 const cache=(globalThis.caches as CacheStorage & {default?:Cache})?.default,key=new Request(new URL('/api/projects/'+id+'/github',request.url));
 try{const hit=await cache?.match(key);if(hit)return hit;}catch{}
 const result=await checkGithub(id),response=Response.json(result,{headers:{'Cache-Control':'public, max-age='+(result?.source==='github'?21600:120),'X-Content-Type-Options':'nosniff'}});
 try{await cache?.put(key,response.clone());}catch{}return response;
}
