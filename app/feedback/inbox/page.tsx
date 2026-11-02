import {getChatGPTUser,chatGPTSignInPath} from '../../chatgpt-auth';
import {isModerator} from '@/lib/moderator';
import FeedbackInbox from './feedback-inbox';
export const dynamic='force-dynamic';
export default async function Page(){const user=await getChatGPTUser();return <main className="review-page feedback-page"><a className="text-button" href="/">← Back to Games4Free</a>{isModerator(user?.userId)?<FeedbackInbox/>:<section className="white-panel"><h1>Reviewer access required</h1><p>Beta feedback is private to authorised project reviewers.</p>{!user&&<a className="primary" target="_top" href={chatGPTSignInPath('/feedback/inbox')}>Sign in</a>}</section>}</main>}
