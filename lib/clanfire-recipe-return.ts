// Browser-safe validation error; do not import server storage/limits here.
export class ClanfireRecipeError extends Error {readonly status=400;}
import release from '../public/remixes/clanfire-commons/release.json' with {type:'json'};
export type ClanfireRecipe={version:1;seed:string;size:'medium'|'large'|'xlarge';mode:'calm'|'moderate'|'hard';stock:number};
export const CLANFIRE_RECIPE_HEADING='CLANFIRE RECIPE — PRIVATE CURATOR REVIEW';
export const clanfireRecipeBase={
 title:release.title,creator:release.parent.creator,parentSource:release.parent.source,parentRevision:release.parent.commit,
 playUrl:'https://game-commons-captain.thabiggdogg420.chatgpt.site'+release.playUrl,
 sourceUrl:'https://game-commons-captain.thabiggdogg420.chatgpt.site'+release.source.url,
 sourceSha256:release.source.sha256,runtimeManifestSha256:release.runtimeManifest.sha256,
};
// Same strict data-only contract as immutable v1/js/commons.js; cross-tested
// against the actual game's validator. No runtime, network or storage access.
export function validateClanfireRecipe(value:unknown):ClanfireRecipe{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)throw new ClanfireRecipeError('Recipe must be a JSON object.');
 const v=value as Record<string,unknown>;
 if(Object.keys(v).sort().join(',')!=='mode,seed,size,stock,version')throw new ClanfireRecipeError('Only version, seed, size, mode and stock are allowed.');
 if(v.version!==1)throw new ClanfireRecipeError('Unsupported recipe version.');
 if(typeof v.seed!=='string'||!/^[a-zA-Z0-9_-]{1,48}$/.test(v.seed))throw new ClanfireRecipeError('Seed: use 1–48 letters, numbers, underscores or hyphens.');
 if(typeof v.size!=='string'||!['medium','large','xlarge'].includes(v.size))throw new ClanfireRecipeError('Choose a supported map size.');
 if(typeof v.mode!=='string'||!['calm','moderate','hard'].includes(v.mode))throw new ClanfireRecipeError('Choose a supported difficulty.');
 if(typeof v.stock!=='number'||!Number.isInteger(v.stock)||v.stock<50||v.stock>200||v.stock%10)throw new ClanfireRecipeError('Resource stocks must be 50–200%, in steps of 10.');
 return {version:1,seed:v.seed,size:v.size as ClanfireRecipe['size'],mode:v.mode as ClanfireRecipe['mode'],stock:v.stock};
}
export function parseClanfireRecipe(text:unknown){
 if(typeof text!=='string'||text.length>2048)throw new ClanfireRecipeError('Recipe must be under 2 KB.');
 let value:unknown;try{value=JSON.parse(text)}catch{throw new ClanfireRecipeError('Paste valid recipe JSON exported from Scenario Workshop.');}
 return validateClanfireRecipe(value);
}
function note(value:unknown,label:string,max:number){
 if(typeof value!=='string'||!value.trim()||value.trim().length>max||/[\u0000-\u0008\u000b-\u001f]/.test(value))throw new ClanfireRecipeError(`${label} is required (up to ${max} characters).`);
 return value.trim();
}
export type ClanfireRecipeReturn={recipe:ClanfireRecipe;title:string;changes:string;validation:string;shareConfirmed:boolean};
export function clanfireRecipeReturnFeedback(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new ClanfireRecipeError('Include a Clanfire recipe return.');
 const v=value as Record<string,unknown>;
 if(Object.keys(v).sort().join(',')!=='changes,recipe,shareConfirmed,title,validation')throw new ClanfireRecipeError('Only recipe, title, changes, validation and shareConfirmed are allowed.');
 const recipe=validateClanfireRecipe(v.recipe),title=note(v.title,'Recipe title',80),changes=note(v.changes,'Your change',400),validation=note(v.validation,'Actual tests and remaining gaps',600);
 if(v.shareConfirmed!==true)throw new ClanfireRecipeError('Confirm you want to send this recipe and notes for private review.');
 const b=clanfireRecipeBase;
 const message=[CLANFIRE_RECIPE_HEADING,`Title: ${title}`,`Recipe JSON (data only; not a save or executable game):\n${JSON.stringify(recipe)}`,`Change and purpose: ${changes}`,`Contributor-reported tests and gaps: ${validation}`,
 `Immutable base: ${b.title} v1\nPlay: ${b.playUrl}\nComplete source: ${b.sourceUrl}\nSource SHA-256: ${b.sourceSha256}\nRuntime manifest SHA-256: ${b.runtimeManifestSha256}`,
 `Ancestry: Clanfire by ${b.creator}\nParent: ${b.parentSource}\nParent commit: ${b.parentRevision}\nAdaptation: Game Commons offline scenarios, recipe workshop and isolated local saves.\nCode and assets in this procedural-only edition: MIT. Preserve LICENSE and NOTICE.md; optional upstream raster/font assets are not included.`,
 'Reproduce: open the v1 game; Scenario Workshop → paste Recipe JSON → Review pasted recipe → inspect all five fields → explicitly Start reviewed scenario and choose an origin. This is a configuration of the existing base, not a separately built game or saved progress.',
 'Contributor confirms this recipe and notes may be shared privately and contain no private information. Manual review only: no execution, upload, approval or public publication. Experimental; full-match, balance and mobile acceptance not established.'
 ].join('\n\n');
 if(message.length>3000)throw new ClanfireRecipeError('The complete brief must fit within 3000 characters. Shorten your change or test notes.');
 return {category:'other',area:'remixing',message,device:''};
}

// Recover only bounded data from an untrusted private brief. This is not rights,
// gameplay or curator approval. Do not fetch URLs or execute contributor text.
export function clanfireRecipeArtifact(message:unknown){
 if(typeof message!=='string'||message.length>3000||!message.startsWith(CLANFIRE_RECIPE_HEADING+'\n\n'))return null;
 const marker='Recipe JSON (data only; not a save or executable game):\n';
 if(message.split(marker).length!==2)return null;
 const text=message.split(marker)[1].split('\n')[0];
 const b=clanfireRecipeBase;
 const pinned=`Immutable base: ${b.title} v1\nPlay: ${b.playUrl}\nComplete source: ${b.sourceUrl}\nSource SHA-256: ${b.sourceSha256}\nRuntime manifest SHA-256: ${b.runtimeManifestSha256}`;
 if(!message.includes('\n\n'+pinned+'\n\n'))return null;
 try{const recipe=parseClanfireRecipe(text);return {recipe,json:JSON.stringify(recipe,null,2)+'\n',filename:'clanfire-commons-recipe.json',playUrl:b.playUrl};}catch{return null;}
}
