import {getChatGPTUser} from '../chatgpt-auth';
import {isModerator} from '@/lib/moderator';
import ReviewQueue from './review-queue';
export const dynamic='force-dynamic';
export default async function Page(){const user=await getChatGPTUser();return <main className="review-page"><a className="text-button" href="/">← Back to Game Commons</a>{isModerator(user?.userId)?<><a className="text-button" href="/feedback/inbox">Beta feedback inbox →</a><ReviewQueue/></>:<section className="white-panel"><h1>Moderator access required</h1><p>This review queue is limited to explicitly authorised moderators.</p></section>}</main>}
