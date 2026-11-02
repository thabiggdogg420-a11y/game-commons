import {reviewReport,reportAudit} from '@/lib/reports';
import {mutationUser,readBody,response} from '@/lib/http';
import {RepositoryError} from '@/lib/limits';
export const dynamic='force-dynamic';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 let user;try{user=mutationUser(request)}catch{return response({error:'Sign in from this site to review a report.'},403)}
 try{return response({report:await reviewReport((await params).id,await readBody(request),user)})}catch(e){return response({error:e instanceof RepositoryError?e.message:'Could not save decision.'},e instanceof RepositoryError?e.status:400)}
}
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{return response({events:await reportAudit((await params).id,request.headers.get('oai-authenticated-user-id')||'')})}catch(e){return response({error:e instanceof RepositoryError?e.message:'Audit unavailable.'},e instanceof RepositoryError?e.status:503)}}
