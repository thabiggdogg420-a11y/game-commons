import {z} from 'zod';
import collection from '../public/gameplay-captures/provenance.json' with {type:'json'};
const localUrl=z.string().regex(/^\/(?!\/)[A-Za-z0-9_./?=&%#-]+$/);
const sourceUrl=z.string().refine(value=>{if(/^\/(?!\/)/.test(value))return !/[\s\\]/.test(value);try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}},'Expected a local or HTTPS provenance URL');
const imageSchema=z.object({src:localUrl,width:z.number().int().positive(),height:z.number().int().positive(),alt:z.string().trim().min(1),caption:z.string().trim().min(1),creator:z.string().trim().min(1),license:z.string().trim().min(1),captureDate:z.string().trim().min(1),sourceUrl,buildSha256:z.string().regex(/^[a-f0-9]{64}$/).nullable()}).strict();
const recordSchema=z.object({id:z.string().min(1),title:z.string().min(1),version:z.number().int().positive(),status:z.enum(['captured','pending','unavailable']),images:z.array(imageSchema),provenance:z.record(z.unknown())}).strict().refine(record=>record.status==='captured'?record.images.length>0:record.images.length===0,'Only captured records can contain images');
const registrySchema=z.object({format:z.literal('game-commons-gameplay-captures-v1'),reviewedOn:z.string(),scope:z.string(),records:z.array(recordSchema)}).strict();
export type GameplayCapture=z.infer<typeof recordSchema>;
export function validateGameplayCaptures(input:unknown){
 const parsed=registrySchema.parse(input),seen=new Set<string>();
 for(const record of parsed.records){const key=JSON.stringify([record.id,record.version]);if(seen.has(key))throw new Error('Duplicate gameplay capture identity');seen.add(key)}
 return parsed.records;
}
export const gameplayCaptureRecords=validateGameplayCaptures(collection);
// Current registry is explicit: historical Star Circuit v1 is never selected for v2.
export const gameplayCaptures:Record<string,GameplayCapture>=Object.fromEntries(gameplayCaptureRecords.filter(record=>record.id!=='star-circuit'||record.version===2).map(record=>[record.id,record]));
export const historicalGameplayCaptures:Record<string,GameplayCapture>=Object.fromEntries(gameplayCaptureRecords.filter(record=>record.id==='star-circuit'&&record.version===1).map(record=>[record.id,record]));
export const pendingGameplayCaptureReasons:Record<string,string>=Object.fromEntries(gameplayCaptureRecords.filter(record=>record.status==='pending').map(record=>[record.id,String(record.provenance.reason)]));
/** Exact identity only. No implicit latest fallback and no cross-version images. */
export function getGameplayCapture(gameId:string,version?:string|number):GameplayCapture|null{
 if(version===undefined)return null;
 return gameplayCaptureRecords.find(record=>record.id===gameId&&record.version===version)??null;
}
export const gameplayCapture=getGameplayCapture;
