import {ExternalCatalogueSection} from '@/components/external-catalogue-section';
import {topPicks} from '@/lib/top-picks';
import {presentTopGames} from '@/lib/top-game-presentation';
import RepositoryPage from './repository-page';
import DiscoverHome from './discover-home';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const params=await searchParams;
 if(params.game)return <RepositoryPage searchParams={Promise.resolve(params)}/>;
 const externalSection=await ExternalCatalogueSection({params,path:'/'});
 const topSlides=presentTopGames(await topPicks({limit:6}));
 return <DiscoverHome params={params} externalSection={externalSection} topSlides={topSlides}/>;
}
