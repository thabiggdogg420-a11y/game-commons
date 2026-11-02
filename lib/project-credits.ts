/** Credit is supplied project evidence, never inferred from a repository owner or
 * invented individual name. Closed-source external listings may use officialUrl
 * without a source repository; this validates attribution, not reuse permission. */
export type ProjectCreditInput={id:string;creator:string;sourceUrl?:string|null;officialUrl?:string;repository?:string|null;licenseUrl:string;codeLicense:string;assetLicense:string;assetLicenseUrl?:string;assetLicenseLabel?:string};
function text(value:unknown,name:string):asserts value is string{
 if(typeof value!=='string'||!value.trim())throw new Error(`Project credit requires ${name}.`);
}
function https(value:string,name:string){
 let url:URL;try{url=new URL(value)}catch{throw new Error(`Project credit requires a valid HTTPS ${name}.`)}
 if(url.protocol!=='https:'||!url.hostname||url.username||url.password)throw new Error(`Project credit requires a valid HTTPS ${name}.`);
 return value;
}
export function projectCredits(project:ProjectCreditInput){
 for(const key of ['id','creator','codeLicense','assetLicense'] as const)text(project[key],key);
 for(const key of ['officialUrl','sourceUrl','repository','assetLicenseUrl'] as const){const value=project[key];if(value!==undefined&&value!==null){text(value,key);https(value,key)}}
 text(project.licenseUrl,'licenseUrl');https(project.licenseUrl,'licenseUrl');
 const destination=project.sourceUrl||project.officialUrl||project.repository;
 if(!destination)throw new Error('Project credit requires an official game or source URL.');
 return {creator:project.creator,creditUrl:project.officialUrl||project.repository||project.sourceUrl!,destinationUrl:destination,destinationLabel:project.sourceUrl||!project.officialUrl?'Official source':'Official game',licenseUrl:project.licenseUrl,assetLicenseUrl:project.assetLicenseUrl,assetLicenseLabel:project.assetLicenseLabel||'Asset notices'};
}
