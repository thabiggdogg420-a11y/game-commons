import type {MediaImage} from '@/lib/project-media-types';
export function ProjectImage({image}:{image:MediaImage|null}){return <div className="gc-project-preview" style={{aspectRatio:'16 / 9',display:'grid',placeItems:'center',background:'#111827',color:'#cbd5e1'}}><p>Source edition · text-only preview</p>{image&&<a href={image.sourcePage}>Original image source and rights</a>}</div>}
