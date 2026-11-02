import {reviewFeedback} from '@/lib/feedback';
import {mutationUser,readBody,response} from '@/lib/http';
import {RepositoryError} from '@/lib/limits';
export const dynamic='force-dynamic';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 let user;try{user=mutationUser(request)}catch{return response({error:'Sign in from this site to review feedback.'},403)}
 try{return response({feedback:await reviewFeedback((await params).id,await readBody(request),user)})}
 catch(e){return response({error:e instanceof RepositoryError?e.message:'Could not update feedback.'},e instanceof RepositoryError?e.status:400)}
}
