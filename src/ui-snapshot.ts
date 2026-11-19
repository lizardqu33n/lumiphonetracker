import type {Document} from "./model";
export type PhoneSnapshot=Pick<Document,"schema"|"trackingEnabled"|"chatId"|"revision"|"settings"|"state"|"playerNames"|"currentPlayer"|"fieldLocks"|"contactInfo"|"portraits"> & {contactRenames:Pick<Document["edits"][number],"target"|"name"|"rename">[]};
export function phoneSnapshot(doc:Document):PhoneSnapshot {
 const {schema,trackingEnabled,chatId,revision,settings,state,playerNames,currentPlayer,fieldLocks,contactInfo,portraits}=doc;
 const contactRenames=doc.edits.filter(e=>e.target==="contact"&&e.rename).map(({target,name,rename})=>({target,name,rename}));
 return {contactRenames,schema,trackingEnabled,chatId,revision,settings,state,playerNames,currentPlayer,fieldLocks,contactInfo,portraits};
}

/** Trim transport only; stored personal receipts are never deleted. */
export function snapshotReads(reads:import("./messages").ReadState,doc:PhoneSnapshot):import("./messages").ReadState {
 const active=new Set([...doc.state.messages,...doc.state.calls,...doc.state.emails].map(m=>m.id));
 return {revision:reads.revision,seen:Object.fromEntries(Object.entries(reads.seen).filter(([id])=>active.has(id)))};
}
