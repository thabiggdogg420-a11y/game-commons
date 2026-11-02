import RepositoryPage from './repository-page';
import DiscoverHome from './discover-home';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const params=await searchParams;
 if(params.game)return <RepositoryPage searchParams={Promise.resolve(params)}/>;
 return <DiscoverHome params={params}/>;
}
