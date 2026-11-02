// Compile real local TSX dependencies for Node-only SSR tests. Production CSS
// is omitted, not mocked components or rights/credit markup. Effects do not run.
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import ts from 'typescript';
const root=fileURLToPath(new URL('../',import.meta.url));
export function compileSsrModule(entry,directory){
 const cache=new Map();
 function compile(file){
  if(cache.has(file))return cache.get(file);
  const dest=path.join(directory,`module-${cache.size}.mjs`);cache.set(file,dest);
  let output=ts.transpileModule(readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
  const ast=ts.createSourceFile(file,output,ts.ScriptTarget.ES2022,true,ts.ScriptKind.JS),edits=[];
  for(const node of ast.statements){
   if(!ts.isImportDeclaration(node)||!ts.isStringLiteral(node.moduleSpecifier))continue;
   const spec=node.moduleSpecifier.text;
   if(spec.endsWith('.css')){edits.push([node.getStart(ast),node.end,'']);continue}
   if(!spec.startsWith('.')&&!spec.startsWith('@/'))continue;
   const base=spec.startsWith('@/')?path.join(root,spec.slice(2)):path.resolve(path.dirname(file),spec);
   const resolved=[base,...['.tsx','.ts','.js','.mjs','.json'].map(ext=>base+ext)].find(p=>existsSync(p)&&path.extname(p));
   if(!resolved)throw Error(`Unresolved SSR dependency ${spec} from ${file}`);
   const url=pathToFileURL(resolved.endsWith('.tsx')?compile(resolved):resolved).href;
   if(resolved.endsWith('.json')){
    const prefix=output.slice(node.getStart(ast),node.moduleSpecifier.getStart(ast));
    edits.push([node.getStart(ast),node.end,prefix+JSON.stringify(url)+' with {type:"json"};']);
   }else edits.push([node.moduleSpecifier.getStart(ast),node.moduleSpecifier.end,JSON.stringify(url)]);
  }
  for(const [start,end,value] of edits.sort((a,b)=>b[0]-a[0]))output=output.slice(0,start)+value+output.slice(end);
  writeFileSync(dest,output);return dest;
 }
 return pathToFileURL(compile(fileURLToPath(entry))).href;
}
