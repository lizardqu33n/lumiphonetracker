import {EMOJI_IMAGES,EMOJI_NAMES,type EmojiName} from "./emoji-assets";
export {EMOJI_NAMES};
export type EmojiPart=string|{name:EmojiName};
/** Display only. Source data, shorthand, evidence and macros are never rewritten. */
export function emojiParts(text:string):EmojiPart[]{
 const parts:EmojiPart[]=[];let offset=0;
 for(const match of text.matchAll(/:([a-z_]+):/g))if(Object.hasOwn(EMOJI_IMAGES,match[1])){if(match.index!>offset)parts.push(text.slice(offset,match.index));parts.push({name:match[1] as EmojiName});offset=match.index!+match[0].length;}
 if(offset<text.length)parts.push(text.slice(offset));return parts;
}
export function emojiImage(name:EmojiName):HTMLImageElement {
 const image=document.createElement("img");image.className="lpt-emoji";image.src=EMOJI_IMAGES[name];image.alt=`:${name}:`;image.title=name;image.draggable=false;return image;
}
export function renderEmojiText(node:HTMLElement,text:string):void{
 node.replaceChildren();for(const part of emojiParts(text))node.append(typeof part==="string"?document.createTextNode(part):emojiImage(part.name));
}
export function insertEmoji(value:string,start:number,end:number,name:string,max=3000):{value:string;caret:number}|null {
 if(!Object.hasOwn(EMOJI_IMAGES,name)||!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<start||end>value.length)return null;
 const code=`:${name}:`,next=value.slice(0,start)+code+value.slice(end);return next.length>max?null:{value:next,caret:start+code.length};
}
/** Ordinary nonmodal picker. No host API and no send operation. */
export function attachEmojiPicker(form:HTMLFormElement,input:HTMLTextAreaElement,status:HTMLElement,valid:()=>boolean):HTMLButtonElement {
 const toggle=document.createElement("button");toggle.type="button";toggle.className="lpt-emoji-toggle";toggle.setAttribute("aria-label","Choose emoji");toggle.setAttribute("aria-expanded","false");toggle.title="Choose emoji";toggle.append(emojiImage("smile"));
 const picker=document.createElement("section");picker.className="lpt-emoji-picker";picker.id=`lpt-emoji-${crypto.randomUUID()}`;picker.hidden=true;picker.setAttribute("role","dialog");picker.setAttribute("aria-label","Emoji picker");toggle.setAttribute("aria-controls",picker.id);toggle.setAttribute("aria-haspopup","dialog");
 const header=document.createElement("div");header.className="lpt-emoji-header";const title=document.createElement("strong");title.className="lpt-emoji-title";title.textContent="Emoji";const close=document.createElement("button");close.type="button";close.className="lpt-emoji-close";close.textContent="Close";close.setAttribute("aria-label","Close emoji picker");const tooltip=document.createElement("span");tooltip.className="lpt-emoji-tooltip";tooltip.id=`${picker.id}-name`;tooltip.setAttribute("role","tooltip");header.append(title,tooltip,close);
 const grid=document.createElement("div");grid.className="lpt-emoji-grid";const buttons:HTMLButtonElement[]=[];
 const hide=(focus=false)=>{picker.hidden=true;toggle.setAttribute("aria-expanded","false");if(focus&&valid())input.focus({preventScroll:true});};
 const focus=(index:number)=>{buttons.forEach((b,i)=>{b.tabIndex=i===index?0:-1;});buttons[index]?.focus({preventScroll:true});buttons[index]?.scrollIntoView({block:"nearest"});};
 EMOJI_NAMES.forEach((name,index)=>{const button=document.createElement("button");button.type="button";button.className="lpt-emoji-option";button.dataset.emoji=name;button.title=name;button.setAttribute("aria-label",name);button.tabIndex=index===0?0:-1;const image=emojiImage(name);image.alt="";image.setAttribute("aria-hidden","true");image.removeAttribute("title");button.setAttribute("aria-describedby",tooltip.id);button.append(image);button.addEventListener("focus",()=>{tooltip.textContent=name;});button.addEventListener("mouseenter",()=>{tooltip.textContent=name;});
  button.addEventListener("click",()=>{if(!valid())return;const result=insertEmoji(input.value,input.selectionStart,input.selectionEnd,name,input.maxLength>0?input.maxLength:3000);if(!result){status.textContent="Reply is full. Remove some text first.";return;}input.value=result.value;input.setSelectionRange(result.caret,result.caret);input.dispatchEvent(new Event("input",{bubbles:true}));hide(true);});buttons.push(button);grid.append(button);
 });
 picker.append(header,grid);form.append(picker);
 toggle.addEventListener("click",()=>{if(!valid())return;if(!picker.hidden)hide(true);else {picker.hidden=false;toggle.setAttribute("aria-expanded","true");focus(0);}});close.addEventListener("click",()=>hide(true));
 picker.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();event.stopPropagation();hide(true);return;}const root=form.getRootNode();const active=root instanceof ShadowRoot?root.activeElement:document.activeElement;const index=buttons.findIndex(b=>b===active);if(index<0)return;const columns=getComputedStyle(grid).gridTemplateColumns.split(" ").length;let next=index;switch(event.key){case "ArrowRight":next=(index+1)%buttons.length;break;case "ArrowLeft":next=(index+buttons.length-1)%buttons.length;break;case "ArrowDown":next=Math.min(buttons.length-1,index+columns);break;case "ArrowUp":next=Math.max(0,index-columns);break;case "Home":next=0;break;case "End":next=buttons.length-1;break;default:return;}event.preventDefault();event.stopPropagation();focus(next);});
 toggle.addEventListener("keydown",event=>{if(event.key==="Escape"&&!picker.hidden){event.preventDefault();event.stopPropagation();hide(true);}});
 form.addEventListener("focusout",event=>{const next=event.relatedTarget as Node|null;if(next&&!picker.contains(next)&&next!==toggle)hide();});return toggle;
}
