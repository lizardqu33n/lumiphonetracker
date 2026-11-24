import {expect,test} from "bun:test";
import {atOperation,failureDetails,logFailure} from "../src/diagnostics";

test("safe failure categories cover host errors without copying private exception content",()=>{
 for(const [message,category] of [
  ["RPC timed out PRIVATE", "timeout"],
  ["userId is required for operator-scoped extensions","missing-user-context"],
  ["Invalid saved source","saved-source-validation"],
  ["The tracker changed. Reopen it and try again.","revision-conflict"],
  ["SQLITE_BUSY PRIVATE query","database-busy"],
  ["ECONNRESET PRIVATE URL","connection-failure"],
  ["Permission denied PRIVATE key","permission-denied"],
  ["PRIVATE arbitrary story","unclassified-error"],
  ["__proto__","unclassified-error"],
 ]) {
  const logs:string[]=[];
  logFailure(s=>logs.push(s),{operation:"tracker.open",outcome:"operation-not-completed"},Error(message));
  expect(logs[0]).toContain(`"category":"${category}"`);
  expect(logs[0]).not.toContain("PRIVATE");
 }
 expect(failureDetails(new SyntaxError("PRIVATE JSON"))).toEqual({category:"invalid-json"});
 expect(()=>logFailure(()=>{throw Error("logger offline");},{operation:"tracker.open",outcome:"unknown"},null)).not.toThrow();
});
test("operation wrappers preserve caller error messages and identify the innermost host operation",async()=>{
 try {
  await atOperation("tracker.open",()=>atOperation("history.read",async()=>{throw Error("RPC timed out PRIVATE");}));
  throw Error("Expected failure");
 } catch(error) {
  expect(failureDetails(error)).toEqual({operation:"history.read",category:"timeout"});
  expect((error as Error).message).toBe("RPC timed out PRIVATE");
 }
 expect(await atOperation("tracker.read",async()=>42)).toBe(42);
});
