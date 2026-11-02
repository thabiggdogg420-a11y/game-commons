// Browsing categories for the reviewed external catalogue. Empty categories are
// intentionally visible; they are invitations for submissions, not game listings.
export const projectGenres = [
 {id:'action',label:'Action',description:'Reflexes, movement and close encounters.',projectIds:['no-survivor-game','banana-bread']},
 {id:'adventure',label:'Adventure',description:'Explore places, follow stories and find your own route.',projectIds:['selk','endless-sky','pioneer','impossible-journey']},
 {id:'rpg',label:'Role-playing',description:'Characters, quests and a world to grow into.',projectIds:['tactical-slash','veloren']},
 {id:'strategy',label:'Strategy',description:'Armies, economies and decisions that change the map.',projectIds:['monolith','ancient-beast','mindustry','warzone2100','freeciv-web','godot-reversi','tactical-slash','0-ad','beyond-all-reason']},
 {id:'simulation',label:'Simulation',description:'Living systems, production lines and worlds with rules.',projectIds:['thrive','shapez','mindustry','pioneer','impossible-journey']},
 {id:'racing',label:'Racing',description:'New tracks, tighter corners and a different finish line.',projectIds:['slipstream-racing-game','supertuxkart','stunt-rally','cruising-bones']},
 {id:'platformer',label:'Platformer',description:'Movement, exploration and one more jump.',projectIds:[] as string[]},
 {id:'puzzle',label:'Puzzle',description:'Discover patterns and build your way to a solution.',projectIds:['shapez','selk']},
 {id:'shooter',label:'Shooter',description:'Aiming, dodging and a new kind of encounter.',projectIds:['banana-bread','no-survivor-game','valhalla-fps','xonotic']},
 {id:'sports',label:'Sports',description:'Teams, timing and another way to play.',projectIds:['cruising-bones']},
 {id:'city-builder',label:'City builder',description:'Plan a settlement, provide services and grow a functioning city.',projectIds:[] as string[]},
 {id:'fps',label:'First-person shooter',description:'First-person movement, aiming and encounters.',projectIds:['banana-bread','valhalla-fps','xonotic']},
 {id:'mmorpg',label:'MMORPG',description:'Persistent online worlds and multiplayer progression; server setup and operation must be qualified separately.',projectIds:[] as string[]},
 {id:'survival',label:'Survival',description:'Gather, craft and survive a persistent world. Arena shooters alone do not fill this category.',projectIds:['impossible-journey','voxelibre']},
 {id:'roguelike',label:'Roguelike / roguelite',description:'Distinct runs, changing encounters and consequential progression.',projectIds:[] as string[]},
 {id:'fighting',label:'Fighting',description:'Combat systems with readable moves, counters and match objectives.',projectIds:[] as string[]},
 {id:'horror',label:'Horror',description:'Tension, atmosphere and encounters designed around fear.',projectIds:[] as string[]},
 {id:'rhythm',label:'Rhythm',description:'Music, timing and meaningful rhythmic interaction.',projectIds:['osu-lazer']},
 {id:'sandbox',label:'Sandbox',description:'Open-ended worlds and tools for player-directed experimentation.',projectIds:['voxelibre']},
];

export function projectGenre(id:string){return projectGenres.find(genre=>genre.id===id)}
