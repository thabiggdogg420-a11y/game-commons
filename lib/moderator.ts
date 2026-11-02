import {env} from 'cloudflare:workers';
import {RepositoryError} from './limits';
export function isModerator(userId?:string){
 if(!userId)return false;
 try{const ids=JSON.parse((env as unknown as Record<string,string>).MODERATOR_USER_IDS||'[]');return Array.isArray(ids)&&ids.every(id=>typeof id==='string')&&ids.includes(userId)}catch{return false}
}
export function requireModerator(userId?:string){if(!isModerator(userId))throw new RepositoryError('Moderator access is required.',403);return userId!}
