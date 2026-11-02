import {handleMcp,getMcp} from "@/lib/mcp";
export const dynamic="force-dynamic";
export async function POST(request:Request){return handleMcp(request)}
export async function GET(request:Request){return getMcp(request)}
