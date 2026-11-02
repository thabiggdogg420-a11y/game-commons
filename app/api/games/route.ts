import {cataloguePage,saveGame} from '@/lib/repository';
import {response,mutationUser,readBody} from '@/lib/http';
import {RepositoryError} from '@/lib/limits';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const url=new URL(request.url);return response(await cataloguePage({query:url.searchParams.get('q')||'',genre:url.searchParams.get('genre')||'All',limit:url.searchParams.has('limit')?Number(url.searchParams.get('limit')):24,cursor:url.searchParams.get('cursor')||undefined,mine:url.searchParams.get('mine')==='true',userId:request.headers.get('oai-authenticated-user-id')||undefined}));}catch(e){return response({error:e instanceof RepositoryError?e.message:'The repository is temporarily unavailable. Please try again.'},e instanceof RepositoryError?e.status:503)}}
export async function POST(request:Request){let user;try{user=mutationUser(request);}catch(e){return response({error:(e as Error).message},403)}try{return response({game:await saveGame(await readBody(request),user)},201)}catch(e){return response({error:e instanceof Error?e.message:'Upload failed.'},e instanceof RepositoryError?e.status:400)}}
