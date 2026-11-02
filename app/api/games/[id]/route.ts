import {getGame,history} from "@/lib/repository";import {response} from "@/lib/http";
export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;const game=await getGame(id,request.headers.get("oai-authenticated-user-id")||undefined);return game?response({game,versions:await history(id,request.headers.get("oai-authenticated-user-id")||undefined)}):response({error:"Game not found"},404)}
