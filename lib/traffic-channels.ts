// Only public campaign names below are stored; arbitrary UTM values are discarded.
export const CHANNELS={
 youtube_evolution:'YouTube · Pass It On film',youtube_crossover:'YouTube · One Evolving World film',x_evolution:'X · Pass It On film',x_crossover:'X · One Evolving World film',bluesky_evolution:'Bluesky · Pass It On film',bluesky_crossover:'Bluesky · One Evolving World film',reddit_aigaming_films:'Reddit · AIgaming films (historical)',reddit_indiedev_film:'Reddit · IndieDev film',
 reddit_vision:'Reddit · platform vision',bluesky_vision:'Bluesky · platform vision',x_vision:'X · platform vision',
 claudeai_showcase:'Reddit · ClaudeAI showcase',sideproject:'Reddit · SideProject',claudegamedev:'Reddit · ClaudeGameDev',chatgpt_demo:'Reddit · ChatGPT demo',aigamedev_demo:'Reddit · AI GameDev demo',alphaandbetausers:'Reddit · AlphaAndBetaUsers',claudecode_showcase:'Reddit · ClaudeCode showcase',creator_outreach:'Reddit · creator conversations',
 bluesky_demo:'Bluesky · Claude puzzle remix',bluesky_godot:'Bluesky · Godot remix',bluesky_tester:'Bluesky · tester post',bluesky:'Bluesky · other / untagged',x_launch:'X · launch',x:'X · other / untagged',reddit_untagged:'Reddit · untagged',direct:'Direct / unknown',
} as const;
export type Channel=keyof typeof CHANNELS;
export type Campaign={source:string;medium:string;campaign:string;content:string};
const redditPosts=['claudeai_showcase','sideproject','claudegamedev','chatgpt_demo','aigamedev_demo','alphaandbetausers','claudecode_showcase','creator_outreach'];
// Exact public tags already shared. Keep arbitrary content and personal values out.
const filmTags:Record<string,string>={evolution_film:'evolution',aaa_film:'crossover',aaa_continuity_trailer:'crossover',concept_trailer:'crossover'};
export function normaliseCampaign(input:Record<string,unknown>,landing=''):Campaign|null{
 if(input.campaign==='games_never_die'){
  const source=input.source==='twitter'?'x':input.source;
  if(!['reddit','x','bluesky','youtube'].includes(String(source)))return null;
  const content=typeof input.content==='string'?input.content:'';
  if(['x','bluesky','youtube'].includes(String(source))&&Object.hasOwn(filmTags,content))return {source:String(source),medium:source==='youtube'?'video':'social',campaign:'games_never_die',content};
  if(source==='reddit'&&['aigaming_films','indiedev_film'].includes(content))return {source,medium:'community',campaign:'games_never_die',content};
  if(content==='platform_slug_launch'&&source!=='youtube')return {source:String(source),medium:source==='reddit'?'community':'social',campaign:'beta',content:'vision'};
  if(source==='reddit'&&['claudegamedev_feedback','claudegamedev_workflow'].includes(content))return {source,medium:'community',campaign:'beta',content:'claudegamedev'};
  if(source==='reddit'&&['aigamedev_feedback','aigamedev_handoff'].includes(content))return {source,medium:'community',campaign:'beta',content:'aigamedev_demo'};
  return null;
 }
 if(input.campaign!=='beta')return null;
 if(input.source==='reddit')return {source:'reddit',medium:'community',campaign:'beta',content:input.content==='vision'?'vision':redditPosts.includes(String(input.content))?String(input.content):''};
 if(input.source==='bluesky')return {source:'bluesky',medium:'social',campaign:'beta',content:input.content==='vision'?'vision':input.content==='godot_remix'||(input.content==='claude_remix'&&landing==='/godot')?'godot_remix':['claude_remix','tester_post'].includes(String(input.content))?String(input.content):''};
 if(input.source==='x'||input.source==='twitter')return {source:'x',medium:'social',campaign:'beta',content:['vision','vision_frederik'].includes(String(input.content))?'vision':input.content==='launch'?'launch':''};
 return null;
}
export function campaignChannel(input:Record<string,unknown>):Channel|null{
 const c=normaliseCampaign(input);if(!c)return null;
 if(c.campaign==='games_never_die')return (c.source==='reddit'?'reddit_'+c.content:c.source+'_'+filmTags[c.content]) as Channel;
 if(c.content==='vision')return c.source==='reddit'?'reddit_vision':c.source==='bluesky'?'bluesky_vision':'x_vision';
 if(c.source==='reddit')return (c.content as Channel)||'reddit_untagged';
 if(c.source==='bluesky')return c.content==='claude_remix'?'bluesky_demo':c.content==='godot_remix'?'bluesky_godot':c.content==='tester_post'?'bluesky_tester':'bluesky';
 return c.content==='launch'?'x_launch':'x';
}
export function referralSource(referrer:string){
 try{const h=new URL(referrer).hostname;const is=(domain:string)=>h===domain||h.endsWith('.'+domain);
 if(is('reddit.com')||is('redd.it'))return 'reddit';if(is('bsky.app')||is('bsky.social'))return 'bluesky';if(is('x.com')||is('twitter.com')||h==='t.co')return 'x';}catch{}
 return '';
}
