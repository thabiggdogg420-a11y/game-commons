import type {ExternalEntry} from './external-catalogue';
export type CompactCursor={sourceSha:string;binding:string;score:number;rank:number;key:string;id:string};
export type CompactReader={stats():{expandedRows:number;rows:number;detailCacheEntries:number};detail(id:string):ExternalEntry|null;page(options:Record<string,unknown>,policy?:{counts?:Map<string,number>;recommend?:(id:string,access:string,status:string,development:string|null)=>number;access?:(id:string,original:string)=>string;revision?:string}):{total:number;projects:ExternalEntry[];nextCursor:CompactCursor|null}};
export function createReader(data:unknown):CompactReader;
export function readPinnedResponse(response:Response,manifest:{compactRawBytes:number;compactSha256:string;sourceSha256:string;rows:number},completed?:()=>unknown):Promise<unknown>;
export function parseCompact(bytes:Uint8Array,options:Record<string,unknown>):unknown;
export function validateCompact(data:unknown,options?:Record<string,unknown>):unknown;
export function decodeRow(data:unknown,n:number):ExternalEntry;
export function tokens(value:string):string[];
