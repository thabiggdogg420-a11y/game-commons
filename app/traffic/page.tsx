import {getChatGPTUser,chatGPTSignInPath} from '../chatgpt-auth';
import {isModerator} from '@/lib/moderator';
import TrafficDashboard from './traffic-dashboard';
export const dynamic='force-dynamic';
export default async function Page(){const user=await getChatGPTUser();return <main className="review-page"><a className="text-button" href="/feedback/inbox">← Feedback inbox</a>{isModerator(user?.userId)?<TrafficDashboard/>:<section className="white-panel"><h1>Reviewer access required</h1><p>Traffic reports are private to authorised project reviewers. Testers do not need to sign in.</p>{!user&&<a className="primary" target="_top" href={chatGPTSignInPath('/traffic')}>Sign in</a>}</section>}</main>}
