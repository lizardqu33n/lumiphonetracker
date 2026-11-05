import type {SpindleAPI} from "lumiverse-spindle-types";
import {emptyPortraitSources,rasterData,type PortraitSources} from "./portraits";
/** UI-only bytes: never saved to shared chat state or passed to prompt assembly. */
export async function loadPortraitSources(api:SpindleAPI,chatId:string,userId:string,player:string|undefined):Promise<PortraitSources>{
 const result=emptyPortraitSources();if(!userId||!chatId)return result;
 const chat=await api.chats.get(chatId,userId);if(!chat||chat.id!==chatId)return result;
 if(!api.permissions.has("images"))return result;
 if(api.permissions.has("characters")&&chat.character_id)try{
  const c=await api.characters.get(chat.character_id,userId);
  if(c?.image_id)result.characters.push({name:c.name,data:rasterData(await api.images.readBinary(c.image_id,userId))});
 }catch{/* Optional avatars never block the phone. */}
 if(api.permissions.has("personas")&&player)try{
  const p=await api.personas.getActive(userId);
  if(p?.image_id&&p.name.trim().toLocaleLowerCase("en-US")===player.trim().toLocaleLowerCase("en-US"))result.persona={name:p.name,data:rasterData(await api.images.readBinary(p.image_id,userId))};
 }catch{/* Do not search other personas or substitute another user's avatar. */}
 return result;
}
