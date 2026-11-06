/** Local CSS uploads only; contents are kept in the existing per-user preferences. */
export const STYLE_FILE_LIMIT=256*1024;
export async function readStyleFile(file:File):Promise<string> {
 if(!/\.css$/i.test(file.name))throw Error("Choose a .css file.");
 if(file.size>STYLE_FILE_LIMIT)throw Error("Choose a CSS file no larger than 256 KB.");
 let text:string;try{text=new TextDecoder("utf-8",{fatal:true}).decode(await file.arrayBuffer());}catch{throw Error("Save the CSS file as UTF-8 text.");}
 if(text.includes("\0"))throw Error("Choose a plain-text CSS file.");
 return text;
}
