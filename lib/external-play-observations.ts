/** No historical QA session data is bundled with the public source checkout. */
export type ExternalPlayObservation={
 id:string;playUrl:string;label:string;completed:string[];notTested:string[];
 qualityAccepted:false;sourceBuildMatchVerified:false;
};
export function externalPlayObservation(_project:{id:string;playUrl?:string},_record?:unknown):ExternalPlayObservation|null{
 return null;
}
