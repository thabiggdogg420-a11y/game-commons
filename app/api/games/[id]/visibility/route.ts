import {setGameVisibility} from '@/lib/repository';
import {mutationUser,readBody,response} from '@/lib/http';
import {RepositoryError} from '@/lib/limits';
export const dynamic='force-dynamic';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 let user;try{user=mutationUser(request)}catch(e){return response({error:(e as Error).message},403)}
 try{const input=await readBody(request);if(typeof input.withdrawn!=='boolean')throw new RepositoryError('withdrawn must be true or false.');return response({game:await setGameVisibility((await params).id,input.withdrawn,user)})}catch(e){return response({error:e instanceof Error?e.message:'Could not update visibility.'},e instanceof RepositoryError?e.status:400)}
}
