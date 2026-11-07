import {showCopyableError} from "./copy-error";
import type {Document} from "./model";
import type {SetupData} from "./setup-wizard";
import {SETUP_GROUPS,SETUP_FIELD_IDS,type SetupField} from "./setup-fields";
import type {SetupDecision} from "./setup-review";
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,cls:string,text?:string)=>{const n=document.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;return n;};
export type SetupRequest=(action:"prepare"|"run"|"save"|"choices"|"choices_save",data:Record<string,unknown>)=>Promise<Record<string,unknown>>;
export class SetupView {
 readonly root=el("section","lpt-setup is-open");private doc:Document|null=null;private chat:string|null=null;private epoch=0;private busy=false;private chosen=new Set<SetupField>();private loadingChoices=false;private error=false;
 private plan:{id:string;charactersRead:number;messagesRead:number;requests:number}|null=null;private preview:SetupData|null=null;private message="";private decisions=new Map<number,SetupDecision>();
 constructor(private request:SetupRequest){this.render();}
 receive(doc:Document|null):void {this.doc=doc;if(this.chat!==(doc?.chatId??null)){this.chat=doc?.chatId??null;this.epoch++;this.chosen.clear();this.plan=null;this.preview=null;this.decisions.clear();this.busy=false;this.message="";this.error=false;this.loadingChoices=!!doc;if(doc)void this.loadChoices(this.epoch);}this.render();}
 private async loadChoices(epoch:number):Promise<void>{
  try{const result=await this.request("choices",{});if(epoch===this.epoch&&Array.isArray(result.choices))this.chosen=new Set(result.choices.filter(field=>SETUP_FIELD_IDS.includes(field)));}
  catch{if(epoch===this.epoch){this.error=true;this.message="Could not read saved setup choices.";}}
  finally{if(epoch===this.epoch){this.loadingChoices=false;this.render();}}
 }
 private persistChoices():void {
  const epoch=this.epoch;
  void this.request("choices_save",{choices:[...this.chosen]}).catch(()=>{if(epoch===this.epoch){this.error=true;this.message="Could not save setup choices.";this.render();}});
 }
 private setGroup(fields:readonly (readonly [SetupField,string])[],on:boolean):void {
  for(const [field] of fields)if(on)this.chosen.add(field);else this.chosen.delete(field);
  this.root.querySelectorAll<HTMLInputElement>(".lpt-setup-checkbox").forEach(input=>{input.checked=!input.disabled&&this.chosen.has(input.dataset.field as SetupField);});
  this.persistChoices();
 }
 private button(parent:HTMLElement,label:string,fn:()=>void,cls=""):HTMLButtonElement {const b=el("button",`lpt-button lpt-setup-button ${cls}`,label);b.type="button";b.disabled=this.busy;b.addEventListener("click",()=>{if(b.isConnected&&!this.busy)fn();});parent.append(b);return b;}
 private async act(action:"prepare"|"run"|"save"):Promise<void>{if(this.busy||this.loadingChoices||!this.doc)return;const epoch=this.epoch;this.busy=true;this.error=false;this.message="";this.render();try{
  const result=await this.request(action,action==="prepare"?{choices:SETUP_GROUPS.flatMap(g=>this.doc?.settings.apps[g.app]?g.fields.map(([f])=>f).filter(f=>this.chosen.has(f)):[])}:{id:this.plan?.id,...(action==="save"?{confirm:true,decisions:[...this.decisions.values()]}:{})});
  if(epoch!==this.epoch)return;if(action==="prepare")this.plan=result as unknown as typeof this.plan;else if(action==="run"){this.preview=result.data as SetupData;this.decisions.clear();}else{this.plan=null;this.preview=null;this.decisions.clear();this.message="Setup saved. Existing edits were kept.";}
 }catch(error){if(epoch===this.epoch){this.error=true;this.message=error instanceof Error?error.message:"Setup failed. Nothing was saved.";if(action==="run"){this.plan=null;this.preview=null;}}}finally{if(epoch===this.epoch){this.busy=false;this.render();}}}
 destroy():void {this.epoch++;this.doc=null;this.root.remove();}
 private render():void {
  this.root.replaceChildren();if(!this.doc){this.root.append(el("p","lpt-setup-hint","Open a chat to use setup."));return;}
  if(!this.plan){
   this.root.append(el("p","lpt-setup-question","What do you want to add?"));
   for(const group of SETUP_GROUPS){const fields=el("fieldset","lpt-side-group lpt-setup-fields");fields.append(el("legend","lpt-side-legend",group.app));
    const actions=el("div","lpt-setup-group-actions");
    for(const [label,on] of [["Select all",true],["Clear all",false]] as const){const button=this.button(actions,label,()=>this.setGroup(group.fields,on));button.setAttribute("aria-label",`${label} ${group.app} fields`);button.disabled=this.busy||this.loadingChoices||!this.doc.settings.apps[group.app];}
    fields.append(actions);
    for(const [field,title] of group.fields){const label=el("label","lpt-toggle-chip lpt-setup-choice"),input=el("input","lpt-side-checkbox lpt-setup-checkbox");input.type="checkbox";input.setAttribute("role","switch");input.dataset.field=field;input.checked=this.chosen.has(field)&&!!this.doc.settings.apps[group.app];input.disabled=this.busy||this.loadingChoices||!this.doc.settings.apps[group.app];input.setAttribute("aria-label",title);input.addEventListener("change",()=>{if(!input.isConnected||this.busy)return;if(input.checked)this.chosen.add(field);else this.chosen.delete(field);this.persistChoices();});label.append(input,el("span","lpt-setup-choice-label",title));fields.append(label);}
    if(!this.doc.settings.apps[group.app])fields.append(el("small","lpt-setup-hint","Add this app in the App Store first."));this.root.append(fields);
   }
   this.root.append(el("p","lpt-setup-source",this.doc.settings.source==="main"?"Uses Main AI: your Lumiverse default connection.":"Uses your selected Custom connection."),el("p","lpt-setup-hint","Reads the card, your persona and attached/global lorebooks. Scene is excluded. These import choices do not change tracking switches."));this.button(this.root,"Review input",()=>void this.act("prepare")).disabled=this.busy||this.loadingChoices;
  }else if(!this.preview){
   this.root.append(el("p","lpt-setup-cost",`${this.plan.charactersRead} source characters read. ${this.plan.messagesRead} request messages. Model requests: ${this.plan.requests}.`),el("p","lpt-setup-hint","Nothing is saved until you confirm the preview."));
   this.button(this.root,"Run setup",()=>void this.act("run"));this.button(this.root,"Change selection",()=>{this.plan=null;this.message="";this.render();});
  }else{
   const preview=el("div","lpt-setup-preview"),data=this.preview;
   for(const [title,values] of [["Contacts",data.contacts],["Notes",data.notes],["Locations",data.locations]] as const){if(!values.length)continue;preview.append(el("h3","lpt-setup-group-title",title));
    for(const [index,item] of values.entries()){
     const row=el("article","lpt-setup-record");row.append(el("strong","lpt-setup-record-name",item.name));
     for(const [key,value]of Object.entries(item)){if(["name","match","fakeFields"].includes(key)||value===undefined||value===null)continue;const text=Array.isArray(value)?value.map(v=>typeof v==="string"?v:`${v.label}: ${v.value}`).join("; "):typeof value==="object"?Object.entries(value).map(([k,v])=>`${k}: ${(v as string[]).join("; ")}`).join(" | "):String(value);if(text){const fake="fakeFields"in item&&(item.fakeFields as string[]|undefined)?.includes(key);row.append(el("p","lpt-setup-record-value",`${key}: ${text}${fake?" (made up)":""}`));}}
     if(title==="Contacts"){
      const contact=data.contacts[index],match=contact.match;if(match){
       row.append(el("p","lpt-setup-match",`${match.label}: ${match.targets.join(" / ")}`));const options=el("div","lpt-setup-duplicates");
       const select=el("select","lpt-setup-merge-target");select.setAttribute("aria-label",`Merge target for ${contact.name}`);for(const name of match.targets){const o=el("option","lpt-setup-target",name);o.value=name;select.append(o);}select.value=this.decisions.get(index)?.target??match.targets[0];select.disabled=this.busy;options.append(select);
       const keep=el("input","lpt-setup-keep-name");keep.type="text";keep.maxLength=100;keep.value=this.decisions.get(index)?.name??contact.name;keep.setAttribute("aria-label",`Separate name for ${contact.name}`);keep.disabled=this.busy;options.append(keep);
       const merge=this.button(options,"Merge",()=>{this.decisions.set(index,{index,action:"merge",target:select.value});this.render();},"lpt-setup-merge");const separate=this.button(options,"Keep both",()=>{this.decisions.set(index,{index,action:"keep",name:keep.value});this.render();},"lpt-setup-keep");
       const decision=this.decisions.get(index);merge.setAttribute("aria-pressed",String(decision?.action==="merge"));separate.setAttribute("aria-pressed",String(decision?.action==="keep"));select.addEventListener("change",()=>{if(this.decisions.get(index)?.action==="merge")this.decisions.set(index,{index,action:"merge",target:select.value});});keep.addEventListener("input",()=>{if(this.decisions.get(index)?.action==="keep")this.decisions.set(index,{index,action:"keep",name:keep.value});});row.append(options);
      }
     }
     preview.append(row);
    }
   }
   this.root.append(preview);if(!data.contacts.length&&!data.notes.length&&!data.locations.length)this.root.append(el("p","lpt-setup-empty is-empty","No new supported information was found. Existing information was kept."));else{
    this.root.append(el("p","lpt-setup-hint","Review these additions. Merge fills empty fields only. Existing edits stay unchanged."));const save=this.button(this.root,"Save these additions",()=>void this.act("save"));save.disabled=this.busy||data.contacts.some((c,i)=>c.match&&!this.decisions.has(i));
   }
   this.button(this.root,"Discard preview",()=>{this.plan=null;this.preview=null;this.decisions.clear();this.message="";this.render();});
  }
  const status=el("p","lpt-setup-status",this.busy?"Working...":this.message);status.setAttribute("role","status");if(this.error&&!this.busy&&this.message)showCopyableError(status,this.message);this.root.append(status);
 }
}
