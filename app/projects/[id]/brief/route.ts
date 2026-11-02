import {projectBrief} from '@/lib/project-handoff';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;const goal=new URL(request.url).searchParams.get('goal')??'';
 if(goal.length>500)return new Response('Keep the remix goal within 500 characters.',{status:400});
 const brief=projectBrief(id,goal);
 if(!brief)return new Response('Project not found.',{status:404,headers:{'Content-Type':'text/plain; charset=utf-8','X-Content-Type-Options':'nosniff'}});
 return new Response(brief,{headers:{'Content-Type':'text/plain; charset=utf-8','Content-Disposition':`attachment; filename="${id}-assistant-handoff.txt"`,'Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'}});
}
