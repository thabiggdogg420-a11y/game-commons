import {projectCredits,type ProjectCreditInput} from '@/lib/project-credits';
export function ProjectCredit({project}:{project:ProjectCreditInput}){
 const credit=projectCredits(project);
 return <div className="project-credit"><p>By <a href={credit.creditUrl}>{credit.creator}</a></p><p><a href={credit.destinationUrl}>{credit.destinationLabel} ↗</a> · <a href={credit.licenseUrl}>{project.sourceUrl?'Original licence notices':'Official access and rights disclosures'} ↗</a>{credit.assetLicenseUrl&&<> · <a href={credit.assetLicenseUrl}>{credit.assetLicenseLabel} ↗</a></>}</p></div>;
}
