import {env} from 'cloudflare:workers';
export const UPLOAD_LIMITS={uploadsPerDay:20,storedBytes:100*1024*1024,sourceBytes:2*1024*1024};
export class RepositoryError extends Error{status:number;constructor(message:string,status=400){super(message);this.status=status}}
export async function usageFor(userId:string,day=new Date().toISOString().slice(0,10)){
 if(!userId)throw new RepositoryError('Sign in to view your usage.',403);
 // Derived from immutable versions, including pre-quota uploads and withdrawn games.
 const row=await env.DB!.prepare(`SELECT COUNT(CASE WHEN substr(v.created_at,1,10)=? THEN 1 END) AS uploadsToday, COALESCE(SUM(v.bytes),0) AS storedBytes FROM versions v JOIN games g ON g.id=v.game_id WHERE g.owner=?`).bind(day,userId).first<{uploadsToday:number;storedBytes:number}>();
 return {uploadsToday:Number(row?.uploadsToday||0),storedBytes:Number(row?.storedBytes||0),day,limits:UPLOAD_LIMITS};
}
export function checkQuota(usage:{uploadsToday:number;storedBytes:number},bytes:number){
 if(usage.uploadsToday>=UPLOAD_LIMITS.uploadsPerDay)throw new RepositoryError('Daily upload limit reached (20 files). Try again after 00:00 UTC. Identical contribution retries do not count again.',429);
 if(usage.storedBytes+bytes>UPLOAD_LIMITS.storedBytes)throw new RepositoryError('Your 100 MB source-storage allowance is full. All saved versions, including withdrawn games, count toward this allowance.',429);
}
