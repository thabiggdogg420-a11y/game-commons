'use client';
import {useEffect,useRef,useState} from 'react';
import './gameplay-gallery.css';

export type GameplayCaptureImage={
 src:string;width:number;height:number;alt:string;caption:string;creator:string;
 license:string;captureDate:string;sourceUrl:string;buildSha256:string|null;
};
export type GameplayCaptureRecord={id:string;title:string;version:string|number;images:GameplayCaptureImage[];status:'captured'|'pending'|'unavailable'};
export type GameplayGalleryProps={gameId:string;version?:string|number;record?:GameplayCaptureRecord|null;compact?:boolean};
export function selectGameplayCapture({gameId,version,record}:GameplayGalleryProps):GameplayCaptureRecord|null{
 // No implicit latest-version selection: a historical image must not silently
 // become proof for an unknown or newer runtime. Registry owns provenance review.
 if(version===undefined||!record||record.id!==gameId||record.version!==version||record.status!=='captured'||!record.images.length)return null;
 return record;
}
function Pending({failed=false}:{failed?:boolean}){
 return <div className="gameplay-screenshot-pending" role="status"><strong>Gameplay screenshot pending</strong><span>{failed?'The recorded image could not load. No illustration is shown in its place.':'No matching gameplay capture is available for this version.'}</span></div>;
}
export function GameplayScreenshot({image,title,version,compact=false}:{image:GameplayCaptureImage;title:string;version:string|number;compact?:boolean}){
 const [failedSource,setFailedSource]=useState<string|null>(null);
 const imageRef=useRef<HTMLImageElement>(null);
 useEffect(()=>{const element=imageRef.current;if(element?.complete&&element.naturalWidth===0)setFailedSource(image.src)},[image.src]);
 const failed=failedSource===image.src;
 return <figure className={'gameplay-screenshot'+(compact?' gameplay-screenshot-compact':'')}>
  {failed?<Pending failed/>:<a className="gameplay-screenshot-fullsize" href={image.src} aria-label={'View full-size gameplay screenshot: '+title+' — '+image.alt}><img ref={imageRef} src={image.src} width={image.width} height={image.height} alt={image.alt} loading="lazy" onError={()=>setFailedSource(image.src)}/></a>}
  <figcaption><p className="gameplay-screenshot-caption">{image.caption}</p><p><strong>{title}</strong> · Version {version} · Captured {image.captureDate}</p><p><strong>Credit:</strong> {image.creator}</p><p><strong>Licence:</strong> {image.license}</p><p><a href={image.sourceUrl}>Source and capture provenance</a></p><details><summary>Runtime identity</summary><p>{image.buildSha256?<>Recorded build SHA-256: <code>{image.buildSha256}</code></>:'Exact build hash was not established for this capture.'}</p></details></figcaption>
 </figure>;
}
export function GameplayGallery(props:GameplayGalleryProps){
 const record=selectGameplayCapture(props);
 if(!record)return <section className="gameplay-gallery" aria-label="Gameplay screenshots"><Pending/></section>;
 const images=props.compact?record.images.slice(0,1):record.images;
 return <section className={'gameplay-gallery'+(props.compact?' gameplay-gallery-compact':'')} aria-label={record.title+' gameplay screenshots, version '+record.version}>{images.map((image,index)=><GameplayScreenshot key={image.src+':'+index} image={image} title={record.title} version={record.version} compact={props.compact}/>)}</section>;
}
