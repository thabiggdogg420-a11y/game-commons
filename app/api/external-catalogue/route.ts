import {externalCataloguePage} from '@/lib/external-catalogue';
import {response} from '@/lib/http';
import {RepositoryError} from '@/lib/limits';
export const dynamic='force-dynamic';
export async function GET(request:Request){const p=new URL(request.url).searchParams;try{return response(await externalCataloguePage({query:p.get('q')??'',platform:p.get('platform')??'all',genre:p.get('genre')??'all',content:p.get('content')??'free-open',access:p.get('access')??'all',limit:p.has('limit')?Number(p.get('limit')):12,...(p.has('cursor')?{cursor:p.get('cursor')}: {})}))}catch(e){return response({error:e instanceof RepositoryError?e.message:'External index unavailable; use the curated catalogue.'},e instanceof RepositoryError?e.status:503)}}
