import {projectGenre} from './project-genres';

/** Browser URL state only; never changes source eligibility or acceptance. */
export function catalogueBrowse(params:Record<string,string|string[]|undefined>){
 const q=typeof params.q==='string'?params.q.slice(0,200):'';
 const platform=typeof params.platform==='string'&&['browser','desktop'].includes(params.platform)?params.platform:'all';
 const selectedGenre=typeof params.genre==='string'?projectGenre(params.genre):undefined;
 const test=params.gc_test==='1';
 const href=(genre?:string,clear=false,anchor='games')=>{
  const search=new URLSearchParams();
  if(!clear){if(q)search.set('q',q);if(platform!=='all')search.set('platform',platform);if(genre)search.set('genre',genre);}
  if(test)search.set('gc_test','1');
  return '/projects'+(search.size?'?'+search.toString():'')+'#'+anchor;
 };
 return {q,platform,selectedGenre,test,hasFilters:!!q.trim()||platform!=='all'||!!selectedGenre,href,clearHref:href(undefined,true),hostedHref:href(undefined,true,'hosted-games')};
}
