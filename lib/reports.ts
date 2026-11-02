import {env} from 'cloudflare:workers';
import {getGame} from './repository';
import {RepositoryError} from './limits';
import {requireModerator} from './moderator';
export const REPORT_CATEGORIES=['security','copyright','broken','other'] as const;
type ReportRow={id:string;reporter:string;game_id:string;game_title:string;version:number;category:string;details:string;status:string;revision:number;resolution:string|null;created_at:string;updated_at:string};
function receipt(row:ReportRow){const {reporter,...data}=row;return data}
export async function submitReport(gameId:string,input:Record<string,unknown>,userId:string){
 if(!userId)throw new RepositoryError('Sign in to report a game.',403);
 const {submissionId,category,details,version}=input;
 if(typeof submissionId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(submissionId))throw new RepositoryError('A stable report submission ID is required.');
 if(typeof category!=='string'||!REPORT_CATEGORIES.includes(category as typeof REPORT_CATEGORIES[number]))throw new RepositoryError('Choose a report category.');
 if(typeof details!=='string'||details.trim().length<20||details.trim().length>2000)throw new RepositoryError('Describe the issue in 20–2000 characters.');
 if(!Number.isSafeInteger(version)||Number(version)<1)throw new RepositoryError('Choose the version you are reporting.');
 const id=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(userId+':report:'+submissionId)))).map(n=>n.toString(16).padStart(2,'0')).join('');
 const db=env.DB!;
 async function replay(){const row=await db.prepare('SELECT * FROM reports WHERE id=? AND reporter=?').bind(id,userId).first<ReportRow>();if(!row)return null;if(row.game_id!==gameId||row.version!==version||row.category!==category||row.details!==String(details).trim())throw new RepositoryError('This report submission ID was already used for different content.',409);return receipt(row)}
 const previous=await replay();if(previous)return previous;
 const game=await getGame(gameId,userId);if(!game||Number(version)>game.latestVersion)throw new RepositoryError('Game or version not found.',404);
 const now=new Date().toISOString(),day=now.slice(0,10);
 try{await db.batch([
  db.prepare('INSERT INTO report_usage (id,count) VALUES (?,1) ON CONFLICT(id) DO UPDATE SET count=count+1').bind(userId+':'+day),
  db.prepare('INSERT INTO reports (id,reporter,game_id,game_title,version,category,details,status,revision,created_at,updated_at) VALUES (?,?,?,?,?,?,?,\'open\',0,?,?)').bind(id,userId,gameId,game.title,version,category,details.trim(),now,now),
 ])}catch(error){const previous=await replay();if(previous)return previous;let e:unknown=error,message='';for(let i=0;i<5&&e instanceof Error;i++){message+=' '+e.message;e=e.cause}if(message.includes('report_daily_limit'))throw new RepositoryError('Report allowance reached (10 per UTC day). Existing receipts remain available.',429);throw new RepositoryError('Could not save the report. Retry with the same submission ID.',503)}
 return (await replay())!;
}
export async function readReport(id:string,userId:string){
 if(!userId)throw new RepositoryError('Sign in to view your report.',403);
 const row=await env.DB!.prepare('SELECT * FROM reports WHERE id=? AND reporter=?').bind(id,userId).first<ReportRow>();
 if(!row)throw new RepositoryError('Report not found.',404);return receipt(row);
}
export async function reportQueue(userId:string,status='open',cursor?:string){
 requireModerator(userId);if(!['open','resolved','dismissed','all'].includes(status))throw new RepositoryError('Invalid report status.');
 let after='',args:string[]=[];
 if(status!=='all'){after=' AND status=?';args.push(status)}
 if(cursor){try{const c=JSON.parse(atob(cursor));if(c.status!==status||typeof c.createdAt!=='string'||typeof c.id!=='string'||cursor.length>1024)throw Error();after+=' AND (created_at < ? OR (created_at=? AND id<?))';args.push(c.createdAt,c.createdAt,c.id)}catch{throw new RepositoryError('Invalid review queue cursor.')}}
 const {results}=await env.DB!.prepare('SELECT reports.*,(SELECT report_id FROM moderation_holds WHERE game_id=reports.game_id) AS heldReportId FROM reports WHERE 1=1'+after+' ORDER BY created_at DESC,id DESC LIMIT 26').bind(...args).all<ReportRow>();
 const rows=results.slice(0,25),last=rows.at(-1);
 return {reports:rows.map(receipt),nextCursor:results.length>25&&last?btoa(JSON.stringify({status,createdAt:last.created_at,id:last.id})):null};
}
export async function reviewReport(id:string,input:Record<string,unknown>,userId:string){
 requireModerator(userId);const {action,note,expectedRevision}=input;
 if(!['hold','release','dismiss'].includes(String(action)))throw new RepositoryError('Choose hold, release, or dismiss.');
 if(typeof note!=='string'||note.trim().length<10||note.trim().length>1000)throw new RepositoryError('Explain the decision in 10–1000 characters.');
 if(!Number.isSafeInteger(expectedRevision)||Number(expectedRevision)<0)throw new RepositoryError('An expected report revision is required.');
 const db=env.DB!,row=await db.prepare('SELECT * FROM reports WHERE id=?').bind(id).first<ReportRow>();if(!row)throw new RepositoryError('Report not found.',404);
 const now=new Date().toISOString(),guard='EXISTS (SELECT 1 FROM reports WHERE id=? AND revision=?)'+(action==='release'?' AND EXISTS (SELECT 1 FROM moderation_holds WHERE game_id=? AND report_id=?)':'');
 const guardArgs:(string|number)[]=[id,Number(expectedRevision),...(action==='release'?[row.game_id,id]:[])];
 const eventId=crypto.randomUUID();
 const statements=[db.prepare('INSERT INTO moderation_events (id,report_id,actor,action,note,created_at) SELECT ?,?,?,?,?,? WHERE '+guard).bind(eventId,id,userId,String(action),note.trim(),now,...guardArgs)];
 if(action==='hold')statements.push(db.prepare('INSERT INTO moderation_holds (game_id,created_at,reason,report_id) SELECT ?,?,?,? WHERE '+guard+' ON CONFLICT(game_id) DO UPDATE SET created_at=excluded.created_at,reason=excluded.reason,report_id=excluded.report_id').bind(row.game_id,now,note.trim(),id,...guardArgs));
 if(action==='release')statements.push(db.prepare('DELETE FROM moderation_holds WHERE game_id=? AND '+guard).bind(row.game_id,...guardArgs));
 statements.push(db.prepare('UPDATE reports SET status=?,resolution=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND EXISTS (SELECT 1 FROM moderation_events WHERE id=?)').bind(action==='dismiss'?'dismissed':'resolved',note.trim(),now,id,Number(expectedRevision),eventId));
 const result=await db.batch(statements);if(!result.at(-1)?.meta.changes)throw new RepositoryError('This report changed. Refresh the queue and review the report controlling the active hold before making another decision.',409);
 return receipt((await db.prepare('SELECT * FROM reports WHERE id=?').bind(id).first<ReportRow>())!);
}
export async function reportAudit(id:string,userId:string){requireModerator(userId);return (await env.DB!.prepare('SELECT id,action,note,created_at FROM moderation_events WHERE report_id=? ORDER BY created_at DESC,id DESC LIMIT 100').bind(id).all()).results}
