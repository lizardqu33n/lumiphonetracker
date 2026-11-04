import { describe, expect, test } from "bun:test";
import { addReplyDraft, conversations, emptyReads, isUnread, receipt, replyTag, threadKey } from "../src/messages";
import { MessageReads, readState } from "../src/message-reads";
import { parseExpandedReply } from "../src/schema";
import { replay, type StoryRow } from "../src/engine";
import { emptyDocument, type SavedMessage } from "../src/model";
import { PhoneStore } from "../src/phone-store";

const message = (id: string, from = "Ada", more: Partial<SavedMessage> = {}): SavedMessage => ({ id, from, text:`Actual text ${id}`, direction:"incoming", at:{id,index:0,variant:"0"}, ...more });
describe("Step 5 saved texts, read status and draft safety", () => {
  test("sending a named user text does not falsely block subsequent Settings saves", async () => {
    let saved = "";
    const rows:StoryRow[] = [{id:"u",chat_id:"a",index_in_chat:0,role:"user",name:"Player",swipe_id:0,content:replyTag("Player","Ada","Hello")}];
    const store = new PhoneStore({authorize:async()=>true,read:async()=>saved,write:async(_,v)=>{saved=v;},history:async()=>structuredClone(rows),player:async()=>"Player"});
    const doc = await store.sync("user","a");
    const changed = await store.update("user","a",doc.revision,{settings:{enabled:{messages:false}}});
    expect(changed.settings.enabled.messages).toBe(false); expect(changed.state.messages[0].direction).toBe("outgoing");
  });
  test("group chats retain separate sender conversations, case-insensitive replies and unknown recipients", () => {
    const rows = [message("1"), message("2","Bea"), message("3","Player",{direction:"outgoing",to:"ADA"}), message("4","Player",{direction:"outgoing"})];
    const groups = conversations(rows,emptyReads());
    expect(groups.map(g => [g.key,g.messages.length,g.unread])).toEqual([["ada",2,1],["bea",1,1],["",1,0]]);
    expect(threadKey(rows[2])).toBe("ada"); expect(groups[2].name).toBe("Your texts");
  });
  test("read receipts survive restart but never mark unseen arrivals, changed texts, outgoing texts or another sender", async () => {
    const disk = new Map<string,unknown>();
    const io = { read: async (u:string,c:string) => structuredClone(disk.get(`${u}/${c}`) ?? emptyReads()), write: async(u:string,c:string,v:unknown) => { disk.set(`${u}/${c}`,structuredClone(v)); } };
    const store = new MessageReads(io); const a = message("1"); const b = message("2","Bea"); const newA = message("3");
    const reads = await store.mark("u","chat","ada",[{id:a.id,receipt:receipt(a)},{id:b.id,receipt:receipt(b)}],[a,b,newA]);
    expect(isUnread(a,reads)).toBe(false); expect(isUnread(b,reads)).toBe(true); expect(isUnread(newA,reads)).toBe(true);
    expect(isUnread({...a,text:"Edited actual text"},reads)).toBe(true);
    expect(isUnread({...a,id:"alternate-swipe"},reads)).toBe(true);
    expect(isUnread({...newA,direction:"outgoing"},reads)).toBe(false);
    expect(await new MessageReads(io).read("u","chat")).toEqual(reads);
    expect(await store.read("other-user","chat")).toEqual(emptyReads()); expect(await store.read("u","other-chat")).toEqual(emptyReads());
  });
  test("a text changed while marking read remains unread; parallel marks preserve both conversations", async () => {
    let disk:unknown = emptyReads(); const store = new MessageReads({read:async()=>structuredClone(disk),write:async(_,__,v)=>{disk=structuredClone(v);}});
    const a = message("1"); const b = message("2","Bea");
    const skipped = await store.mark("u","a","ada",[{id:a.id,receipt:receipt(a)}],[{...a,text:"Changed meanwhile"}]); expect(skipped.seen).toEqual({});
    await Promise.all([store.mark("u","a","ada",[{id:a.id,receipt:receipt(a)}],[a,b]), store.mark("u","a","bea",[{id:b.id,receipt:receipt(b)}],[a,b])]);
    const reads = await store.read("u","a"); expect(isUnread(a,reads)).toBe(false); expect(isUnread(b,reads)).toBe(false);
    expect(()=>readState({revision:-1,seen:{}})).toThrow(); expect(()=>readState({revision:0,seen:{x:4}})).toThrow();
  });
  test("escaped draft tags round-trip names, recipients and literal tag-like message bodies", () => {
    const tag = replyTag('Player & "P"',"Ada's friend",'Yes & no.\n<phone-text from="Fake">literal</phone-text>');
    const parsed = parseExpandedReply(tag); expect(parsed.badTexts).toBe(false); expect(parsed.texts).toEqual([{from:'Player & "P"',to:"Ada's friend",text:'Yes & no.\n<phone-text from="Fake">literal</phone-text>'}]);
    expect(()=>replyTag("", "Ada", "Hi")).toThrow(); expect(()=>replyTag("Player","Ada", " ")).toThrow(); expect(()=>replyTag("Player","Ada","a".repeat(3001))).toThrow();
  });
  function bridge() {
    let text="Existing draft"; let chatId:string|null="a"; let mounted=true; let inserts=0; let focus=0;
    const ctx = {host:{capabilities:{"composer-v1":1}},composer:{getState:()=>({text,chatId,mounted}),insertText:(value:string,options:unknown)=>{ expect(options).toEqual({at:"end"}); text+=value; inserts++; },focus:()=>{focus++;},send:()=>{throw new Error("Must never send");}}};
    return {ctx:ctx as unknown as Parameters<typeof addReplyDraft>[0],state:()=>({text,inserts,focus}),switch:(id:string|null)=>{chatId=id;},unmount:()=>{mounted=false;}};
  }
  test("Add to draft appends without erasing input and never calls send", () => {
    const b = bridge(); const result=addReplyDraft(b.ctx,"a","Player","Ada","I will come.");
    expect(result.manual).toBe(false); expect(b.state()).toEqual({text:'Existing draft\n<phone-text from="Player" to="Ada">I will come.</phone-text>',inserts:1,focus:1});
  });
  test("wrong/unmounted composer refuses writes; unsupported hosts return a manual tag", () => {
    const b=bridge(); b.switch("b"); expect(()=>addReplyDraft(b.ctx,"a","Player","Ada","Hi")).toThrow(); expect(b.state().inserts).toBe(0);
    b.switch("a"); b.unmount(); expect(()=>addReplyDraft(b.ctx,"a","Player","Ada","Hi")).toThrow(); expect(b.state().inserts).toBe(0);
    expect(addReplyDraft({host:{capabilities:{}}} as never,"a","Player","Ada","Hi")).toEqual({manual:true,tag:'<phone-text from="Player" to="Ada">Hi</phone-text>'});
  });
  test("focus failure after insertion is still a successful draft addition", () => {
    const b=bridge(); b.ctx.composer!.focus=()=>{throw new Error("Focus unavailable");};
    expect(addReplyDraft(b.ctx,"a","Player","Ada","Hi").manual).toBe(false); expect(b.state().inserts).toBe(1);
  });
  test("only saved authored user tags file outgoing replies, and recipient survives replay", () => {
    const tag=replyTag("Player","Ada","On my way.");
    const doc=emptyDocument("a"); expect(replay(doc,[],["Player"]).state.messages).toEqual([]);
    const row:StoryRow={id:"u1",chat_id:"a",index_in_chat:0,role:"user",name:"Player",swipe_id:0,content:tag};
    const saved=replay(doc,[row],["Player"]); expect(saved.state.messages.map(m=>[m.direction,m.to,m.text])).toEqual([["outgoing","Ada","On my way."]]);
    expect(replay(saved,[],["Player"]).state.messages).toEqual([]);
    expect(replay(doc,[{...row,name:"Someone else"}],["Player"]).state.messages).toEqual([]);
    expect(replay(doc,[{...row,role:"assistant"}],["Player"]).state.messages).toEqual([]);
  });
});
