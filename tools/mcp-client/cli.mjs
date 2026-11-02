#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const [command='help',value='',goal='']=process.argv.slice(2);
if(!['tools','search','detail'].includes(command)){
 console.log('Game Commons read-only MCP client\n  node cli.mjs tools\n  node cli.mjs search "city builder"\n  node cli.mjs detail PROJECT_ID "desired changes"\nNo credentials, installation into another AI client, downloads or code execution.');
 process.exit(command==='help'?0:1);
}
if(command==='detail'&&!value)throw Error('A project ID is required.');
const client=new Client({name:'game-commons-reader-cli',version:'1.0.0'},{capabilities:{}});
try{
 await client.connect(new StreamableHTTPClientTransport(new URL('https://game-commons-captain.thabiggdogg420.chatgpt.site/mcp/read'),{fetch:(url,init)=>fetch(url,{...init,redirect:'error',signal:AbortSignal.timeout(30000)})}));
 if(command==='tools')console.log(JSON.stringify(await client.listTools(),null,2));
 else{
  const result=await client.callTool({name:command==='search'?'search_source_projects':'get_project_handoff',arguments:command==='search'?{query:value}:{id:value,...(goal?{goal}:{})}});
  for(const item of result.content??[])if(item.type==='text')console.log(item.text);
  if(result.isError)process.exitCode=1;
 }
}finally{await client.close()}
