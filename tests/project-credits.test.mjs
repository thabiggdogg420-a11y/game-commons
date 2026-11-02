import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {projectCredits} from '../lib/project-credits.ts';
import {externalProjects} from '../lib/project-handoff.ts';
const closed={id:'closed-example',creator:'Example Project contributors',officialUrl:'https://example.org/game',licenseUrl:'https://example.org/terms',codeLicense:'Proprietary; external play only',assetLicense:'All rights reserved; no redistribution grant'};
test('credit validation requires supplied creator, HTTPS destinations and separate notices, without inventing owners',()=>{
 assert.equal(projectCredits(closed).creator,closed.creator);assert.equal(projectCredits(closed).destinationLabel,'Official game');assert.equal(projectCredits(closed).destinationUrl,closed.officialUrl);assert.equal('repository' in closed,false);
 for(const update of [{creator:''},{creator:'  '},{officialUrl:undefined},{officialUrl:'http://example.org/game'},{licenseUrl:'javascript:alert(1)'},{sourceUrl:'https://user:password@example.org/'},{codeLicense:''},{assetLicense:''}])assert.throws(()=>projectCredits({...closed,...update}),/Project credit requires/);
 assert.equal(projectCredits({...closed,sourceUrl:null}).destinationLabel,'Official game');
});
test('all catalogue cards retain supplied visible creator, official source and licences; closed-source fixture renders without fake repo',async()=>{
 const dir=mkdtempSync(new URL('./.credits-ssr-',import.meta.url));
 try{
  const source=readFileSync(new URL('../components/project-credit.tsx',import.meta.url),'utf8');writeFileSync(dir+'/credit.mjs',ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
  const {ProjectCredit}=await import(pathToFileURL(dir+'/credit.mjs'));
  const escaped=text=>renderToStaticMarkup(createElement('span',null,text)).slice(6,-7);
  assert.ok(externalProjects.length>=26);assert.equal(new Set(externalProjects.map(p=>p.id)).size,externalProjects.length);
  for(const p of [...externalProjects,closed]){
   const before=JSON.stringify(p),credit=projectCredits(p),html=renderToStaticMarkup(createElement(ProjectCredit,{project:p}));
   assert.ok(html.includes(escaped(p.creator)),p.id);assert.ok(html.includes(`href="${escaped(credit.destinationUrl)}"`),p.id);assert.ok(html.includes(`href="${escaped(p.licenseUrl)}"`),p.id);assert.match(html,p.sourceUrl?/Original licence notices/:/Official access and rights disclosures/);assert.equal(JSON.stringify(p),before);
   if(p.assetLicenseUrl)assert.ok(html.includes(`href="${escaped(p.assetLicenseUrl)}"`),p.id);
  }
  for(const id of ['valhalla-fps','veloren','0-ad']){const p=externalProjects.find(p=>p.id===id);assert.equal(p.assetLicenseUrl,id==='valhalla-fps'?'https://github.com/project-valhalla/data':p.repository);assert.match(p.assetLicenseLabel,/inventory.*incomplete/);}
  const html=renderToStaticMarkup(createElement(ProjectCredit,{project:closed}));assert.match(html,/Official game/);assert.doesNotMatch(html,/github|Get source|Official source/);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
