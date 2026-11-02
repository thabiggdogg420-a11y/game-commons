import {gameplayCaptures} from './gameplay-captures';

// Existing public releases only. This index adds discoverability, not game approval.
const metadata:Record<string,{route:string;genres:string[];terms:string}>={
 'isocity-commons':{route:'/isocity',genres:['city-builder','simulation'],terms:'isocity amilich city builder simulation economy roads zoning utilities offline solo export import'},
 'clanfire-commons':{route:'/clanfire',genres:['strategy'],terms:'clanfire civilization settlement rts scenario recipe procedural offline experiment rob carpenter'},
 'orbital-drift':{route:'/?game=orbital-drift',genres:['action','survival'],terms:'space asteroid arcade starter'},
 'signal-garden':{route:'/?game=signal-garden',genres:['puzzle'],terms:'lights out grid puzzle starter'},
 'pocket-orchard':{route:'/?game=pocket-orchard',genres:['simulation'],terms:'farming gardening coins starter'},
 '1d5a307fa184c7dd3d530e860eed41f0938c893def080cb55c9bde57b4620385':{route:'/?game=1d5a307fa184c7dd3d530e860eed41f0938c893def080cb55c9bde57b4620385',genres:['action','survival'],terms:'orbital drift space asteroid rescue pods shields remix'},
 'ce59234183a14442ae69628f174cb319e6fb3fb994a5244758cc357dc08709b2':{route:'/?game=ce59234183a14442ae69628f174cb319e6fb3fb994a5244758cc357dc08709b2',genres:['puzzle'],terms:'signal garden lights out grid training undo claude code remix'},
 'commons-relay':{route:'/remix',genres:['strategy'],terms:'ancient beast tactical hex capture hold codex remix'},
 'pong-commons-rally':{route:'/godot#pong-commons-rally',genres:['sports'],terms:'godot pong paddle arcade claude code remix'},
 'star-circuit':{route:'/star-circuit',genres:['racing','shooter','action'],terms:'apex formula space pirates spacecraft combat racing codex remix'},
 'datakin-discovery':{route:'/datakin-play?route=discovery',genres:['platformer'],terms:'datakin relay circuitfoxes discovery level route remix'},
 'datakin-challenge':{route:'/datakin-play?route=challenge',genres:['platformer'],terms:'datakin relay circuitfoxes challenge level route remix'},
 'godot-pong':{route:'/godot#godot-pong',genres:['sports'],terms:'godot pong paddle arcade original gdscript'}
};

export function hostedGameRoute(id:string){return metadata[id]?.route??'/?game='+encodeURIComponent(id)}
export function hostedCatalogue(query='',platform='all',genre?:string){
 if(platform==='desktop')return [];
 const words=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
 return Object.values(gameplayCaptures).filter(record=>{
  const entry=metadata[record.id];
  if(!entry||genre&&!entry.genres.includes(genre))return false;
  const text=(record.title+' '+entry.terms).toLowerCase();
  return words.every(word=>text.includes(word));
 });
}
