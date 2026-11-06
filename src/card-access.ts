import type {SpindleAPI,CharacterDTO,PersonaDTO} from "lumiverse-spindle-types";
export async function cardSources(api:SpindleAPI,chatId:string,userId:string):Promise<{card:CharacterDTO;persona:PersonaDTO}> {
 if(!userId||!api.permissions.has("characters")||!api.permissions.has("personas"))throw Error("Allow character and persona access in Extensions to read these sources.");
 const chat=await api.chats.get(chatId,userId);if(!chat||chat.id!==chatId)throw Error("Open an accessible chat first.");
 const card=await api.characters.get(chat.character_id,userId),persona=await api.personas.getActive(userId);
 if(!card||!persona||typeof card.name!=="string"||typeof persona.name!=="string")throw Error("The character card or your active persona is unavailable.");return {card,persona};
}
export async function cardNames(api:SpindleAPI,chat:string,user:string):Promise<string[]>{try{const source=await cardSources(api,chat,user);return [source.card.name,source.persona.name];}catch{return [];}}
