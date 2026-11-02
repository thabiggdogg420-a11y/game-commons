import {env} from 'cloudflare:workers';
import {RepositoryError} from './limits';
import type {Attribution} from './traffic';
import {requireModerator} from './moderator';

export const FEEDBACK_CATEGORIES=['bug','confusing','suggestion','other'] as const;
export const FEEDBACK_AREAS=['general','playing','finding','contributing','remixing','assistants'] as const;
type FeedbackRow={id:string;author:string;category:string;area:string;message:string;device:string;status:string;revision:number;created_at:string;updated_at:string;attribution:string|null};
function entry(row:FeedbackRow){const {author,...value}=row;return {...value,attribution:row.attribution?JSON.parse(row.attribution):null}}

export async function submitFeedback(input:Record<string,unknown>,userId:string,attribution:Attribution|null=null){
 if(!userId)throw new RepositoryError('Sign in to send feedback.',403);
 const {submissionId,category,area,message}=input;
 const device=input.device??'';
 if(typeof submissionId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(submissionId))throw new RepositoryError('A stable feedback submission ID is required.');
 if(typeof category!=='string'||!FEEDBACK_CATEGORIES.includes(category as typeof FEEDBACK_CATEGORIES[number]))throw new RepositoryError('Choose a feedback type.');
 if(typeof area!=='string'||!FEEDBACK_AREAS.includes(area as typeof FEEDBACK_AREAS[number]))throw new RepositoryError('Choose the part of the site.');
 if(typeof message!=='string'||message.trim().length<10||message.trim().length>3000)throw new RepositoryError('Write 10–3000 characters of feedback.');
 if(typeof device!=='string'||device.trim().length>200)throw new RepositoryError('Device details must be 200 characters or fewer.');
 const id=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(userId+':feedback:'+submissionId)))).map(n=>n.toString(16).padStart(2,'0')).join('');
 const db=env.DB!;
 async function replay(){
  const row=await db.prepare('SELECT * FROM feedback WHERE id=? AND author=?').bind(id,userId).first<FeedbackRow>();
  if(!row)return null;
  if(row.category!==category||row.area!==area||row.message!==String(message).trim()||row.device!==String(device).trim())throw new RepositoryError('This submission ID was already used for different feedback.',409);
  return {id:row.id,status:row.status};
 }
 const previous=await replay();if(previous)return previous;
 const now=new Date().toISOString();
 try{await db.batch([
  db.prepare('INSERT INTO feedback_usage (id,count) VALUES (?,1) ON CONFLICT(id) DO UPDATE SET count=count+1').bind(userId+':'+now.slice(0,10)),
  db.prepare("INSERT INTO feedback (id,author,category,area,message,device,status,revision,created_at,updated_at,attribution) VALUES (?,?,?,?,?,?,'new',0,?,?,?)").bind(id,userId,category,area,message.trim(),device.trim(),now,now,attribution?JSON.stringify(attribution):null),
 ])}catch(error){
  const saved=await replay();if(saved)return saved;
  let current:unknown=error,details='';for(let i=0;i<5&&current instanceof Error;i++){details+=' '+current.message;current=current.cause}
  if(details.includes('feedback_daily_limit'))throw new RepositoryError('You have sent 5 feedback messages today. Please try again after 00:00 UTC.',429);
  throw new RepositoryError('Feedback could not be saved. Please retry; your message will not be duplicated.',503);
 }
 return (await replay())!;
}

export async function feedbackQueue(userId:string,status='new',cursor?:string){
 requireModerator(userId);
 if(!['new','reviewed','all'].includes(status))throw new RepositoryError('Choose a valid feedback status.');
 const values:string[]=[];let filter='';
 if(status!=='all'){filter+=' AND status=?';values.push(status)}
 if(cursor){try{
  if(cursor.length>1024)throw Error();
  const c=JSON.parse(atob(cursor));if(c.status!==status||typeof c.createdAt!=='string'||typeof c.id!=='string')throw Error();
  filter+=' AND (created_at<? OR (created_at=? AND id<?))';values.push(c.createdAt,c.createdAt,c.id);
 }catch{throw new RepositoryError('Invalid feedback queue cursor.')}}
 const {results}=await env.DB!.prepare('SELECT * FROM feedback WHERE 1=1'+filter+' ORDER BY created_at DESC,id DESC LIMIT 26').bind(...values).all<FeedbackRow>();
 const rows=results.slice(0,25),last=rows.at(-1);
 return {feedback:rows.map(entry),nextCursor:results.length>25&&last?btoa(JSON.stringify({status,createdAt:last.created_at,id:last.id})):null};
}

export async function reviewFeedback(id:string,input:Record<string,unknown>,userId:string){
 requireModerator(userId);
 if(!['new','reviewed'].includes(String(input.status))||!Number.isSafeInteger(input.expectedRevision)||Number(input.expectedRevision)<0)throw new RepositoryError('A valid status and revision are required.');
 const result=await env.DB!.prepare('UPDATE feedback SET status=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?').bind(String(input.status),new Date().toISOString(),id,Number(input.expectedRevision)).run();
 if(!result.meta.changes)throw new RepositoryError('This feedback changed or is unavailable. Refresh the inbox.',409);
 return entry((await env.DB!.prepare('SELECT * FROM feedback WHERE id=?').bind(id).first<FeedbackRow>())!);
}
