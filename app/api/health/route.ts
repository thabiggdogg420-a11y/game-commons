import {env} from "cloudflare:workers";import {response} from "@/lib/http";
export const dynamic="force-dynamic";
export async function GET(){try{await env.DB!.prepare("SELECT count(*) AS count FROM games").first();return response({status:"ok",database:true,uploads:Boolean(env.BUCKET),phase:"private-alpha"})}catch{return response({status:"unavailable"},503)}}
