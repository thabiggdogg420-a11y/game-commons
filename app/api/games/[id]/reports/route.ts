import {submitReport} from '@/lib/reports';
import {mutationUser,readBody,response} from '@/lib/http';
import {RepositoryError} from '@/lib/limits';
export const dynamic='force-dynamic';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 let user;try{user=mutationUser(request)}catch{return response({error:'Sign in from this site to report a game.'},403)}
 try{return response({report:await submitReport((await params).id,await readBody(request),user)},201)}catch(e){return response({error:e instanceof RepositoryError?e.message:'Could not save the report.'},e instanceof RepositoryError?e.status:400)}
}
