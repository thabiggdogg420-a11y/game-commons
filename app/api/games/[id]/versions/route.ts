import {saveGame} from "@/lib/repository";import {response,mutationUser,readBody} from "@/lib/http";
import {RepositoryError} from "@/lib/limits";
export const dynamic="force-dynamic";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){let user;try{user=mutationUser(request);}catch(e){return response({error:(e as Error).message},403)}try{const {id}=await params;const input=await readBody(request);if(typeof input.submissionId!=="string")throw new RepositoryError("A stable submissionId is required for safe version retries.");return response({game:await saveGame(input,user,id)},201)}catch(e){return response({error:e instanceof Error?e.message:"Version upload failed"},e instanceof RepositoryError?e.status:400)}}
