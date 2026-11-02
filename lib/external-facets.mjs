// Exact reported aliases, not runtime verification or inferred export support.
export const platformAliases={browser:['browser','web','html5'],windows:['windows'],macos:['macos','mac os','osx','os x'],linux:['linux'],android:['android'],ios:['ios']};
export const engineAliases={godot:['godot','godot engine'],unity:['unity'],renpy:["ren'py",'renpy'],unreal:['unreal engine','unreal'],gamemaker:['gamemaker','game maker','gamemaker studio'],rpgmaker:['rpg maker'],pico8:['pico-8'],twine:['twine'],construct:['construct'],phaser:['phaser'],love:['löve','love'],other:['sdl','sdl2','sdl3','pygame','allegro','libgdx','sfml','gb studio','bitsy','pyxel','tyranobuilder','gdevelop','defold','cocos2d','cocos2d-x','panda3d','renjs']};
export const platforms=['all',...Object.keys(platformAliases),'desktop','unknown'];
export const engines=['all',...Object.keys(engineAliases),'unknown'];
const fold=s=>s.normalize('NFKC').toLowerCase().trim();
export function normalizedPlatforms(raw){const values=raw.map(fold),out=Object.entries(platformAliases).filter(([,a])=>values.some(x=>a.includes(x))).map(([k])=>k);if(/windows|linux|macos|desktop|osx|mac os/.test(values.join(' ')))out.push('desktop');if(!values.length||values.every(x=>['none','unknown',''].includes(x)))out.push('unknown');return out;}
export function normalizedEngines(raw){const values=raw.map(fold),out=Object.entries(engineAliases).filter(([,a])=>values.some(x=>a.includes(x))).map(([k])=>k);return out.length?out:['unknown'];}
export const FACET_REVISION='reported-facets-v1';
const platformNames={all:'Any platform',browser:'Browser / web',windows:'Windows',macos:'macOS',linux:'Linux',android:'Android',ios:'iOS',desktop:'Any desktop',unknown:'Platform not reported'};
const engineNames={all:'Any engine / framework',godot:'Godot',unity:'Unity',renpy:"Ren’Py",unreal:'Unreal Engine',gamemaker:'GameMaker',rpgmaker:'RPG Maker',pico8:'PICO-8',twine:'Twine',construct:'Construct',phaser:'Phaser',love:'LÖVE',other:'Other known engine / framework',unknown:'No recognized engine reported'};
export const platformOptions=platforms.map(value=>({value,label:platformNames[value]}));export const engineOptions=engines.map(value=>({value,label:engineNames[value]}));
