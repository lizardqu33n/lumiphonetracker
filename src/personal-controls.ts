import {emptyPersonal,builtInPresets,readPersonal,validWording,SYNTAX_TOKEN,type PersonalReply,type WordingTarget} from "./personal-settings";
import type {Document} from "./model";
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,cls:string,text?:string)=>{const n=document.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;return n;};
export class PersonalControls {
 readonly presets=el("div","lpt-personal-presets");readonly wording=el("details","lpt-wording");
 private p=emptyPersonal();private templates={main:"",helper:""};private doc:Document|null=null;private chat:string|null|undefined;private epoch=0;private pending=false;private loaded=false;private error="";
 private preset="default";private presetName="";private confirm=false;private target:WordingTarget="main";private choice="default";private copy=false;private title="";private text="";private preview="";private count="";private note="";
 constructor(private request:(change?:unknown,revision?:number)=>Promise<PersonalReply>){this.render();}
 receive(doc:Document|null):void {this.doc=doc;const next=doc?.chatId??null;if(this.chat===next)return;this.chat=next;this.epoch++;this.confirm=false;this.preview="";this.count="";this.pending=false;this.render();void this.load();}
 private async load():Promise<void>{const epoch=this.epoch;try{const result=await this.request();if(epoch!==this.epoch)return;this.p=readPersonal(result.personal);this.templates=result.templates;this.loaded=true;this.choose();this.error="";}catch{if(epoch!==this.epoch)return;this.loaded=false;this.error="Your saved choices could not be loaded. Try reopening this chat.";}this.render();}
 private choose():void {this.choice=this.p.selected[this.target];this.copy=false;const found=this.p.wordings[this.target].find(w=>w.id===this.choice);this.title=found?.name??"";this.text=found?.text??this.templates[this.target];this.preview="";this.count="";this.note="";}
 private async run(change:unknown):Promise<void>{if(this.pending||!this.loaded)return;const epoch=this.epoch;this.pending=true;this.error="";this.render();try{const result=await this.request(change,this.p.revision);if(epoch!==this.epoch)return;this.p=readPersonal(result.personal);this.templates=result.templates;
 if(result.preview){this.preview=result.preview.text;this.count=`${result.preview.characters} characters · Rough token estimate: ${result.preview.tokenEstimate}`;this.note=result.preview.warning;}
 else {this.choose();this.error="Saved.";if((change as {kind?:string}).kind==="preset_apply")this.error="Applied to this chat.";if((change as {kind?:string}).kind==="preset_save")this.preset=this.p.presets.at(-1)?.id??"default";if((change as {kind?:string}).kind==="wording_save"&&!validWording((change as {text?:unknown}).text))this.error="Invalid wording. Default is in use.";}
 }catch{if(epoch!==this.epoch)return;this.error="Could not save. Check the name, limits and current chat, then try again.";}finally{if(epoch===this.epoch){this.pending=false;this.render();}}}
 private button(parent:HTMLElement,title:string,fn:()=>void,disabled=false):HTMLButtonElement {const b=el("button","lpt-personal-button",title);b.type="button";b.disabled=disabled||this.pending||!this.loaded;b.addEventListener("click",()=>{if(b.isConnected&&!this.pending)fn();});parent.append(b);return b;}
 private input(parent:HTMLElement,label:string,value:string,change:(v:string)=>void):HTMLInputElement {const wrap=el("label","lpt-personal-label",label),input=el("input","lpt-personal-input");input.value=value;input.maxLength=40;input.setAttribute("aria-label",label);input.disabled=this.pending;input.addEventListener("input",()=>change(input.value));wrap.append(input);parent.append(wrap);return input;}
 private render():void {
 this.presets.replaceChildren();this.wording.replaceChildren();
 this.presets.append(el("p","lpt-side-help","Up to 20 settings profiles, saved for you. Applying a profile changes only this chat's switches and limits. Story data stays, including hidden apps."));
 const row=el("div","lpt-personal-row"),select=el("select","lpt-personal-select");select.setAttribute("aria-label","Settings profile");for(const p of [...builtInPresets(),...this.p.presets]){const o=el("option","",p.name);o.value=p.id;select.append(o);}select.value=this.preset;if(!select.value){this.preset="default";select.value=this.preset;}select.disabled=this.pending||!this.loaded;select.addEventListener("change",()=>{this.preset=select.value;this.confirm=false;this.render();});row.append(select);this.presets.append(row);
 this.button(row,"Apply",()=>{this.confirm=true;this.render();},!this.doc);
 if(this.confirm){const box=el("div","lpt-preset-confirm");box.append(el("p","lpt-side-help","Apply this settings profile to the current chat? Story data will stay."));this.button(box,"Apply to this chat",()=>{this.confirm=false;void this.run({kind:"preset_apply",id:this.preset,confirm:true});},!this.doc);this.button(box,"Cancel",()=>{this.confirm=false;this.render();});this.presets.append(box);}
 this.input(this.presets,"Profile name",this.presetName,v=>this.presetName=v);
 const actions=el("div","lpt-personal-row");this.presets.append(actions);
 this.button(actions,"Save current as...",()=>void this.run({kind:"preset_save",name:this.presetName}),!this.doc||this.p.presets.length>=20);
 const builtin=["default","minimal"].includes(this.preset);
 this.button(actions,"Rename",()=>void this.run({kind:"preset_rename",id:this.preset,name:this.presetName}),builtin);
 this.button(actions,"Delete",()=>void this.run({kind:"preset_delete",id:this.preset}),builtin);
 this.presets.append(el("p","lpt-personal-status",this.error));
 const summary=el("summary","lpt-side-css-summary","Prompt wording · All my chats");this.wording.append(summary);
 this.wording.append(el("p","lpt-side-help","Up to 10 custom wordings total. Copy Default to reword it. Keep [[phone_syntax]] for the protected format. App headings hide their wording when an app is removed. Safety checks stay on."));
 const target=el("select","lpt-personal-select");target.setAttribute("aria-label","Wording for");for(const [id,name] of [["main","Main AI"],["helper","Custom connection"]]){const o=el("option","",name);o.value=id;target.append(o);}target.value=this.target;target.addEventListener("change",()=>{this.target=target.value as WordingTarget;this.choose();this.render();});target.disabled=this.pending;this.wording.append(target);
 const choice=el("select","lpt-personal-select");choice.setAttribute("aria-label","Prompt wording");for(const w of [{id:"default",name:"Default"},...this.p.wordings[this.target]]){const o=el("option","",w.name);o.value=w.id;choice.append(o);}if(this.copy){const unsaved=el("option","","Unsaved copy");unsaved.value="new";unsaved.disabled=true;choice.append(unsaved);}choice.value=this.choice;choice.disabled=this.pending||!this.loaded;choice.addEventListener("change",()=>void this.run({kind:"wording_select",target:this.target,id:choice.value}));this.wording.append(choice);
 this.button(this.wording,"Copy Default",()=>{this.copy=true;this.choice="new";this.title="";this.text=this.templates[this.target];this.preview="";this.count="";this.render();},this.p.wordings.main.length+this.p.wordings.helper.length>=10);
 this.input(this.wording,"Wording name",this.title,v=>this.title=v).disabled=this.pending||(!this.copy&&this.choice==="default");
 const editor=el("textarea","lpt-wording-editor");editor.value=this.text;editor.maxLength=4000;editor.readOnly=!this.copy&&this.choice==="default";editor.disabled=this.pending;editor.setAttribute("aria-label","Wording text");editor.addEventListener("input",()=>{this.text=editor.value;this.preview="";this.note=this.text.includes(SYNTAX_TOKEN)?"":"Generated syntax will be appended: [[phone_syntax]] is missing.";note.textContent=this.note;});this.wording.append(editor);
 const note=el("p","lpt-wording-warning",this.note);note.setAttribute("role","status");this.wording.append(note);
 const buttons=el("div","lpt-personal-row");this.wording.append(buttons);
 this.button(buttons,"Save wording",()=>void this.run({kind:"wording_save",target:this.target,...(!this.copy?{id:this.choice}:{}),name:this.title,text:this.text}),!this.copy&&this.choice==="default");
 this.button(buttons,"Delete wording",()=>void this.run({kind:"wording_delete",target:this.target,id:this.choice}),this.copy||this.choice==="default");
 this.button(buttons,"Reset to default",()=>void this.run({kind:"wording_select",target:this.target,id:"default"}));
 this.button(buttons,"Preview",()=>void this.run({kind:"preview",target:this.target,...(this.copy||this.choice!=="default"?{text:this.text}:{})}),!this.doc);
 this.wording.append(el("p","lpt-side-help",this.target==="helper"?"Preview shows the exact custom connection instructions. Its separate recent-story data is unchanged.":"Preview shows the exact phone_format output for this chat. Save edits to use them."));
 this.wording.append(el("p","lpt-wording-count",this.count));const pre=el("pre","lpt-wording-preview",this.preview);pre.hidden=!this.preview;this.wording.append(pre,el("p","lpt-personal-status",this.error));
 }
}
