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
/** Categories are fixed technical literals: arbitrary host messages, stacks and values stay private. */
export function failureDetails(error: unknown): { category: string; operation?: string } {
  const operation=error instanceof OperationFailure ? error.operation : undefined;
  const original=error instanceof OperationFailure ? error.original : error;
  const message=original instanceof Error ? original.message : typeof original==="string"?original:"";
  const exact:Record<string,string>={
    "userId is required for operator-scoped extensions":"auth.missing_user_context",
    "Chat unavailable":"auth.chat_unauthorized",
    "Allow chat access in Extensions.":"auth.permission_missing",
    "Invalid saved data":"schema.document_invalid",
    "Invalid saved state":"schema.document_invalid",
    "Invalid saved metadata":"schema.document_invalid",
    "Invalid player identity":"schema.document_invalid",
    "Invalid rejection data":"schema.document_invalid",
    "Invalid portraits":"schema.document_invalid",
    "Invalid edit admissions":"schema.document_invalid",
    "Invalid field locks":"schema.document_invalid",
    "Invalid field lock":"schema.document_invalid",
    "Invalid merged contacts":"schema.document_invalid",
    "Invalid merge history":"schema.document_invalid",
    "Invalid helper owner":"schema.document_invalid",
    "Invalid helper attempts":"schema.document_invalid",
    "Invalid helper entries":"schema.document_invalid",
    "Invalid helper entry":"schema.document_invalid",
    "Invalid saved tracker":"schema.document_invalid",
    "Invalid checkpoint":"schema.checkpoint_invalid",
    "Invalid checkpoint source":"schema.checkpoint_invalid",
    "Invalid saved source":"schema.entry_invalid",
    "Invalid saved contact":"schema.entry_invalid",
    "Invalid saved text":"schema.entry_invalid",
    "Invalid saved emails":"schema.entry_invalid",
    "Invalid bank proof":"schema.entry_invalid",
    "Invalid saved entry":"schema.entry_invalid",
    "Invalid saved patch":"schema.entry_invalid",
    "Invalid history":"schema.history_invalid",
    "Invalid saved message":"schema.history_invalid",
    "Chat mismatch":"schema.history_invalid",
    "Missing chat":"schema.history_invalid",
    "Invalid read history":"schema.reads_invalid",
    "Invalid edit":"validation.payload_invalid",
    "Invalid edit source":"validation.payload_invalid",
    "Invalid edited fields":"validation.payload_invalid",
    "Invalid editable field":"validation.payload_invalid",
    "Invalid contact edit":"validation.payload_invalid",
    "Invalid place edit":"validation.payload_invalid",
    "Invalid section":"validation.payload_invalid",
    "Invalid player/contact field":"validation.payload_invalid",
    "Invalid contact details":"validation.payload_invalid",
    "Invalid settings":"validation.payload_invalid",
    "Invalid apps":"validation.payload_invalid",
    "Invalid app":"validation.payload_invalid",
    "Invalid switches":"validation.payload_invalid",
    "Invalid switch":"validation.payload_invalid",
    "Invalid connection":"validation.payload_invalid",
    "Invalid source":"validation.payload_invalid",
    "Invalid number":"validation.payload_invalid",
    "Unknown setting":"validation.payload_invalid",
    "Invalid notice":"validation.payload_invalid",
    "Invalid field control":"validation.payload_invalid",
    "Invalid tracking state":"validation.payload_invalid",
    "An edit needs a value":"validation.payload_invalid",
    "Missing name":"validation.payload_invalid",
    "Give this entry a name":"validation.payload_invalid",
    "Choose F or C.":"validation.payload_invalid",
    "Confirm a merge first.":"validation.payload_invalid",
    "Automatic connection tracking was removed.":"validation.payload_invalid",
    "Turn on the tracker for this chat first.":"guard.tracking_disabled",
    "Tracking is off.":"guard.tracking_disabled",
  };
  const category=(Object.hasOwn(exact,message)?exact[message]:undefined) ??
    (/^The tracker changed\./.test(message)?"conflict.revision_mismatch":
    /^The story changed\./.test(message)?"conflict.accepted_state_drift":
    /^The chat changed\./.test(message)?"conflict.chat_revision_mismatch":
    /^(Reopen this contact\.|Reopen the contact before changing its portrait\.|That name is a merged alias\.)/.test(message)?"guard.stale_entity_ref":
    /^(This section is full\.|Contacts is full|Locations is full|This app is full\.|Portrait storage is full\.)/.test(message)?"guard.capacity_limit":
    /^(A contact with that name|A place with that name|A note with that name|An account with that name)/.test(message)?"guard.duplicate_entity":
    (original instanceof Error && original.name==="AbortError")||/\babort(ed)?\b/i.test(message)?"host.aborted":
    /timed? out|timeout|deadline/i.test(message)?"host.timeout":
    /permission|forbidden|unauthori[sz]ed|access denied/i.test(message)?"auth.permission_denied":
    /ECONNRESET|ECONNREFUSED|socket.*closed|network error/i.test(message)?"host.network_error":
    /SQLITE_BUSY|database is locked/i.test(message)?"host.sqlite_busy":
    original instanceof SyntaxError?"runtime.json_syntax_error":
    original instanceof RangeError?"runtime.range_error":
    original instanceof TypeError?"runtime.type_error":"runtime.unclassified");
  return {category,...(operation?{operation}:{})};
}
export function logFailure(warn:(text:string)=>void, context:{operation:string;event?:string;outcome:string}, error:unknown):void {
  // Call sites supply static operation/event/outcome labels, never request payloads.
  try { warn(`Lumi Phone Tracker: operation failed ${JSON.stringify({...context,...failureDetails(error)})}`); } catch { /* Diagnostics must not cause another rejection. */ }
}
