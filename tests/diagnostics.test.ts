import {expect,test} from "bun:test";
import {atOperation,failureDetails,logFailure} from "../src/diagnostics";

test("safe failure categories use technical codes without copying private exception content",()=>{
 for(const [message,category] of [
  ["RPC timed out PRIVATE", "host.timeout"],
  ["userId is required for operator-scoped extensions","auth.missing_user_context"],
  ["Chat unavailable","auth.chat_unauthorized"],
  ["Allow chat access in Extensions.","auth.permission_missing"],
  ["Invalid saved data","schema.document_invalid"],
  ["Invalid checkpoint","schema.checkpoint_invalid"],
  ["Invalid saved source","schema.entry_invalid"],
  ["Invalid history","schema.history_invalid"],
  ["Invalid read history","schema.reads_invalid"],
  ["Invalid settings","validation.payload_invalid"],
  ["Turn on the tracker for this chat first.","guard.tracking_disabled"],
  ["Reopen this contact.","guard.stale_entity_ref"],
  ["Contacts is full","guard.capacity_limit"],
  ["A contact with that name already exists","guard.duplicate_entity"],
  ["The tracker changed. Reopen it and try again.","conflict.revision_mismatch"],
  ["The story changed. Reopen the tracker and try again.","conflict.accepted_state_drift"],
  ["The chat changed. Reopen it first.","conflict.chat_revision_mismatch"],
  ["SQLITE_BUSY PRIVATE query","host.sqlite_busy"],
  ["ECONNRESET PRIVATE URL","host.network_error"],
  ["Permission denied PRIVATE key","auth.permission_denied"],
  ["PRIVATE arbitrary story","runtime.unclassified"],
  ["__proto__","runtime.unclassified"],
 ]) {
  const logs:string[]=[];
  logFailure(s=>logs.push(s),{operation:"tracker.open",outcome:"operation-not-completed"},Error(message));
  expect(logs[0]).toContain(`"category":"${category}"`);
  expect(logs[0]).not.toContain("PRIVATE");
 }
 const abortErr=new Error("PRIVATE cancelled"); abortErr.name="AbortError";
 expect(failureDetails(abortErr)).toEqual({category:"host.aborted"});
 expect(failureDetails(new SyntaxError("PRIVATE JSON"))).toEqual({category:"runtime.json_syntax_error"});
 expect(()=>logFailure(()=>{throw Error("logger offline");},{operation:"tracker.open",outcome:"unknown"},null)).not.toThrow();
});
test("operation wrappers preserve caller error messages and identify the innermost host operation",async()=>{
 try {
  await atOperation("tracker.open",()=>atOperation("history.read",async()=>{throw Error("RPC timed out PRIVATE");}));
  throw Error("Expected failure");
 } catch(error) {
  expect(failureDetails(error)).toEqual({operation:"history.read",category:"host.timeout"});
  expect((error as Error).message).toBe("RPC timed out PRIVATE");
 }
 expect(await atOperation("tracker.read",async()=>42)).toBe(42);
});
