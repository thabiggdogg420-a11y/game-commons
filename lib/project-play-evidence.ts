/** Public-source builds do not include private or historical play-session records. */
export type ProjectPlayEvidence={
 landingUrl:string;
 externalPlayEvidence:{targetUrl:string;completed:string[];notTested:string[];sourceBuildMatchVerified:false;qualityAccepted:false};
 sourceRelationships:{serverAdvertisedSource:{sourceUrl:string}};
};
export const externalFeatureTestLabel='Runtime behavior has not been established by this source checkout';
export function projectPlayEvidence(_project:{id:string;playUrl?:string},_record?:unknown):ProjectPlayEvidence|null{
 return null;
}
