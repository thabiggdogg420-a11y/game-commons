import {getChatGPTUser} from '../../chatgpt-auth';
import {readReport} from '@/lib/reports';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{id:string}>}){
 const user=await getChatGPTUser();let report;try{report=await readReport((await params).id,user?.userId||'')}catch{return <main className="review-page"><a href="/">← Games4Free</a><h1>Report unavailable</h1><p>Sign in with the account that submitted this report.</p></main>}
 return <main className="review-page"><a className="text-button" href="/">← Games4Free</a><span className="eyebrow">YOUR REPORT</span><h1>{report.game_title}</h1><div className="white-panel"><h2>Status: {report.status}</h2><p>Version {report.version} · {report.category}</p><p className="report-text">{report.details}</p>{report.resolution&&<p><strong>Review decision:</strong> {report.resolution}</p>}<p className="muted">Submitted {new Date(report.created_at).toLocaleString('en-AU')}. Reports are reviewed manually during this private alpha; no response time is promised.</p><a className="secondary" href={'/reports/'+report.id}>Refresh status</a></div></main>
}
