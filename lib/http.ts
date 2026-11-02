export function response(data: unknown,status=200){return Response.json(data,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}})}
export function mutationUser(request: Request){
  const origin=request.headers.get("origin");
  if(origin&&origin!==new URL(request.url).origin)throw new Error("Cross-origin writes are not permitted.");
  const user=request.headers.get("oai-authenticated-user-id");
  if(!user)throw new Error("Sign in to contribute a game.");
  return user;
}
export async function readBody(request: Request){
  if(!request.headers.get("content-type")?.includes("application/json"))throw new Error("Send JSON.");
  const limit=3*1024*1024;
  if(Number(request.headers.get("content-length"))>limit)throw new Error("Request exceeds 3 MB.");
  const reader=request.body?.getReader();if(!reader)throw new Error("Missing request body.");
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new Error("Request exceeds 3 MB.");}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  const value=JSON.parse(new TextDecoder().decode(bytes));
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Expected a JSON object.");return value as Record<string,unknown>;
}
