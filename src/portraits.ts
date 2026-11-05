/** Raster-only portrait data; no URLs, SVG or markup enter an image element. */
export const PORTRAIT_INPUT_LIMIT=5*1024*1024;
export const PORTRAIT_LIMIT=20*1024;
export const PORTRAIT_CHAT_LIMIT=512*1024; // Encoded data-URI characters, shared on the chat.
export interface PortraitSources {characters:{name:string;data:string}[];persona?:{name:string;data:string}}
export const emptyPortraitSources=():PortraitSources=>({characters:[]});
const ascii=(b:Uint8Array,a:number,n:number)=>String.fromCharCode(...b.slice(a,a+n));
export function rasterType(b:Uint8Array):"image/png"|"image/jpeg"|"image/webp" {
 if(b.length<12)throw Error("Choose a real PNG, JPEG or WebP image.");
 if(b[0]===137&&ascii(b,1,3)==="PNG"&&b[4]===13&&b[5]===10&&b[6]===26&&b[7]===10){
  for(let i=8;i+12<=b.length;){const size=new DataView(b.buffer,b.byteOffset+i,4).getUint32(0);if(ascii(b,i+4,4)==="acTL")throw Error("Choose a still image.");if(size>b.length-i-12)throw Error("The image is damaged.");i+=size+12;}
  return "image/png";
 }
 if(b[0]===255&&b[1]===216&&b[2]===255)return "image/jpeg";
 if(ascii(b,0,4)==="RIFF"&&ascii(b,8,4)==="WEBP"){
  for(let i=12;i+8<=b.length;){const tag=ascii(b,i,4),size=new DataView(b.buffer,b.byteOffset+i+4,4).getUint32(0,true);if(tag==="ANIM"||tag==="ANMF")throw Error("Choose a still image.");if(size>b.length-i-8)throw Error("The image is damaged.");i+=8+size+(size%2);}
  return "image/webp";
 }
 throw Error("Choose a real PNG, JPEG or WebP image; SVG and GIF are not accepted.");
}
export function rasterData(bytes:Uint8Array):string {const type=rasterType(bytes);if(bytes.length>PORTRAIT_INPUT_LIMIT)throw Error("Choose an image under 5 MB.");let binary="";for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return `data:${type};base64,${btoa(binary)}`;}
export function rasterSize(b:Uint8Array):{width:number;height:number}{
 const mime=rasterType(b),view=new DataView(b.buffer,b.byteOffset,b.byteLength);
 if(mime==="image/png"&&b.length>=24)return {width:view.getUint32(16),height:view.getUint32(20)};
 if(mime==="image/jpeg")for(let i=2;i+4<b.length;){if(b[i]!==255)throw Error("The image is damaged.");const marker=b[i+1];i+=2;if(marker===216||marker===217)continue;if(marker===218)break;const length=view.getUint16(i);if(length<2||i+length>b.length)throw Error("The image is damaged.");if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)&&length>=7)return {width:view.getUint16(i+5),height:view.getUint16(i+3)};i+=length;}
 if(mime==="image/webp"){
  const kind=ascii(b,12,4);if(kind==="VP8X"&&b.length>=30)return {width:1+b[24]+(b[25]<<8)+(b[26]<<16),height:1+b[27]+(b[28]<<8)+(b[29]<<16)};
  if(kind==="VP8 "&&b.length>=30)return {width:view.getUint16(26,true)&16383,height:view.getUint16(28,true)&16383};
  if(kind==="VP8L"&&b.length>=25){const n=view.getUint32(21,true);return {width:1+(n&16383),height:1+((n>>>14)&16383)};}
 }
 throw Error("The image dimensions are unavailable.");
}
export function portraitBytes(data:unknown,max=PORTRAIT_LIMIT):Uint8Array {
 if(typeof data!=="string"||data.length>Math.ceil(max/3)*4+40||!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]*={0,2}$/.test(data))throw Error("Invalid portrait.");
 const comma=data.indexOf(",");let raw:string;try{raw=atob(data.slice(comma+1));}catch{throw Error("Invalid portrait.");}
 if(raw.length>max)throw Error("The portrait is too large.");const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));if(!data.startsWith(`data:${rasterType(bytes)};`))throw Error("The image type does not match its contents.");if(max===PORTRAIT_LIMIT){const size=rasterSize(bytes);if(size.width!==128||size.height!==128)throw Error("Portraits must be 128 by 128.");}return bytes;
}
export async function preparePortrait(file:Blob):Promise<string> {
 if(!file.size||file.size>PORTRAIT_INPUT_LIMIT)throw Error("Choose an image under 5 MB.");
 const bytes=new Uint8Array(await file.arrayBuffer()),mime=rasterType(bytes);const size=rasterSize(bytes);if(!size.width||!size.height||size.width*size.height>32000000)throw Error("Choose an image with smaller dimensions.");
 if(file.type && file.type!==mime)throw Error("The image type does not match its contents.");
 if(typeof createImageBitmap!=="function")throw Error("This browser cannot prepare portraits. Try a recent browser.");
 let bitmap:ImageBitmap;try{bitmap=await createImageBitmap(new Blob([bytes],{type:mime}));}catch{throw Error("This image could not be read. Choose another PNG, JPEG or WebP.");}
 try {
  if(!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>32000000)throw Error("Choose an image with smaller dimensions.");
  const canvas=document.createElement("canvas");canvas.width=canvas.height=128;const context=canvas.getContext("2d");if(!context)throw Error("Images cannot be prepared here.");
  const side=Math.min(bitmap.width,bitmap.height);context.drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,128,128);
  for(const quality of [.84,.7,.5,.3]){const data=canvas.toDataURL("image/webp",quality);try{portraitBytes(data);return data;}catch{}}
  throw Error("This portrait could not be made small enough.");
 }finally{bitmap.close();}
}
const exact=(name:string)=>name.trim().toLocaleLowerCase("en-US");
export function portraitSource(name:string,custom:Record<string,string>,sources:PortraitSources,player=false):string|undefined {
 const key=exact(name);if(Object.hasOwn(custom,key))return custom[key];
 // Never use another user's character/persona as the current player's portrait.
 if(player)return sources.persona&&exact(sources.persona.name)===key?sources.persona.data:undefined;
 const matches=sources.characters.filter(c=>exact(c.name)===key);return matches.length===1?matches[0].data:undefined;
}
export const portraitKey=exact;
export function initialTone(name:string):number {let hash=0;for(const c of exact(name))hash=(hash*31+c.codePointAt(0)!)>>>0;return hash%5;}
