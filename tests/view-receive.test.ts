import {test,expect} from "bun:test";
import {PhoneView} from "../src/phone-view";
import {emptyDocument} from "../src/model";
import {phoneSnapshot} from "../src/ui-snapshot";
import {emptyReads} from "../src/messages";

test("same-revision snapshots skip large state/portrait serialization but accept newer personal receipts",()=>{
 const doc=phoneSnapshot(emptyDocument("shared"));doc.currentPlayer="Player";
 const repeated=structuredClone(doc);
 Object.defineProperty(repeated.state,"toJSON",{value:()=>{throw Error("State was serialized");}});
 Object.defineProperty(repeated.portraits??(repeated.portraits={}),"toJSON",{value:()=>{throw Error("Portraits were serialized");}});
 const receiver={doc,reads:emptyReads(),receiveReads(value:ReturnType<typeof emptyReads>){this.reads=value;}};
 for(let i=0;i<1000;i++)PhoneView.prototype.receive.call(receiver as never,repeated);
 const newer={revision:1,seen:{text:"receipt"}};
 PhoneView.prototype.receive.call(receiver as never,repeated,newer);
 expect(receiver.doc).toBe(repeated);expect(receiver.reads).toBe(newer);
 PhoneView.prototype.receive.call(receiver as never,repeated,emptyReads());
 expect(receiver.reads).toBe(newer);
});
test("chat, revision and player changes all take the full comparison path",()=>{
 const doc=phoneSnapshot(emptyDocument("shared"));doc.currentPlayer="Player";
 for(const change of [{chatId:"other"},{revision:doc.revision+1},{currentPlayer:"Other"}]){
  const incoming={...structuredClone(doc),...change};
  Object.defineProperty(incoming.state,"toJSON",{value:()=>{throw Error("Full comparison reached");}});
  expect(()=>PhoneView.prototype.receive.call({doc} as never,incoming)).toThrow("Full comparison reached");
 }
});
