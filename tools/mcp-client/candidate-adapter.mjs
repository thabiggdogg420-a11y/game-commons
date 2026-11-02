// Local source-only contract integration. This does NOT exercise deployed HTTP.
// Invoke: GC_SOURCE_DIR=/absolute/path/to/site node candidate-adapter.mjs
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const root=process.env.GC_SOURCE_DIR;
if(!root||!path.isAbsolute(root))throw Error('GC_SOURCE_DIR must be an absolute candidate source path');
await import(pathToFileURL(path.join(root,'tests/register.mjs')));
const {handleMcp,getMcp}=await import(pathToFileURL(path.join(root,'lib/mcp.ts')));
const {GET}=await import(pathToFileURL(path.join(root,'app/api/projects/route.ts')));
process.env.GC_MCP_URL='https://in-process-candidate.invalid/mcp/read';
process.env.REQUIRE_COMPACT='1';
process.env.GC_TEST_MODE='in-process candidate handler; NOT live HTTP';
globalThis.fetch=async(input,init)=>{
 const request=new Request(input,init),url=new URL(request.url);
 if(url.origin!=='https://in-process-candidate.invalid')throw Error('Unexpected adapter destination');
 if(url.pathname==='/mcp/read')return request.method==='GET'?getMcp(request):handleMcp(request,true);
 if(url.pathname==='/api/projects')return GET(request);
 throw Error('Unexpected adapter path');
};
await import('./check.mjs');
