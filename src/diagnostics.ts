import type { ParseIssue } from "./schema";
import type { StoryRow } from "./engine";

/** No prose, field values, raw unknown keys, or exception messages enter the log. */
export class SkipLogger {
  private seen = new Map<string, string>();
  constructor(private warn: (text: string) => void, private limit = 1000) {}
  record(chatId: string, row: StoryRow, issues: ParseIssue[]): void {
    const key = JSON.stringify([chatId, row.id, row.swipe_id]);
    if (!issues.length) { this.seen.delete(key); return; }
    // Bounded deduplication for repeated history replay and macro reads.
    let hash = 2166136261;
    for (let i = 0; i < row.content.length; i++) hash = Math.imul(hash ^ row.content.charCodeAt(i), 16777619);
    const signature = JSON.stringify([hash >>> 0, row.content.length, issues]);
    if (this.seen.get(key) === signature) return;
    this.seen.delete(key); this.seen.set(key, signature);
    while (this.seen.size > this.limit) this.seen.delete(this.seen.keys().next().value!);
    if(issues.some(i=>i.field==="phone-text"&&i.reason==="recipient is not a confirmed player"))this.warn("Lumi Phone Tracker: text tag ignored: recipient is not a confirmed player.");
    issues=issues.filter(i=>i.field!=="phone-text");
    if(!issues.length)return;
    const count = issues.length;
    this.warn(`Lumi Phone Tracker: skipped invalid tracker data ${JSON.stringify({ chatId, messageId: row.id,
      swipe: row.swipe_id, issues: issues.slice(0, 20), ...(count > 20 ? { additionalIssues: count - 20 } : {}) })}`);
  }
}

/** Keep original errors available to callers, but never serialize them into logs. */
class OperationFailure extends Error {
  constructor(readonly operation: string, readonly original: unknown) {
    super(original instanceof Error ? original.message : "Host operation failed");
  }
}
export async function atOperation<T>(operation: string, action: () => Promise<T>): Promise<T> {
  try { return await action(); } catch (error) {
    throw error instanceof OperationFailure ? error : new OperationFailure(operation,error);
  }
}
/** Categories are fixed literals: arbitrary host messages, stacks and values stay private. */
export function failureDetails(error: unknown): { category: string; operation?: string } {
  const operation=error instanceof OperationFailure ? error.operation : undefined;
  const original=error instanceof OperationFailure ? error.original : error;
  const message=original instanceof Error ? original.message : typeof original==="string"?original:"";
  const exact:Record<string,string>={
    "userId is required for operator-scoped extensions":"missing-user-context",
    "Chat unavailable":"chat-unavailable",
    "Allow chat access in Extensions.":"permission-missing",
    "Invalid saved data":"saved-data-validation",
    "Invalid saved source":"saved-source-validation",
    "Invalid saved contact":"saved-contact-validation",
    "Invalid saved state":"saved-state-validation",
    "Invalid saved text":"saved-text-validation",
    "Invalid checkpoint":"checkpoint-validation",
    "Invalid checkpoint source":"checkpoint-source-validation",
    "Invalid edit":"edit-validation",
    "Invalid contact details":"contact-validation",
  };
  const category=(Object.hasOwn(exact,message)?exact[message]:undefined) ??
    (/^The (tracker|story) changed\./.test(message)?"revision-conflict":
    /timed? out|timeout|deadline/i.test(message)?"timeout":
    /permission|forbidden|unauthori[sz]ed|access denied/i.test(message)?"permission-denied":
    /ECONNRESET|ECONNREFUSED|socket.*closed|network error/i.test(message)?"connection-failure":
    /SQLITE_BUSY|database is locked/i.test(message)?"database-busy":
    original instanceof SyntaxError?"invalid-json":
    original instanceof RangeError?"range-error":
    original instanceof TypeError?"type-error":"unclassified-error");
  return {category,...(operation?{operation}:{})};
}
export function logFailure(warn:(text:string)=>void, context:{operation:string;event?:string;outcome:string}, error:unknown):void {
  // Call sites supply static operation/event/outcome labels, never request payloads.
  try { warn(`Lumi Phone Tracker: operation failed ${JSON.stringify({...context,...failureDetails(error)})}`); } catch { /* Diagnostics must not cause another rejection. */ }
}
