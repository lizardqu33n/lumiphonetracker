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
