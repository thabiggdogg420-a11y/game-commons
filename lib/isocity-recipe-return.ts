// Bounded data-only adapter for immutable IsoCity v2. No execution or URL fetching.
export class IsocityRecipeError extends Error {readonly status=400;}
export const ISOCITY_RECIPE_HEADING='ISOCITY SCENARIO RECIPE — PRIVATE CURATOR REVIEW';
export const isocityRecipeBase='riverbank40-416407b041f5138ab608b2013a8d1fc31a60d72baff42f1e5d911dbe3af493a3';
export const isocityBudgets={lean:'Lean · $25,000',standard:'Standard · $50,000',generous:'Generous · $100,000'};
export const isocityGoals={'population-100':'Reach 100 residents','positive-balance':'Positive monthly balance'};
export type IsocityRecipe={format:'isocity-scenario';version:1;base:string;budget:keyof typeof isocityBudgets;goal?:keyof typeof isocityGoals};
export function parseIsocityRecipe(text:unknown):IsocityRecipe{
 if(typeof text!=='string'||text.length>2048||new TextEncoder().encode(text).length>2048)throw new IsocityRecipeError('Recipe must fit within 2 KB.');
 let value:unknown;try{value=JSON.parse(text)}catch{throw new IsocityRecipeError('Paste valid recipe JSON exported from the v2 Scenario Workshop.');}
 if(!value||typeof value!=='object'||Array.isArray(value))throw new IsocityRecipeError('Recipe must be a JSON object.');
 const p=value as Record<string,unknown>,keys=Object.keys(p);
 if((text.match(/"(?:\\.|[^"\\])*"\s*:/g)||[]).length!==keys.length)throw new IsocityRecipeError('Duplicate or nested recipe fields are not allowed.');
 if(keys.some(k=>!['format','version','base','budget','goal'].includes(k))||!['format','version','base','budget'].every(k=>Object.hasOwn(p,k)))throw new IsocityRecipeError('Only format, version, base, budget and an optional goal are allowed.');
 if(p.format!=='isocity-scenario'||p.version!==1||p.base!==isocityRecipeBase)throw new IsocityRecipeError('Use a recipe for the pinned v2 Riverbank base.');
 if(typeof p.budget!=='string'||!Object.hasOwn(isocityBudgets,p.budget))throw new IsocityRecipeError('Choose lean, standard or generous budget.');
 if(Object.hasOwn(p,'goal')&&(typeof p.goal!=='string'||!Object.hasOwn(isocityGoals,p.goal)))throw new IsocityRecipeError('Unsupported optional goal.');
 return {format:'isocity-scenario',version:1,base:isocityRecipeBase,budget:p.budget as IsocityRecipe['budget'],...(typeof p.goal==='string'?{goal:p.goal as IsocityRecipe['goal']}:{})};
}
function note(v:unknown,label:string,max:number){if(typeof v!=='string'||!v.trim()||v.trim().length>max||/[\u0000-\u0008\u000b-\u001f]/.test(v))throw new IsocityRecipeError(`${label} is required (up to ${max} characters).`);return v.trim();}
export type IsocityRecipeReturn={recipe:IsocityRecipe;title:string;changes:string;validation:string;shareConfirmed:boolean};
const pinned=`Immutable base: IsoCity Scenario Workshop v2
Play: https://game-commons-captain.thabiggdogg420.chatgpt.site/games/isocity/v2/
Source base: /games/isocity/isocity-source-v1.tar.gz
Base SHA-256: 79c0b683e8c8e8fafd1c633945534947420d19d673c7e69ec25e43c44e037c6d
Source kit: /games/isocity/isocity-source-v2-kit.tar.gz
Kit SHA-256: c9d00b6aa1c4846eab79d90295fc51c6f139bf4230dfbddefc77f08e8b3dbce6
Manifest: /games/isocity/v2-manifest.json`;
export function isocityRecipeReturnFeedback(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new IsocityRecipeError('Include an IsoCity recipe return.');
 const v=value as Record<string,unknown>;
 if(Object.keys(v).sort().join(',')!=='changes,recipe,shareConfirmed,title,validation')throw new IsocityRecipeError('Only recipe, title, changes, validation and shareConfirmed are allowed.');
 const recipe=parseIsocityRecipe(JSON.stringify(v.recipe)),title=note(v.title,'Recipe title',80),changes=note(v.changes,'Your change',400),validation=note(v.validation,'Actual tests and remaining gaps',600);
 if(v.shareConfirmed!==true)throw new IsocityRecipeError('Confirm you want to send this recipe and notes privately.');
 const message=[ISOCITY_RECIPE_HEADING,`Title: ${title}`,`Recipe JSON (data only; not a save or executable game):\n${JSON.stringify(recipe)}`,`Change and purpose: ${changes}`,`Contributor-reported tests and gaps: ${validation}`,pinned,
 'Ancestry: IsoCity by amilich; https://github.com/amilich/isometric-city at b774dd7913103e9dd9ec51b2151893c22683886e. Game Commons: English solo adaptation and scenario workshop. MIT; retain LICENSE, CREDITS.md and THIRD-PARTY-NOTICES.txt. Art uses upstream repository-level MIT declaration; per-image authorship is not independently guaranteed. Protected themed pack excluded.',
 'Reproduce: open v2; Settings → Scenario Workshop → paste Recipe JSON → Review scenario → inspect base/budget/goal → explicitly Start reviewed scenario as a separate city. Export a city backup first; use one tab. V1 saves do not migrate. Recipe reproduces initial map and budget, not later simulation. Goals are self-set, not enforced. Full balance, mobile and long sessions remain unverified.',
 'Both source archives are required: the kit alone is not complete source. Use its offline verified assembler. Contributor confirms no private information. Private manual review only; no execution, approval or public publication.'
 ].join('\n\n');
 if(message.length>3000)throw new IsocityRecipeError('The complete brief must fit within 3000 characters. Shorten your change or test notes.');
 return {category:'other',area:'remixing',message,device:''};
}
export function isocityRecipeArtifact(message:unknown){
 if(typeof message!=='string'||message.length>3000||!message.startsWith(ISOCITY_RECIPE_HEADING+'\n\n')||!message.includes('\n\n'+pinned+'\n\n'))return null;
 const marker='Recipe JSON (data only; not a save or executable game):\n';if(message.split(marker).length!==2)return null;
 try{const recipe=parseIsocityRecipe(message.split(marker)[1].split('\n')[0]);return {recipe,json:JSON.stringify(recipe,null,2)+'\n',filename:'isocity-v2-recipe.json',playUrl:'/games/isocity/v2/'};}catch{return null;}
}
