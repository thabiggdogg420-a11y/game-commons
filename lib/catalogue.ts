import {env} from 'cloudflare:workers';
import {starters} from './starters';
import {GENRES,type Game} from './contracts';
import {isModerator} from './moderator';
import {RepositoryError} from './limits';
type Options={query?:string;genre?:string;limit?:number;cursor?:string;mine?:boolean;userId?:string};
type Cursor={v:number;query:string;genre:string;mine:boolean;score:number;updatedAt:string;id:string};
const fields=['id','owner','title','description','creator','genre','tags','controls','license','attribution','parentId','parentVersion','createdAt','updatedAt','latestVersion','withdrawnAt','moderatedAt','starter'] as const;
const columns:Record<string,string>={parentId:'parent_id',parentVersion:'parent_version',createdAt:'created_at',updatedAt:'updated_at',latestVersion:'latest_version',withdrawnAt:'withdrawn_at'};
const stop=new Set(['a','an','the','game','games','with','i','want','to','play','me','find','some','something','and','for','of','like']);
function encode(value:Cursor){return btoa(Array.from(new TextEncoder().encode(JSON.stringify(value)),b=>String.fromCharCode(b)).join('')).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')}
function decode(value:string):Cursor{try{if(value.length>2048)throw Error();return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0))))}catch{throw new RepositoryError('Invalid catalogue cursor. Start a new search.')}}
export async function cataloguePage(options:Options={}){
 const query=(options.query||'').trim().slice(0,200),genre=options.genre||'All',limit=options.limit??24,mine=options.mine===true;
 if(!Number.isInteger(limit)||limit<1||limit>60)throw new RepositoryError('Page size must be an integer from 1 to 60.');
 if(genre!=='All'&&!GENRES.includes(genre))throw new RepositoryError('Choose a supported genre.');
 if(mine&&!options.userId)throw new RepositoryError('Sign in to view your contributions.',403);
 const terms=[...new Set(query.toLowerCase().split(/[^\p{L}\p{N}-]+/u).filter(t=>t&&!stop.has(t)))].slice(0,12);
 const args:(string|number|null)[]=[];
 const selects=[`SELECT ${fields.map(f=>f==='moderatedAt'?'(SELECT created_at FROM moderation_holds WHERE game_id=g.id) AS moderatedAt':f==='starter'?'0 AS starter':`g.${columns[f]||f} AS "${f}"`).join(',')} FROM games g WHERE ${mine?'g.owner=?':'g.withdrawn_at IS NULL'}`];
 if(mine)args.push(options.userId!);
 if(!mine)for(const g of starters){const values:Record<string,unknown>={...g,owner:null,withdrawnAt:null,moderatedAt:null,starter:1,tags:JSON.stringify(g.tags)};selects.push(`SELECT ${fields.map(()=>'?').join(',')}`);for(const field of fields)args.push(values[field] as string|number|null)}
 const haystack="lower(title || ' ' || description || ' ' || genre || ' ' || tags || ' ' || controls)";
 const score=terms.length?terms.map(()=>`CASE WHEN instr(${haystack},?)>0 THEN 1 ELSE 0 END`).join('+'):'0';args.push(...terms);
 const genreWhere=genre==='All'?'1=1':'genre=?';if(genre!=='All')args.push(genre);
 let after='1=1';
 if(options.cursor){const c=decode(options.cursor);if(!c||typeof c!=='object'||c.v!==1||c.query!==query||c.genre!==genre||c.mine!==mine||!Number.isInteger(c.score)||c.score<0||typeof c.updatedAt!=='string'||typeof c.id!=='string')throw new RepositoryError('This cursor belongs to a different search. Start a new search.');after='(score < ? OR (score = ? AND updatedAt < ?) OR (score = ? AND updatedAt = ? AND id > ?))';args.push(c.score,c.score,c.updatedAt,c.score,c.updatedAt,c.id)}
 args.push(limit+1);
 const statement=`WITH catalogue AS (${selects.join(' UNION ALL ')}), ranked AS (SELECT *,(${score}) AS score FROM catalogue WHERE ${genreWhere} ${mine?'':'AND NOT EXISTS (SELECT 1 FROM moderation_holds h WHERE h.game_id=catalogue.id)'}) SELECT * FROM ranked WHERE ${terms.length?'score>0':'1=1'} AND ${after} ORDER BY score DESC,updatedAt DESC,id ASC LIMIT ?`;
 const result=await env.DB!.prepare(statement).bind(...args).all<Omit<Game,'tags'|'starter'> & {owner:string|null;starter:number;score:number;tags:string}>();
 const hasMore=result.results.length>limit,rows=result.results.slice(0,limit),last=rows.at(-1);
 const nextCursor=hasMore&&last?encode({v:1,query,genre,mine,score:last.score,updatedAt:last.updatedAt,id:last.id}):null;
 const games=rows.map(({owner,score,tags,starter,...row})=>({...row,tags:JSON.parse(tags),starter:Boolean(starter),canEdit:Boolean(options.userId&&owner===options.userId)}));
 return {games,nextCursor,hasMore,limit,search:'keyword relevance',scope:mine?'my-contributions':'catalogue',...(mine?{account:{userId:options.userId,moderator:isModerator(options.userId)}}:{})};
}
