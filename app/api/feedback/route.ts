import {isocityRecipeReturnFeedback,IsocityRecipeError} from '@/lib/isocity-recipe-return';
import {feedbackAttribution} from '@/lib/traffic';
import {submitFeedback} from '@/lib/feedback';
import {remixReturnFeedback} from '@/lib/remix-return';
import {clanfireRecipeReturnFeedback,ClanfireRecipeError} from '@/lib/clanfire-recipe-return';
import {readBody,response} from '@/lib/http';
import {RepositoryError} from '@/lib/limits';
export const dynamic='force-dynamic';
const cookieName='__Host-gc-feedback';
function guestId(request:Request){
 const value=request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1);
 return value&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value)?value:null;
}
// Establish a browser quota identity before a submission, so a lost POST response
// can be replayed with the same identity and submission ID. This grants no access.
export async function GET(request:Request){
 const result=response({ready:true});
 if(!guestId(request))result.headers.set('Set-Cookie',`${cookieName}=${crypto.randomUUID()}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=604800`);
 return result;
}
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return response({error:'Send feedback from the Game Commons feedback page.'},403);
 const account=request.headers.get('oai-authenticated-user-id');
 const guest=guestId(request);
 const user=account||(guest?'guest:'+guest:null);
 if(!user)return response({error:'Please allow this site’s feedback cookie and retry. No sign-in is needed.'},400);
 try{const input=await readBody(request);if(['isocityRecipeReturn','clanfireRecipeReturn','remixReturn'].filter(key=>Object.hasOwn(input,key)).length>1)throw new RepositoryError('Send one review type at a time.');let attribution=null;try{attribution=await feedbackAttribution(request)}catch{}return response({feedback:await submitFeedback(Object.hasOwn(input,'isocityRecipeReturn')?{...isocityRecipeReturnFeedback(input.isocityRecipeReturn),submissionId:input.submissionId}:Object.hasOwn(input,'clanfireRecipeReturn')?{...clanfireRecipeReturnFeedback(input.clanfireRecipeReturn),submissionId:input.submissionId}:Object.hasOwn(input,'remixReturn')?{...remixReturnFeedback(input.remixReturn),submissionId:input.submissionId}:input,user,attribution)},201)}catch(e){return response({error:e instanceof RepositoryError||e instanceof ClanfireRecipeError||e instanceof IsocityRecipeError?e.message:'Could not read your feedback. Please check the form and retry.'},e instanceof RepositoryError||e instanceof ClanfireRecipeError||e instanceof IsocityRecipeError?e.status:400)}
}
