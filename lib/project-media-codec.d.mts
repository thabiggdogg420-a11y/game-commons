import type {MediaRecord,MediaImage,MediaAction} from './project-media-types';
export type MediaReader={hasImage(id:string):boolean;detail(id:string):MediaRecord|null;summaries(ids:string[]):Array<{id:string;mediaAvailable:boolean;primaryImage?:MediaImage|null;primaryAction?:MediaAction|null;imageCount?:number;actionCount?:number}>;stats():{detailExpansions:number;summaryExpansions:number;detailCacheEntries:number;records:number}};
export function createMediaReader(data:unknown):MediaReader;
export function readPinnedMedia(response:Response,manifest:Record<string,unknown>,completed?:()=>unknown):Promise<unknown>;
export function validateMediaCompact(data:unknown,options?:Record<string,unknown>):unknown;
export function decodeValue(data:unknown,ref:number,depth?:number):unknown;
