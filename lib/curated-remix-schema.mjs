// Deliberately selected public metadata, never a feedback export. No network or code execution.
const sha=/^[a-f0-9]{64}$/;
const baseHash='4529dfef60dd132aa853b728dd8c8ff2ce0bcbeab06129a0c98db1d0e48ac1da';
function object(value,keys,label){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!keys.includes(key))||keys.some(key=>!Object.hasOwn(value,key)))throw Error('Invalid public '+label+' fields.');
}
function text(value,max=3000){if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u001f]/.test(value))throw Error('Invalid public text.');}
export function publicArtifact(value){
 object(value,['url','bytes','sha256'],'artifact');
 if(typeof value.url!=='string'||!/^\/(remixes|curated-remixes)\/[a-zA-Z0-9/_\.\-]+$/.test(value.url)||value.url.includes('..')||!Number.isSafeInteger(value.bytes)||value.bytes<1||value.bytes>32*1024*1024||!sha.test(value.sha256))throw Error('Artifact needs a local public path, exact size and SHA-256.');
}
export function validateCuratedRemix(value){
 object(value,['format','kind','id','title','creator','internal','status','reviewedOn','description','changes','genre','platform','originalUrl','source','layout','build','parent','workshop','rights','instructions','verification','runtime'],'record');
 if(value.format!=='game-commons-curated-remix-v1'||value.kind!=='datakin-level'||value.status!=='approved'||typeof value.internal!=='boolean')throw Error('This curator supports explicitly approved Datakin level remixes only.');
 if(!/^datakin-[a-z0-9]+(?:-[a-z0-9]+)*-v[1-9][0-9]*$/.test(value.id)||!/^\d{4}-\d{2}-\d{2}$/.test(value.reviewedOn))throw Error('Use an immutable id and review date.');
 if(value.genre!=='Platformer'||value.platform!=='Browser')throw Error('This curator supports browser platformer levels only.');
 if(value.internal)throw Error('Internal records are not accepted in the public source seed.');
 for(const key of ['title','creator','description','changes','instructions','verification'])text(value[key]);
 if(value.originalUrl!=='https://circuitfoxes.itch.io/datakin-server-delver')throw Error('Preserve CircuitFoxes original link.');
 for(const key of ['source','layout','build'])publicArtifact(value[key]);
 object(value.parent,['manifest','romSha256','creator'],'parent');publicArtifact(value.parent.manifest);
 if(value.parent.manifest.url!=='/remixes/datakin-relay/v2.json'||value.parent.romSha256!==baseHash||value.parent.creator!=='CircuitFoxes; Relay Discovery layout by GameCommons dev')throw Error('Pin the permitted Relay Discovery parent and credit.');
 object(value.workshop,['url','commit'],'workshop');
 if(value.workshop.url!=='https://github.com/Sunspark22/datakin-level-workshop'||value.workshop.commit!=='4d07360813bf990266d3bb53a373ac00a9aaa27c')throw Error('Pin the reviewed workshop commit.');
 object(value.rights,['code','assets','permission'],'rights');text(value.rights.code);text(value.rights.assets);publicArtifact(value.rights.permission);
 if(!value.rights.code.includes('MIT')||!value.rights.assets.includes('CircuitFoxes')||!value.rights.assets.includes('not MIT')||value.rights.permission.url!=='/remixes/datakin-relay/permission.txt')throw Error('Record separate code/asset rights and edited-ROM permission.');
 const r=value.runtime;
 object(r,['id','title','url','bytes','sha256','baseBytes','baseSha256','storedBytes','storedSha256','encoding','layout','slot','patch'],'runtime');publicArtifact(r.patch);
 if(r.id!==value.id.slice(8)||r.title!==value.title||r.url!=='/remixes/datakin-relay/relay-discovery.gba.gz'||r.baseSha256!==baseHash||r.baseBytes!==30929644||r.storedBytes!==22475734||r.storedSha256!=='77b1321ac446d16250bb6aba174c434d4cffa372f3d2f6777da795f1825ed9a1'||r.encoding!=='gzip'||r.slot!==1||r.layout!==value.layout.url||!sha.test(r.sha256)||r.sha256===baseHash||!Number.isSafeInteger(r.bytes)||r.bytes<r.baseBytes||r.bytes>32*1024*1024)throw Error('Runtime must pin a changed, bounded layout on the reviewed base.');
 return value;
}
export function approvedRemixes(records){return records.filter(record=>record.status==='approved').map(validateCuratedRemix);}
