import {getChatGPTUser,chatGPTSignInPath} from '../../chatgpt-auth';
import {isModerator} from '@/lib/moderator';
import ExternalImport from './import-client';
export const dynamic='force-dynamic';
export default async function Page(){const user=await getChatGPTUser();
 if(!user)return <main><h1>Sign in to manage the external catalogue</h1><p>Public browsing needs no account. Importing requires an existing authorised moderator; signing in does not grant that role.</p><a href={chatGPTSignInPath('/moderation/external-catalogue')} target="_top">Sign in with ChatGPT</a></main>;
 if(!isModerator(user.userId))return <main><h1>Moderator access required</h1><p>You are signed in, but this account is not an authorised moderator. No import has run and no permissions have changed.</p><a href="/">Return to the public directory</a></main>;
 return <ExternalImport/>;
}
