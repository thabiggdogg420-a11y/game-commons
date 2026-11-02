import {feedbackPath} from '@/lib/traffic-referral';
import {isModerator} from '@/lib/moderator';
import {cataloguePage} from '@/lib/catalogue';
import RepositoryApp from './repository-app';
import {getChatGPTUser} from './chatgpt-auth';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const user=await getChatGPTUser();
 // Public discovery uses the same visibility rules as the API, even for the owner.
 const initialCatalogue=await cataloguePage({limit:24}).catch(()=>null);
 return <RepositoryApp signedIn={Boolean(user)} moderator={isModerator(user?.userId)} feedbackHref={feedbackPath(await searchParams)} initialCatalogue={initialCatalogue} />;
}
